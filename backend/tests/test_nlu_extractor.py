"""
Tests for the NLU extractor service.
All tests run with MOCK_AI=true — no IBM credentials required.
"""

import os

import pytest

os.environ["MOCK_AI"] = "true"

from app.services.nlu_extractor import NLUResult, extract  # noqa: E402


def test_extract_returns_nlu_result():
    result = extract("Some chapter text about Elena Voss.")
    assert isinstance(result, NLUResult)


def test_stub_has_entities():
    result = extract("Any text")
    assert len(result.entities) > 0


def test_stub_has_person_entity():
    result = extract("Any text")
    types = [e["type"] for e in result.entities]
    assert "Person" in types


def test_stub_has_sentiment():
    result = extract("Any text")
    assert "document" in result.sentiment


def test_stub_has_keywords():
    result = extract("Any text")
    assert len(result.keywords) > 0


def test_stub_has_relations():
    result = extract("Any text")
    assert len(result.relations) > 0
