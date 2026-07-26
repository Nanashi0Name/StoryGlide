"""
Tests for the rewritten extraction pipeline.
All tests run with MOCK_AI=true.
"""

import os
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ["MOCK_AI"] = "true"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from app.database import Base
from app.models.manuscript import Manuscript, Chapter
from app.services import extraction_pipeline

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
_engine = create_async_engine(TEST_DB_URL, echo=False)
_TestSession = async_sessionmaker(_engine, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def create_tables():
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_extraction_pipeline_success(monkeypatch):
    # Override AsyncSessionLocal inside extraction_pipeline so it uses our in-memory DB
    monkeypatch.setattr("app.services.extraction_pipeline.AsyncSessionLocal", _TestSession)

    # Insert a new manuscript
    async with _TestSession() as session:
        m = Manuscript(filename="test_novel.txt", status="processing")
        session.add(m)
        await session.commit()
        await session.refresh(m)
        manuscript_id = m.id

    text = "Chapter 1: The Start\nElena Voss was here.\n\nChapter 2: The End\nElena Voss died."
    await extraction_pipeline.run(manuscript_id, text.encode("utf-8"), "test_novel.txt")

    # Verify the results in DB
    async with _TestSession() as session:
        from sqlalchemy import select
        result = await session.execute(
            select(Manuscript).where(Manuscript.id == manuscript_id)
        )
        updated_m = result.scalar_one()
        assert updated_m.status == "done"
        
        # Verify characters
        chars = updated_m.get_characters()
        assert len(chars) > 0
        assert chars[0]["name"] == "Elena Voss"
        
        # Verify chapters are saved
        ch_result = await session.execute(
            select(Chapter).where(Chapter.manuscript_id == manuscript_id)
        )
        chapters = list(ch_result.scalars().all())
        assert len(chapters) == 2
        assert chapters[0].chapter_id == "chapter_01"
        assert chapters[1].chapter_id == "chapter_02"
        
        # Verify world state is cached on chapter
        ws = chapters[0].get_world_state()
        assert "tension_score" in ws
        assert "faction_control" in ws


@pytest.mark.asyncio
async def test_extraction_pipeline_caching(monkeypatch):
    monkeypatch.setattr("app.services.extraction_pipeline.AsyncSessionLocal", _TestSession)

    # 1. Process first manuscript
    async with _TestSession() as session:
        m1 = Manuscript(filename="caching_test.txt", status="processing")
        session.add(m1)
        await session.commit()
        await session.refresh(m1)
        m1_id = m1.id

    text = "Chapter 1: The Start\nElena Voss was here.\n\nChapter 2: The End\nElena Voss died."
    await extraction_pipeline.run(m1_id, text.encode("utf-8"), "caching_test.txt")

    # 2. Process second identical manuscript
    async with _TestSession() as session:
        m2 = Manuscript(filename="caching_test.txt", status="processing")
        session.add(m2)
        await session.commit()
        await session.refresh(m2)
        m2_id = m2.id

    # Running it again should use the caching check and immediately return
    await extraction_pipeline.run(m2_id, text.encode("utf-8"), "caching_test.txt")

    # Verify both got marked "done" and have identical data
    async with _TestSession() as session:
        from sqlalchemy import select
        m1_db = (await session.execute(select(Manuscript).where(Manuscript.id == m1_id))).scalar_one()
        m2_db = (await session.execute(select(Manuscript).where(Manuscript.id == m2_id))).scalar_one()

        assert m1_db.status == "done"
        assert m2_db.status == "done"
        assert m1_db.characters_json == m2_db.characters_json
        assert m1_db.arc_json == m2_db.arc_json
