"""
Tests for arc_scorer.py (runs with MOCK_AI=true — no live API calls).
"""
import os

import pytest

os.environ.setdefault("MOCK_AI", "true")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

from app.services.arc_scorer import score_arc


def _make_chapters(n: int) -> list[dict]:
    return [
        {
            "chapter_id": f"chapter_{i + 1:02d}",
            "text": f"Text for chapter {i + 1}.",
            "word_count": 500 + i * 50,
            "world_state": {},
        }
        for i in range(n)
    ]


def test_score_arc_empty():
    assert score_arc([]) == []


def test_score_arc_returns_one_entry_per_chapter():
    chapters = _make_chapters(5)
    arc = score_arc(chapters)
    assert len(arc) == 5


def test_score_arc_data_shape():
    chapters = _make_chapters(3)
    arc = score_arc(chapters)
    for point in arc:
        assert "chapter_id" in point
        assert "tension_score" in point
        assert "sentiment" in point
        assert "dominant_emotion" in point
        assert "word_count" in point


def test_score_arc_tension_in_range():
    chapters = _make_chapters(10)
    arc = score_arc(chapters)
    for point in arc:
        assert 0.0 <= point["tension_score"] <= 1.0


def test_score_arc_sentiment_values():
    valid = {"positive", "negative", "neutral"}
    chapters = _make_chapters(4)
    arc = score_arc(chapters)
    for point in arc:
        assert point["sentiment"] in valid


def test_score_arc_chapter_ids_match():
    chapters = _make_chapters(4)
    arc = score_arc(chapters)
    for ch, point in zip(chapters, arc):
        assert point["chapter_id"] == ch["chapter_id"]


def test_score_arc_word_count_preserved():
    chapters = _make_chapters(3)
    arc = score_arc(chapters)
    for ch, point in zip(chapters, arc):
        assert point["word_count"] == ch["word_count"]
