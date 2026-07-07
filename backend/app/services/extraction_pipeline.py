"""
Extraction pipeline.

Orchestrates: chapter chunking → Watson NLU → Granite extraction → merge
characters across chapters → persist to SQLite.

Called as a FastAPI BackgroundTask so the HTTP response returns immediately.
"""

from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.character import CharacterObject
from app.models.manuscript import Chapter, Manuscript
from app.services import chunker as chunker_svc
from app.services import granite_extractor, nlu_extractor

logger = logging.getLogger(__name__)


async def run(manuscript_id: str, file_bytes: bytes, filename: str) -> None:
    """
    Full pipeline for a single manuscript upload.
    Runs entirely inside its own DB session so it is safe to call from
    BackgroundTasks after the upload response has been sent.
    """
    async with AsyncSessionLocal() as db:
        manuscript = await _get_manuscript(db, manuscript_id)
        if manuscript is None:
            logger.error("Pipeline: manuscript %s not found", manuscript_id)
            return

        try:
            # Stage 1: parse + chunk
            manuscript.status = "chunked"
            await db.commit()

            text = chunker_svc.parse_text(file_bytes, filename)
            chunks = chunker_svc.split_into_chapters(text)

            for chunk in chunks:
                db.add(
                    Chapter(
                        manuscript_id=manuscript_id,
                        chapter_id=chunk.chapter_id,
                        title=chunk.title,
                        word_count=chunk.word_count,
                        text=chunk.text,
                    )
                )
            await db.commit()

            # Stage 2: extraction
            manuscript.status = "extracting"
            await db.commit()

            all_characters: dict[str, CharacterObject] = {}

            for chunk in chunks:
                nlu_result = nlu_extractor.extract(chunk.text)
                chapter_chars = granite_extractor.extract_characters(
                    chapter_id=chunk.chapter_id,
                    chapter_text=chunk.text,
                    nlu_result=nlu_result,
                )
                for char in chapter_chars:
                    if char.id in all_characters:
                        # Merge: add chapter status entry for returning character
                        existing = all_characters[char.id]
                        existing.status_by_chapter.update(char.status_by_chapter)
                    else:
                        all_characters[char.id] = char

            # Persist merged character list as JSON blob
            manuscript.set_characters(
                [c.model_dump_api() for c in all_characters.values()]
            )
            manuscript.status = "done"
            await db.commit()
            logger.info("Pipeline: manuscript %s completed (%d characters)", manuscript_id, len(all_characters))

        except Exception as exc:  # noqa: BLE001
            logger.exception("Pipeline: manuscript %s failed", manuscript_id)
            manuscript.status = "error"
            manuscript.error_message = str(exc)
            await db.commit()


async def _get_manuscript(db: AsyncSession, manuscript_id: str) -> Manuscript | None:
    from sqlalchemy import select

    result = await db.execute(
        select(Manuscript).where(Manuscript.id == manuscript_id)
    )
    return result.scalar_one_or_none()
