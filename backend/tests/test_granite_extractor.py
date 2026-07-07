"""
Tests for the Granite extractor service.
All tests run with MOCK_AI=true — no IBM credentials required.
"""

import os

import pytest

os.environ["MOCK_AI"] = "true"

from app.models.character import CharacterObject  # noqa: E402
from app.services.granite_extractor import extract_characters  # noqa: E402
from app.services.nlu_extractor import NLUResult  # noqa: E402


_STUB_NLU = NLUResult(
    entities=[{"type": "Person", "text": "Elena Voss", "relevance": 0.9}],
    relations=[],
    sentiment={"document": {"label": "negative", "score": -0.3}},
    keywords=[],
)


def test_extract_characters_returns_list():
    result = extract_characters("chapter_01", "Chapter text here.", _STUB_NLU)
    assert isinstance(result, list)


def test_extract_characters_returns_character_objects():
    result = extract_characters("chapter_01", "Chapter text here.", _STUB_NLU)
    assert all(isinstance(c, CharacterObject) for c in result)


def test_stub_characters_have_ids():
    result = extract_characters("chapter_01", "Chapter text here.", _STUB_NLU)
    for char in result:
        assert char.id != ""


def test_stub_characters_first_appearance_matches_chapter():
    result = extract_characters("chapter_05", "Some text.", _STUB_NLU)
    for char in result:
        assert char.first_appearance == "chapter_05"


def test_stub_characters_have_status():
    result = extract_characters("chapter_01", "Some text.", _STUB_NLU)
    for char in result:
        assert "chapter_01" in char.status_by_chapter


def test_stub_extracted_by_is_stub():
    result = extract_characters("chapter_01", "Some text.", _STUB_NLU)
    for char in result:
        assert char.extracted_by == "stub"
