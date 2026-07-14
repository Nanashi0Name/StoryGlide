"""
IBM watsonx.ai Granite extraction service.

Takes NLU results and raw chapter text, calls Granite-3-8b-Instruct with a
structured-output prompt, and returns extracted characters, world-states, and threads.

When settings.mock_ai is True, returns deterministic stubs.
"""

from __future__ import annotations

import json
import re
import uuid

from app.config import settings
from app.models.character import CharacterObject, CharacterRelationship
from app.services.nlu_extractor import NLUResult

GRANITE_MODEL_ID = settings.watsonx_model_id or "ibm/granite-4-h-small"

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

_WORLD_STATE_PROMPT = """\
You are a story analysis assistant.

Given the chapter text and NLU findings, extract the world state of the chapter.
Output a JSON object following this exact schema:
{{
  "chapter_id": "{chapter_id}",
  "characters_present": ["<char_id_1>", "<char_id_2>"],
  "locations": ["<location_name>"],
  "faction_control": {{"<location_name>": "<status_or_controlling_faction>"}},
  "key_objects": ["<object_name>"],
  "events": ["<brief_event_description>"],
  "extracted_by": "watsonx.granite-3-8b-instruct"
}}

NLU entities: {nlu_entities}
Chapter text (first 3000 chars):
{chapter_text}

Output ONLY the JSON object, no prose.
"""

_THREADS_PROMPT = """\
You are a story analysis assistant.

Identify narrative elements planted in this chapter: introduced objects (Chekhov's guns), promises made, unanswered questions, or foreshadowing statements.
Output a JSON array of thread objects, each following this exact schema:
[
  {{
    "type": "chekhov_gun|promise|foreshadowing|question",
    "introduced_chapter": "{chapter_id}",
    "description": "<detailed description of the element>",
    "resolved": false
  }}
]

Chapter text (first 3000 chars):
{chapter_text}

Output ONLY the JSON array, no prose.
"""

_COMBINED_PROMPT = """\
You are a story analysis assistant.

Analyze the given chapter text and the entities already identified by NLU.
Extract characters, world-state, and narrative threads, and output a single JSON object.

The output JSON object must follow this exact schema:
{{
  "characters": [
    {{
      "id": "<unique slug, e.g. char_001>",
      "name": "<full name>",
      "aliases": ["<nickname>"],
      "first_appearance": "{chapter_id}",
      "status_by_chapter": {{"{chapter_id}": "<alive|deceased|unknown>"}},
      "relationships": [
        {{
          "target_id": "<other char id>",
          "type": "<sibling|ally|enemy|…>",
          "sentiment": "<friendly|hostile|neutral>"
        }}
      ],
      "extracted_by": "watsonx.granite-4-h-small"
    }}
  ],
  "world_state": {{
    "chapter_id": "{chapter_id}",
    "characters_present": ["<char_id_1>", "<char_id_2>"],
    "locations": ["<location_name>"],
    "faction_control": {{"<location_name>": "<status_or_controlling_faction>"}},
    "key_objects": ["<object_name>"],
    "events": ["<brief_event_description>"],
    "extracted_by": "watsonx.granite-4-h-small"
  }},
  "threads": [
    {{
      "type": "chekhov_gun|promise|foreshadowing|question",
      "introduced_chapter": "{chapter_id}",
      "description": "<detailed description of the element>",
      "resolved": false
    }}
  ]
}}

Chapter ID: {chapter_id}
NLU entities (JSON): {nlu_entities}
Chapter text (first 3000 chars):
{chapter_text}

Output ONLY the JSON object, no prose.
"""

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
        c1 = CharacterObject(
            id="char_001",
            name="Elena Voss",
            aliases=["Ellie"],
            first_appearance=chapter_id,
            status_by_chapter={chapter_id: "alive"},
            relationships=[
                CharacterRelationship(target_id="char_002", type="sibling", sentiment="hostile")
            ],
            extracted_by="stub",
        )
        c2 = CharacterObject(
            id="char_002",
            name="Marcus Rey",
            aliases=[],
            first_appearance=chapter_id,
            status_by_chapter={chapter_id: "alive"},
            relationships=[
                CharacterRelationship(target_id="char_001", type="sibling", sentiment="hostile")
            ],
            extracted_by="stub",
        )

        if "chapter_02" in chapter_id or "Scene 2" in chapter_id:
            c1.status_by_chapter[chapter_id] = "deceased"
            return [c1, c2]
        elif "chapter_03" in chapter_id or "Scene 3" in chapter_id:
            c1.status_by_chapter[chapter_id] = "alive"
            return [c1, c2]
        else:
            return [c1, c2]

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


