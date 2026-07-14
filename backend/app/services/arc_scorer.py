"""
Emotional arc scorer.

For each chapter, calls IBM watsonx.ai Granite to compute a tension score
(0–1 float), a sentiment label, and a dominant-emotion label.

When settings.mock_ai is True, returns a deterministic arc without any
external API calls.
"""

from __future__ import annotations

import json
import re
from typing import Literal

from pydantic import BaseModel

from app.config import settings

GRANITE_MODEL_ID = settings.watsonx_model_id or "ibm/granite-4-h-small"

_ARC_PROMPT = """\
You are a literary analysis assistant. Read the chapter excerpt below and output a \
JSON object with exactly these fields:
{{
  "tension_score": <float 0.0–1.0, where 0 is calm and 1 is maximum tension>,
  "sentiment": "<positive|negative|neutral>",
  "dominant_emotion": "<fear|anger|joy|sadness|surprise|disgust|anticipation|trust>"
}}

Chapter ID: {chapter_id}
Chapter text (first 2000 chars):
{chapter_text}

Output ONLY the JSON object, no prose.
"""

# ---------------------------------------------------------------------------
# Data model (matches §6.5 in the MVP Guide, extended with word_count)
# ---------------------------------------------------------------------------

class ArcDataPoint(BaseModel):
    chapter_id: str
    tension_score: float
    sentiment: Literal["positive", "negative", "neutral"]
    dominant_emotion: str
    word_count: int = 0  # surfaced for the pacing heatmap in the dashboard


# ---------------------------------------------------------------------------
# Mock arc – deterministic, one entry per chapter
# ---------------------------------------------------------------------------

_MOCK_ARCS = [
    (0.2, "neutral", "anticipation"),
    (0.45, "negative", "fear"),
    (0.78, "negative", "anger"),
    (0.90, "negative", "fear"),
    (0.60, "negative", "sadness"),
    (0.35, "neutral", "trust"),
    (0.55, "negative", "anticipation"),
    (0.85, "negative", "fear"),
    (0.40, "positive", "joy"),
    (0.70, "negative", "anger"),
]


def score_arc(chapters: list) -> list[dict]:
    """
    Compute emotional arc data points for an ordered list of Chapter DB rows.

    ``chapters`` is a list of dicts with at least ``chapter_id``, ``text``,
    and ``word_count`` keys (as produced by the extraction pipeline).

    Returns a list of dicts (not Pydantic objects) so they can be directly
    JSON-serialised and stored in ``Manuscript.arc_json``.
    """
    if not chapters:
        return []

    results: list[dict] = []

    for idx, ch in enumerate(chapters):
        chapter_id = ch.get("chapter_id", f"chapter_{idx + 1:02d}")
        word_count = ch.get("word_count", 0)

        # Check if emotional arc details are already cached in world_state
        world_state = ch.get("world_state", {})
        if isinstance(world_state, dict) and "tension_score" in world_state:
            results.append(
                ArcDataPoint(
                    chapter_id=chapter_id,
                    tension_score=world_state["tension_score"],
                    sentiment=world_state.get("sentiment", "neutral"),
                    dominant_emotion=world_state.get("dominant_emotion", "anticipation"),
                    word_count=word_count,
                ).model_dump()
            )
            continue

        if settings.mock_ai:
            tension, sentiment, emotion = _MOCK_ARCS[idx % len(_MOCK_ARCS)]
            results.append(
                ArcDataPoint(
                    chapter_id=chapter_id,
                    tension_score=tension,
                    sentiment=sentiment,
                    dominant_emotion=emotion,
                    word_count=word_count,
                ).model_dump()
            )
            continue

        # ---- live Granite call ----
        try:
            from ibm_watsonx_ai import Credentials
            from ibm_watsonx_ai.foundation_models import ModelInference

            credentials = Credentials(
                url=settings.watsonx_url,
                api_key=settings.watsonx_api_key,
            )
            model = ModelInference(
                model_id=GRANITE_MODEL_ID,
                credentials=credentials,
                project_id=settings.watsonx_project_id,
                params={"max_new_tokens": 128, "temperature": 0},
            )

            prompt = _ARC_PROMPT.format(
                chapter_id=chapter_id,
                chapter_text=ch.get("text", "")[:2000],
            )

            raw = model.generate_text(prompt=prompt)
            parsed = _parse_arc_response(raw)

            results.append(
                ArcDataPoint(
                    chapter_id=chapter_id,
                    tension_score=max(0.0, min(1.0, float(parsed.get("tension_score", 0.5)))),
                    sentiment=parsed.get("sentiment", "neutral"),
                    dominant_emotion=parsed.get("dominant_emotion", "anticipation"),
                    word_count=word_count,
                ).model_dump()
            )
        except Exception:  # noqa: BLE001 – degrade gracefully; don't kill the pipeline
            results.append(
                ArcDataPoint(
                    chapter_id=chapter_id,
                    tension_score=0.5,
                    sentiment="neutral",
                    dominant_emotion="anticipation",
                    word_count=word_count,
                ).model_dump()
            )

    return results


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_arc_response(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except (json.JSONDecodeError, ValueError):
        return {}
