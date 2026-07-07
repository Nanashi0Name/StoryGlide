"""
Tests for whatif_generator.py (runs with MOCK_AI=true — no live API / Chroma calls).
"""
import os

import pytest

os.environ.setdefault("MOCK_AI", "true")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

from app.services.whatif_generator import (
    WhatIfRequest,
    WhatIfResponse,
    embed_manuscript,
    run_whatif,
)


def _make_chapters(n: int = 5) -> list[dict]:
    return [
        {
            "chapter_id": f"chapter_{i + 1:02d}",
            "text": f"Text for chapter {i + 1}.",
            "word_count": 600,
            "world_state": {"chapter_id": f"chapter_{i + 1:02d}", "characters_present": []},
        }
        for i in range(n)
    ]


_CHARACTERS = [
    {
        "id": "char_001",
        "name": "Elena Voss",
        "aliases": ["Ellie"],
        "first_appearance": "chapter_01",
        "status_by_chapter": {"chapter_01": "alive"},
        "relationships": [],
        "extracted_by": "stub",
    }
]


# ---- embed_manuscript -------------------------------------------------------

def test_embed_manuscript_noop_in_mock_mode():
    """embed_manuscript should succeed silently (no-op) when MOCK_AI=true."""
    embed_manuscript("test-manuscript-id", _make_chapters())


# ---- character_death --------------------------------------------------------

def test_run_whatif_character_death_shape():
    req = WhatIfRequest(scope="character_death", target_id="char_001", at_chapter="chapter_02")
    resp = run_whatif("test-id", req, _make_chapters(), _CHARACTERS)
    assert isinstance(resp, WhatIfResponse)
    assert isinstance(resp.summary, str)
    assert len(resp.summary) > 10
    assert isinstance(resp.downstream_impacts, list)
    assert len(resp.downstream_impacts) >= 1


def test_run_whatif_character_death_impact_shape():
    req = WhatIfRequest(scope="character_death", target_id="char_001", at_chapter="chapter_02")
    resp = run_whatif("test-id", req, _make_chapters(), _CHARACTERS)
    for impact in resp.downstream_impacts:
        assert hasattr(impact, "chapter_id")
        assert hasattr(impact, "impact")
        assert isinstance(impact.chapter_id, str)
        assert isinstance(impact.impact, str)


# ---- relationship_change ----------------------------------------------------

def test_run_whatif_relationship_change():
    req = WhatIfRequest(scope="relationship_change", target_id="char_001", at_chapter="chapter_03")
    resp = run_whatif("test-id", req, _make_chapters(), _CHARACTERS)
    assert isinstance(resp, WhatIfResponse)
    assert resp.summary
    assert isinstance(resp.downstream_impacts, list)


# ---- event_removal ----------------------------------------------------------

def test_run_whatif_event_removal():
    req = WhatIfRequest(scope="event_removal", target_id="kingdom_attacked", at_chapter="chapter_02")
    resp = run_whatif("test-id", req, _make_chapters(), _CHARACTERS)
    assert isinstance(resp, WhatIfResponse)
    assert resp.summary
    assert len(resp.downstream_impacts) >= 1


# ---- all three scopes return non-empty summary ------------------------------

@pytest.mark.parametrize("scope", ["character_death", "relationship_change", "event_removal"])
def test_all_scopes_return_summary(scope):
    req = WhatIfRequest(scope=scope, target_id="char_001", at_chapter="chapter_01")
    resp = run_whatif("test-id", req, _make_chapters(), _CHARACTERS)
    assert resp.summary.strip() != ""