def extract_world_state(
    chapter_id: str,
    chapter_text: str,
    nlu_result: NLUResult,
) -> dict:
    """Extract world-state for a chapter. Uses stub when MOCK_AI=true."""
    if settings.mock_ai:
        if "chapter_02" in chapter_id or "Scene 2" in chapter_id:
            return {
                "chapter_id": chapter_id,
                "characters_present": ["char_001"],
                "locations": ["kingdom_of_varen"],
                "faction_control": {
                    "kingdom_of_varen": "destroyed"
                },
                "key_objects": ["locked_chest"],
                "events": ["kingdom_attacked"],
                "extracted_by": "stub"
            }
        elif "chapter_03" in chapter_id or "Scene 3" in chapter_id:
            return {
                "chapter_id": chapter_id,
                "characters_present": ["char_001", "char_002"],
                "locations": ["kingdom_of_varen"],
                "faction_control": {
                    "kingdom_of_varen": "active"
                },
                "key_objects": ["ancient_sword"],
                "events": ["sword_used"],
                "extracted_by": "stub"
            }
        else:
            return {
                "chapter_id": chapter_id,
                "characters_present": ["char_001", "char_002"],
                "locations": ["kingdom_of_varen"],
                "faction_control": {
                    "kingdom_of_varen": "active"
                },
                "key_objects": ["ancient_sword", "locked_chest"],
                "events": ["sword_found"],
                "extracted_by": "stub"
            }

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

    prompt = _WORLD_STATE_PROMPT.format(
        chapter_id=chapter_id,
        nlu_entities=json.dumps(nlu_result.entities[:20]),
        chapter_text=chapter_text[:3000],
    )

    raw_response = model.generate_text(prompt=prompt)
    return _parse_json_object(raw_response)


def extract_threads(
    chapter_id: str,
    chapter_text: str,
) -> list[dict]:
    """Extract narrative threads planted in a chapter. Uses stub when MOCK_AI=true."""
    if settings.mock_ai:
        if "chapter_02" in chapter_id or "Scene 2" in chapter_id:
            return []
        elif "chapter_03" in chapter_id or "Scene 3" in chapter_id:
            return [
                {
                    "type": "promise",
                    "introduced_chapter": chapter_id,
                    "description": "Elena promises Marcus she will return before sunset",
                    "resolved": False
                }
            ]
        else:
            return [
                {
                    "type": "chekhov_gun",
                    "introduced_chapter": chapter_id,
                    "description": "Locked chest given to protagonist, never opened",
                    "resolved": False
                }
            ]

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

    prompt = _THREADS_PROMPT.format(
        chapter_id=chapter_id,
        chapter_text=chapter_text[:3000],
    )

    raw_response = model.generate_text(prompt=prompt)
    return _parse_json_array(raw_response)


