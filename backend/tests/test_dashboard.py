"""
Integration test for GET /api/manuscripts/{id}/dashboard.
Uses an in-memory SQLite database — no live IBM API calls.
"""
import os

import pytest
import pytest_asyncio

os.environ.setdefault("MOCK_AI", "true")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Import both models before anything instantiates them so the ORM mapper
# can resolve the Manuscript.chapters relationship.
import app.models.manuscript  # noqa: F401
from app.database import Base, get_db
from app.main import app
from app.models.manuscript import Manuscript


# ---------------------------------------------------------------------------
# In-memory DB fixtures
# ---------------------------------------------------------------------------

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

_engine = create_async_engine(TEST_DB_URL, echo=False)
_TestSession = async_sessionmaker(_engine, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True, scope="module")
async def create_tables():
    import app.models.manuscript  # noqa: F401 — register metadata

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _override_db():
    async with _TestSession() as session:
        yield session


app.dependency_overrides[get_db] = _override_db


# ---------------------------------------------------------------------------
# Helper — insert a "done" manuscript directly into the test DB
# ---------------------------------------------------------------------------

async def _insert_done_manuscript() -> str:
    async with _TestSession() as session:
        m = Manuscript(filename="test.txt", status="done")
        m.set_characters([{"id": "char_001", "name": "Alice", "aliases": [], "first_appearance": "chapter_01",
                            "status_by_chapter": {"chapter_01": "alive"}, "relationships": [], "extracted_by": "mock"}])
        m.set_contradictions([{"id": "flag_001", "type": "state_conflict", "entity": "loc_a",
                                "conflicting_chapters": ["chapter_01", "chapter_03"],
                                "description": "Destroyed then active", "confidence": 0.9}])
        m.set_threads([{"id": "thread_001", "type": "chekhov_gun", "introduced_chapter": "chapter_02",
                        "description": "Locked chest", "resolved": False}])
        m.set_arc([{"chapter_id": "chapter_01", "tension_score": 0.5,
                    "sentiment": "neutral", "dominant_emotion": "anticipation", "word_count": 800}])
        session.add(m)
        await session.commit()
        await session.refresh(m)
        return m.id


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dashboard_returns_all_four_keys():
    mid = await _insert_done_manuscript()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(f"/api/manuscripts/{mid}/dashboard")
    assert resp.status_code == 200
    body = resp.json()
    assert body["manuscript_id"] == mid
    assert "characters" in body
    assert "contradictions" in body
    assert "threads" in body
    assert "arc" in body


@pytest.mark.asyncio
async def test_dashboard_data_correct():
    mid = await _insert_done_manuscript()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(f"/api/manuscripts/{mid}/dashboard")
    body = resp.json()
    assert len(body["characters"]) == 1
    assert body["characters"][0]["name"] == "Alice"
    assert len(body["contradictions"]) == 1
    assert len(body["threads"]) == 1
    assert body["threads"][0]["resolved"] is False
    assert len(body["arc"]) == 1
    assert body["arc"][0]["tension_score"] == 0.5


@pytest.mark.asyncio
async def test_dashboard_404_unknown_manuscript():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/manuscripts/does-not-exist/dashboard")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_dashboard_202_while_processing():
    async with _TestSession() as session:
        m = Manuscript(filename="processing.txt", status="processing")
        session.add(m)
        await session.commit()
        await session.refresh(m)
        mid = m.id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(f"/api/manuscripts/{mid}/dashboard")
    assert resp.status_code == 202
