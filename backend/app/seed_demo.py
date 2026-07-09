"""
Demo seed — loads The Time Machine (H.G. Wells) on first startup.

The text file is expected at:  <project_root>/data/the_time_machine.txt

If the file is absent the seed silently skips (safe for CI and fresh clones).
If a manuscript with filename="demo_the_time_machine.txt" already exists in the
DB the seed also skips (idempotent).

After the seed runs successfully the manuscript_id is written to
backend/demo_manuscript_id.txt so you can copy it into
frontend/.env.local as NEXT_PUBLIC_DEMO_MANUSCRIPT_ID.
"""
from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

_DEMO_FILENAME = "demo_the_time_machine.txt"
_DEMO_MANUSCRIPT_ID = "d54c0525-28c2-417e-9660-1ad9aa29bc54"
# Resolve path relative to this file: backend/app/seed_demo.py → backend/ → project_root/data/
_DATA_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "the_time_machine.txt"
_ID_FILE = Path(__file__).resolve().parent.parent / "demo_manuscript_id.txt"


async def seed() -> None:
    """
    Idempotent seed: insert the demo manuscript and run the extraction
    pipeline if it hasn't been done yet.
    """
    if not _DATA_FILE.exists():
        logger.info("Demo seed: %s not found — skipping.", _DATA_FILE)
        return

    from sqlalchemy import select

    from app.database import AsyncSessionLocal
    from app.models.manuscript import Manuscript
    from app.services import extraction_pipeline

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Manuscript).where(Manuscript.filename == _DEMO_FILENAME)
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            logger.info(
                "Demo seed: manuscript '%s' already exists (id=%s) — skipping.",
                _DEMO_FILENAME,
                existing.id,
            )
            _write_id_file(existing.id)
            return

        file_bytes = _DATA_FILE.read_bytes()
        manuscript = Manuscript(id=_DEMO_MANUSCRIPT_ID, filename=_DEMO_FILENAME, status="processing")
        db.add(manuscript)
        await db.commit()
        await db.refresh(manuscript)
        manuscript_id = manuscript.id
        logger.info("Demo seed: created manuscript id=%s, starting pipeline.", manuscript_id)

    # Run pipeline outside the session (it opens its own session internally)
    await extraction_pipeline.run(
        manuscript_id=manuscript_id,
        file_bytes=file_bytes,
        filename=_DEMO_FILENAME,
    )
    _write_id_file(manuscript_id)
    logger.info("Demo seed: pipeline complete for id=%s.", manuscript_id)


def _write_id_file(manuscript_id: str) -> None:
    """Write the demo manuscript ID to a file so the developer can pick it up."""
    try:
        _ID_FILE.write_text(manuscript_id)
    except OSError:
        pass  # non-critical
