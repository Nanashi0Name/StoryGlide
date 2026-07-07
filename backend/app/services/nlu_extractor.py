"""
Watson Natural Language Understanding extraction service.

When settings.mock_ai is True, returns a deterministic stub so the pipeline
can be tested without IBM Cloud credentials.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.config import settings


@dataclass
class NLUResult:
    entities: list[dict[str, Any]] = field(default_factory=list)
    relations: list[dict[str, Any]] = field(default_factory=list)
    sentiment: dict[str, Any] = field(default_factory=dict)
    keywords: list[dict[str, Any]] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Stub
# ---------------------------------------------------------------------------

_STUB_RESULT = NLUResult(
    entities=[
        {"type": "Person", "text": "Elena Voss", "relevance": 0.95},
        {"type": "Person", "text": "Marcus Rey", "relevance": 0.82},
        {"type": "Location", "text": "Kingdom of Varen", "relevance": 0.75},
    ],
    relations=[
        {"type": "sibling", "sentence": "Elena and Marcus were siblings.", "arguments": [
            {"entities": [{"text": "Elena Voss"}]},
            {"entities": [{"text": "Marcus Rey"}]},
        ]},
    ],
    sentiment={"document": {"label": "negative", "score": -0.41}},
    keywords=[
        {"text": "ancient sword", "relevance": 0.88},
        {"text": "locked chest", "relevance": 0.70},
    ],
)


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def extract(text: str) -> NLUResult:
    """Run NLU extraction on *text*. Returns stub when MOCK_AI=true."""
    if settings.mock_ai:
        return _STUB_RESULT

    from ibm_watson import NaturalLanguageUnderstandingV1
    from ibm_watson.natural_language_understanding_v1 import (
        EntitiesOptions,
        Features,
        KeywordsOptions,
        RelationsOptions,
        SentimentOptions,
    )
    from ibm_cloud_sdk_core.authenticators import IAMAuthenticator

    authenticator = IAMAuthenticator(settings.watson_nlu_api_key)
    nlu = NaturalLanguageUnderstandingV1(version="2022-04-07", authenticator=authenticator)
    nlu.set_service_url(settings.watson_nlu_url)

    response = nlu.analyze(
        text=text[:50_000],  # NLU has a character limit
        features=Features(
            entities=EntitiesOptions(sentiment=True, limit=50),
            relations=RelationsOptions(),
            sentiment=SentimentOptions(),
            keywords=KeywordsOptions(sentiment=True, limit=30),
        ),
    ).get_result()

    return NLUResult(
        entities=response.get("entities", []),
        relations=response.get("relations", []),
        sentiment=response.get("sentiment", {}),
        keywords=response.get("keywords", []),
    )
