"""
IBM watsonx.ai Granite extraction service.

Takes NLU results and raw chapter text, calls Granite-3-8b-Instruct with a
structured-output prompt, and returns a list of CharacterObject instances.

When settings.mock_ai is True, returns a deterministic stub.
"""

from __future__ import annotations

import json
import re
import uuid

from app.config import settings
from app.models.character import CharacterObject, CharacterRelationship
from app.services.nlu_extractor import NLUResult

GRANITE_MODEL_ID = "ibm/granite-3-8b-instruct"

_EXTRACT_PROMPT = """\
You are a story analysis assistant.

Given the chapter text and the entities already identified by NLU, output a JSON array of character objects.
Each object must follow this exact schema:
{{
  "id": "<unique slug, e.g. char_001>",
  "name": "<full name>",
  "aliases": ["<nickname>"],
  "first_appearance": "<chapter_id>",
  "status_by_chapter": {{"<chapter_id>": "<alive|deceased|unknown>"}},
  "relationships": [{{"target_id": "<other char id>", "type": "<sibling|ally|enemy|…>", "sentiment": "<friendly|hostile|neutral>"}}],
  "extracted_by": "watsonx.granite-3-8b-instruct"
}}

Chapter ID: {chapter_id}
NLU entities (JSON): {nlu_entities}
Chapter text (first 3000 chars):
{chapter_text}

Output ONLY the JSON array, no prose.
"""

# ---------------------------------------------------------------------------
# Stub
# ---------------------------------------------------------------------------

_STUB_CHARACTERS = [
    CharacterObject(
        id="char_001",
        name="Elena Voss",
        aliases=["Ellie"],
        first_appearance="chapter_01",
        status_by_chapter={"chapter_01": "alive"},
        relationships=[
            CharacterRelationship(target_id="char_002", type="sibling", sentiment="hostile")
        ],
        extracted_by="stub",
    ),
    CharacterObject(
        id="char_002",
        name="Marcus Rey",
        aliases=[],
        first_appearance="chapter_01",
        status_by_chapter={"chapter_01": "alive"},
        relationships=[
            CharacterRelationship(target_id="char_001", type="sibling", sentiment="hostile")
        ],
        extracted_by="stub",
    ),
]


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def extract_characters(
    chapter_id: str,
    chapter_text: str,
    nlu_result: NLUResult,
) -> list[CharacterObject]:
    """Return CharacterObject list for a chapter. Uses stub when MOCK_AI=true."""
    if settings.mock_ai:
        # Tag stub characters with the correct chapter
        tagged = []
        for i, char in enumerate(_STUB_CHARACTERS):
            c = char.model_copy(deep=True)
            c.first_appearance = chapter_id
            c.status_by_chapter = {chapter_id: "alive"}
            tagged.append(c)
        return tagged

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
        params={"max_new_tokens": 1024, "temperature": 0},
    )

    prompt = _EXTRACT_PROMPT.format(
        chapter_id=chapter_id,
        nlu_entities=json.dumps(nlu_result.entities[:20]),
        chapter_text=chapter_text[:3000],
    )

    raw_response = model.generate_text(prompt=prompt)
    return _parse_granite_response(raw_response, chapter_id)


def _parse_granite_response(raw: str, chapter_id: str) -> list[CharacterObject]:
    """Extract a JSON array from Granite's free-text response."""
    # Strip any markdown code fences Granite might add
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    # Find the first '[' ... ']' block
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        return []
    try:
        data = json.loads(match.group(0))
        return [CharacterObject(**item) for item in data if isinstance(item, dict)]
    except (json.JSONDecodeError, ValueError):
        return []