def extract_all(
    chapter_id: str,
    chapter_text: str,
    nlu_result: NLUResult,
) -> dict:
    """
    Extract characters, world-state, and threads in a single call.
    Uses stub values when MOCK_AI=true.
    """
    if settings.mock_ai:
        c1 = CharacterObject(
            id="char_001",
            name="Elena Voss",
            aliases=["Ellie"],
            first_appearance=chapter_id,
            status_by_chapter={chapter_id: "alive"},
            relationships=[
                CharacterRelationship(target_id="char_002", type="sibling", sentiment="hostile")
            ],
            extracted_by="stub",
        )
        c2 = CharacterObject(
            id="char_002",
            name="Marcus Rey",
            aliases=[],
            first_appearance=chapter_id,
            status_by_chapter={chapter_id: "alive"},
            relationships=[
                CharacterRelationship(target_id="char_001", type="sibling", sentiment="hostile")
            ],
            extracted_by="stub",
        )

        if "chapter_02" in chapter_id or "Scene 2" in chapter_id:
            c1.status_by_chapter[chapter_id] = "deceased"
            chars = [c1, c2]
            ws = {
                "chapter_id": chapter_id,
                "characters_present": ["char_001"],
                "locations": ["kingdom_of_varen"],
                "faction_control": {
                    "kingdom_of_varen": "destroyed"
                },
                "key_objects": ["locked_chest"],
                "events": ["kingdom_attacked"],
                "extracted_by": "stub"
            }
            threads = []
        elif "chapter_03" in chapter_id or "Scene 3" in chapter_id:
            c1.status_by_chapter[chapter_id] = "alive"
            chars = [c1, c2]
            ws = {
                "chapter_id": chapter_id,
                "characters_present": ["char_001", "char_002"],
                "locations": ["kingdom_of_varen"],
                "faction_control": {
                    "kingdom_of_varen": "active"
                },
                "key_objects": ["ancient_sword"],
                "events": ["sword_used"],
                "extracted_by": "stub"
            }
            threads = [
                {
                    "type": "promise",
                    "introduced_chapter": chapter_id,
                    "description": "Elena promises Marcus she will return before sunset",
                    "resolved": False
                }
            ]
        else:
            chars = [c1, c2]
            ws = {
                "chapter_id": chapter_id,
                "characters_present": ["char_001", "char_002"],
                "locations": ["kingdom_of_varen"],
                "faction_control": {
                    "kingdom_of_varen": "active"
                },
                "key_objects": ["ancient_sword", "locked_chest"],
                "events": ["sword_found"],
                "extracted_by": "stub"
            }
            threads = [
                {
                    "type": "chekhov_gun",
                    "introduced_chapter": chapter_id,
                    "description": "Locked chest given to protagonist, never opened",
                    "resolved": False
                }
            ]
        return {
            "characters": chars,
            "world_state": ws,
            "threads": threads,
        }

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
        params={"max_new_tokens": 1536, "temperature": 0},
    )

    prompt = _COMBINED_PROMPT.format(
        chapter_id=chapter_id,
        nlu_entities=json.dumps(nlu_result.entities[:20]),
        chapter_text=chapter_text[:3000],
    )

    raw_response = model.generate_text(prompt=prompt)
    return _parse_combined_response(raw_response, chapter_id)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_granite_response(raw: str, chapter_id: str) -> list[CharacterObject]:
    """Extract a JSON array from Granite's free-text response."""
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        return []
    try:
        data = json.loads(match.group(0))
        return [CharacterObject(**item) for item in data if isinstance(item, dict)]
    except (json.JSONDecodeError, ValueError):
        return []


def _parse_json_object(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except (json.JSONDecodeError, ValueError):
        return {}


def _parse_json_array(raw: str) -> list[dict]:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        return []
    try:
        data = json.loads(match.group(0))
        return [item for item in data if isinstance(item, dict)]
    except (json.JSONDecodeError, ValueError):
        return []


def _parse_combined_response(raw: str, chapter_id: str) -> dict:
    """Parse the combined JSON response from Granite."""
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    
    fallback = {
        "characters": [],
        "world_state": {
            "chapter_id": chapter_id,
            "characters_present": [],
            "locations": [],
            "faction_control": {},
            "key_objects": [],
            "events": [],
            "extracted_by": "watsonx.granite-4-h-small"
        },
        "threads": []
    }
    
    if not match:
        return fallback
        
    try:
        data = json.loads(match.group(0))
        
        # Parse characters
        chars = []
        for item in data.get("characters", []):
            if isinstance(item, dict):
                try:
                    chars.append(CharacterObject(**item))
                except Exception:
                    pass
                    
        return {
            "characters": chars,
            "world_state": data.get("world_state", fallback["world_state"]),
            "threads": [t for t in data.get("threads", []) if isinstance(t, dict)]
        }
    except (json.JSONDecodeError, ValueError):
        return fallback
