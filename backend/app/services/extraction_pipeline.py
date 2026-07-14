"""
Extraction pipeline.

Orchestrates: chapter chunking → Watson NLU → Granite extraction → merge
characters across chapters → persist to SQLite.

Called as a FastAPI BackgroundTask so the HTTP response returns immediately.
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.character import CharacterObject
from app.models.manuscript import Chapter, Manuscript
from app.services import arc_scorer, chunker as chunker_svc
from app.services import granite_extractor, nlu_extractor, whatif_generator

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
            from sqlalchemy import select
            
            # Check if chapters already exist for this manuscript (resumable)
            result = await db.execute(
                select(Chapter).where(Chapter.manuscript_id == manuscript_id)
            )
            db_chapters = list(result.scalars().all())

            if not db_chapters:
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
                
                # Fetch them again
                result = await db.execute(
                    select(Chapter).where(Chapter.manuscript_id == manuscript_id)
                )
                db_chapters = list(result.scalars().all())

            # Stage 2: extraction
            manuscript.status = "extracting"
            await db.commit()

            from app.services import contradiction_engine, thread_tracker

            db_chapters = sorted(db_chapters, key=lambda c: c.id)

            all_characters: dict[str, CharacterObject] = {}
            all_extracted_threads: list[dict] = []
            chapters_data: list[dict] = []

            for ch in db_chapters:
                # Check if this chapter was already processed
                world_state = ch.get_world_state()
                chapter_chars_raw = ch.get_characters()
                threads = ch.get_threads()
                
                if world_state and chapter_chars_raw:
                    logger.info("Pipeline: Chapter %s already processed — loading from cache.", ch.chapter_id)
                    chapter_chars = [CharacterObject(**c) for c in chapter_chars_raw]
                else:
                    logger.info("Pipeline: Processing Chapter %s with watsonx.ai...", ch.chapter_id)
                    nlu_result = await asyncio.to_thread(nlu_extractor.extract, ch.text)
                    
                    extracted_data = await asyncio.to_thread(
                        granite_extractor.extract_all,
                        chapter_id=ch.chapter_id,
                        chapter_text=ch.text,
                        nlu_result=nlu_result,
                    )
                    chapter_chars = extracted_data["characters"]
                    world_state = extracted_data["world_state"]
                    threads = extracted_data["threads"]
                    
                    # Compute emotional arc for this chapter and embed it in world_state for caching
                    single_chapter_data = [{
                        "chapter_id": ch.chapter_id,
                        "text": ch.text,
                        "word_count": ch.word_count,
                        "world_state": world_state
                    }]
                    single_arc = await asyncio.to_thread(arc_scorer.score_arc, single_chapter_data)
                    if single_arc:
                        world_state["tension_score"] = single_arc[0]["tension_score"]
                        world_state["sentiment"] = single_arc[0]["sentiment"]
                        world_state["dominant_emotion"] = single_arc[0]["dominant_emotion"]
                    
                    # Cache them on the chapter DB row
                    ch.set_world_state(world_state)
                    ch.set_characters([c.model_dump_api() for c in chapter_chars])
                    ch.set_threads(threads)
                    await db.commit()
                
                # Merge characters
                for char in chapter_chars:
                    if char.id in all_characters:
                        existing = all_characters[char.id]
                        existing.status_by_chapter.update(char.status_by_chapter)
                    else:
                        all_characters[char.id] = char

                all_extracted_threads.extend(threads)

                chapters_data.append({
                    "id": ch.id,
                    "chapter_id": ch.chapter_id,
                    "title": ch.title,
                    "text": ch.text,
                    "world_state": world_state
                })

            # Run contradiction and unresolved thread trackers
            char_list = [c.model_dump_api() for c in all_characters.values()]
            
            contradictions = contradiction_engine.detect_contradictions(
                characters=char_list,
                chapters=chapters_data,
            )
            
            threads_status = thread_tracker.track_threads(
                all_extracted_threads=all_extracted_threads,
                chapters=chapters_data,
            )

            # Score emotional arc
            arc_data = await asyncio.to_thread(arc_scorer.score_arc, chapters_data)

            # Build Chroma vector store for what-if retrieval
            await asyncio.to_thread(whatif_generator.embed_manuscript, manuscript_id, chapters_data)

            # Persist results
            manuscript.set_characters(char_list)
            manuscript.set_contradictions(contradictions)
            manuscript.set_threads(threads_status)
            manuscript.set_arc(arc_data)
            manuscript.status = "done"
            await db.commit()
            logger.info(
                "Pipeline: manuscript %s completed (%d characters, %d contradictions, %d threads, %d arc points)",
                manuscript_id, len(all_characters), len(contradictions), len(threads_status), len(arc_data),
            )

        except Exception as exc:  # noqa: BLE001
            logger.exception("Pipeline: manuscript %s failed", manuscript_id)
            manuscript.status = "error"
            manuscript.error_message = str(exc)[:500]
            await db.commit()


async def _get_manuscript(db: AsyncSession, manuscript_id: str) -> Manuscript | None:
    from sqlalchemy import select

    result = await db.execute(
        select(Manuscript).where(Manuscript.id == manuscript_id)
    )
    return result.scalar_one_or_none()
