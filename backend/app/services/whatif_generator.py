"""
What-if exploration generator.

Builds a Chroma vector store from the manuscript's chapter texts (using
watsonx.ai embeddings or stub embeddings in MOCK_AI mode), then uses
retrieval-augmented prompting to generate:
  (a) a short narrative sketch of an alternate story path
  (b) downstream chapter impacts given the existing world state

Supports three preset scope types:
  - character_death
  - relationship_change
  - event_removal

When settings.mock_ai is True, skips Chroma/Granite and returns
deterministic mock responses.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from typing import Literal

from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

GRANITE_MODEL_ID = settings.watsonx_model_id or "ibm/granite-4-h-small"
EMBED_MODEL_ID = "ibm/slate-125m-english-rtrvr-v2"
CHROMA_STORE_PATH = "./chroma_store"

# ---------------------------------------------------------------------------
# Request / Response models (§6.6)
# ---------------------------------------------------------------------------

WhatIfScope = Literal["character_death", "relationship_change", "event_removal"]


class WhatIfRequest(BaseModel):
    scope: WhatIfScope
    target_id: str
    at_chapter: str


class DownstreamImpact(BaseModel):
    chapter_id: str
    impact: str


class WhatIfResponse(BaseModel):
    summary: str
    downstream_impacts: list[DownstreamImpact]


class WhatIfProposal(BaseModel):
    id: str
    title: str
    teaser: str
    scope: WhatIfScope
    target_id: str
    at_chapter: str


class WhatIfProposeResponse(BaseModel):
    proposals: list[WhatIfProposal]


# ---------------------------------------------------------------------------
# Scope-specific prompt templates
# ---------------------------------------------------------------------------

_PROMPTS: dict[str, str] = {
    "character_death": """\
You are a story continuity assistant. Based on the world state and context below,
imagine that the character "{target_id}" dies at the beginning of {at_chapter}.

World state context (JSON):
{context_json}

Retrieved chapter excerpts:
{retrieved_text}

Output a JSON object with exactly these fields:
{{
  "summary": "<2–3 sentence narrative sketch of the alternate story path>",
  "downstream_impacts": [
    {{"chapter_id": "<chapter_id>", "impact": "<one sentence describing what must change>"}}
  ]
}}

Include only chapters that are genuinely affected (at least 2, at most 5).
Output ONLY the JSON object, no prose.
""",

    "relationship_change": """\
You are a story continuity assistant. Based on the world state and context below,
imagine that the relationship involving "{target_id}" is fundamentally reversed \
(e.g. ally becomes enemy, siblings become strangers) starting at {at_chapter}.

World state context (JSON):
{context_json}

Retrieved chapter excerpts:
{retrieved_text}

Output a JSON object with exactly these fields:
{{
  "summary": "<2–3 sentence narrative sketch of the alternate story path>",
  "downstream_impacts": [
    {{"chapter_id": "<chapter_id>", "impact": "<one sentence describing what must change>"}}
  ]
}}

Include only chapters genuinely affected (at least 2, at most 5).
Output ONLY the JSON object, no prose.
""",

    "event_removal": """\
You are a story continuity assistant. Based on the world state and context below,
imagine that the event "{target_id}" at {at_chapter} never occurred.

World state context (JSON):
{context_json}

Retrieved chapter excerpts:
{retrieved_text}

Output a JSON object with exactly these fields:
{{
  "summary": "<2–3 sentence narrative sketch of the alternate story path>",
  "downstream_impacts": [
    {{"chapter_id": "<chapter_id>", "impact": "<one sentence describing what must change>"}}
  ]
}}

Include only chapters genuinely affected (at least 2, at most 5).
Output ONLY the JSON object, no prose.
""",
}


_PROPOSE_PROMPT = """\
You are a story continuity assistant. Based on the user's suggestion for a storyline change, the characters, and the chapters in the manuscript, generate exactly 3 distinct, high-quality alternate trajectory proposals.

Each proposal must map to one of the following simulation scopes:
- "character_death": A character dies at a specific chapter. target_id must be a character's name or ID.
- "relationship_change": A relationship changes/mutates at a specific chapter. target_id must be a character's name or ID.
- "event_removal": A key event never occurred at a specific chapter. target_id must be a descriptive event ID/slug (e.g., escape_failure, artifact_lost).

List of available characters:
{characters_list}

List of available chapters:
{chapters_list}

User's requested change:
"{user_prompt}"

Output a JSON object with exactly the following structure:
{{
  "proposals": [
    {{
      "id": "prop_1",
      "title": "<Short descriptive title of the proposal>",
      "teaser": "<1-2 sentence teaser text summarizing the change and immediate consequence>",
      "scope": "<character_death | relationship_change | event_removal>",
      "target_id": "<valid character ID/name or descriptive event ID>",
      "at_chapter": "<valid chapter_id from the list>"
    }},
    {{
      "id": "prop_2",
      "title": "<Short descriptive title of the proposal>",
      "teaser": "<1-2 sentence teaser text summarizing the change and immediate consequence>",
      "scope": "<character_death | relationship_change | event_removal>",
      "target_id": "<valid character ID/name or descriptive event ID>",
      "at_chapter": "<valid chapter_id from the list>"
    }},
    {{
      "id": "prop_3",
      "title": "<Short descriptive title of the proposal>",
      "teaser": "<1-2 sentence teaser text summarizing the change and immediate consequence>",
      "scope": "<character_death | relationship_change | event_removal>",
      "target_id": "<valid character ID/name or descriptive event ID>",
      "at_chapter": "<valid chapter_id from the list>"
    }}
  ]
}}

Output ONLY the JSON object, no other prose or markdown code block markers.
"""

# ---------------------------------------------------------------------------
# Mock responses (one per scope type)
# ---------------------------------------------------------------------------

_MOCK_RESPONSES: dict[str, dict] = {
    "character_death": {
        "summary": (
            "Had Elena Voss perished at this turning point, the alliance she forged "
            "would have collapsed before it began. Marcus Rey, stripped of his only "
            "ally, would have retreated north — and the kingdom's fate would have been "
            "sealed long before the final siege."
        ),
        "downstream_impacts": [
            {
                "chapter_id": "chapter_05",
                "impact": "The strategy meeting relies on Elena's intelligence; without her it would never take place.",
            },
            {
                "chapter_id": "chapter_09",
                "impact": "Marcus's rescue of the prisoners is only possible because Elena scouts the garrison; this scene would need complete rewriting.",
            },
            {
                "chapter_id": "chapter_14",
                "impact": "The climactic confrontation between Elena and the antagonist would not occur; a new resolution path is required.",
            },
        ],
    },
    "relationship_change": {
        "summary": (
            "If Elena and Marcus had been bitter rivals rather than reluctant allies, "
            "every joint operation in the middle act would collapse into betrayal. "
            "The story's emotional core—two estranged siblings learning to trust—is "
            "replaced by a cold power struggle, fundamentally altering the tone."
        ),
        "downstream_impacts": [
            {
                "chapter_id": "chapter_04",
                "impact": "Their joint escape would instead be a race against each other; the scene needs a new outcome.",
            },
            {
                "chapter_id": "chapter_10",
                "impact": "The moment of reconciliation becomes a confrontation; dialogue and stakes must be rewritten.",
            },
        ],
    },
    "event_removal": {
        "summary": (
            "Without the destruction of the kingdom, the political vacuum that drives "
            "chapters 5 through 12 never forms. The cast would have no urgent reason "
            "to unite, making the central journey feel unmotivated."
        ),
        "downstream_impacts": [
            {
                "chapter_id": "chapter_05",
                "impact": "The refugee subplot depends on displaced citizens; without the kingdom's fall it cannot exist.",
            },
            {
                "chapter_id": "chapter_07",
                "impact": "The power map Marcus draws is predicated on the destroyed kingdom; the scene needs a new catalyst.",
            },
            {
                "chapter_id": "chapter_12",
                "impact": "The return-home arc has nowhere to return to; the chapter's emotional payoff is lost.",
            },
        ],
    },
}


def _get_tailored_mock_proposals(prompt: str, chapters: list, characters: list) -> list[dict]:
    # Extract chapter IDs
    ch_ids = [ch.get("chapter_id") for ch in chapters] if chapters else ["chapter_01"]
    ch1 = ch_ids[0]
    ch2 = ch_ids[min(1, len(ch_ids) - 1)]
    ch3 = ch_ids[min(2, len(ch_ids) - 1)]

    # Detect if we have Elena Voss / Marcus Rey (Time Machine story)
    has_elena = any("elena" in c.get("name", "").lower() for c in characters)
    
    # Detect if we have Sherlock Holmes / Helen Stoner (Speckled Band story)
    has_holmes = any("holmes" in c.get("name", "").lower() or "sherlock" in c.get("name", "").lower() for c in characters)

    prompt_lower = prompt.lower()

    if has_elena:
        if any(w in prompt_lower for w in ["death", "die", "kill", "perish"]):
            return [
                {
                    "id": "prop_1",
                    "title": "Elena Voss's Sudden Demise",
                    "teaser": "Elena Voss perishes during the skirmish, leaving Marcus without his critical informant.",
                    "scope": "character_death",
                    "target_id": "Elena Voss",
                    "at_chapter": ch2,
                },
                {
                    "id": "prop_2",
                    "title": "Marcus Rey Falls in Battle",
                    "teaser": "Marcus Rey is killed defending the outpost, forcing Elena Voss to take command of the resistance.",
                    "scope": "character_death",
                    "target_id": "Marcus Rey",
                    "at_chapter": ch3,
                },
                {
                    "id": "prop_3",
                    "title": "Elena Voss Dies Early",
                    "teaser": "Elena Voss dies at the start of the journey, leaving the conspiracy unresolved.",
                    "scope": "character_death",
                    "target_id": "Elena Voss",
                    "at_chapter": ch1,
                },
            ]
        elif any(w in prompt_lower for w in ["relationship", "rival", "enemy", "betray", "love", "friend"]):
            return [
                {
                    "id": "prop_1",
                    "title": "Elena's Betrayal",
                    "teaser": "Elena turns on Marcus, allying with the crown to protect her family.",
                    "scope": "relationship_change",
                    "target_id": "Elena Voss",
                    "at_chapter": ch3,
                },
                {
                    "id": "prop_2",
                    "title": "Brothers-in-Arms turned Enemies",
                    "teaser": "Marcus and his lieutenant have a falling out, splitting the rebel forces into two factions.",
                    "scope": "relationship_change",
                    "target_id": "Marcus Rey",
                    "at_chapter": ch3,
                },
                {
                    "id": "prop_3",
                    "title": "Rivals Form Unlikely Alliance",
                    "teaser": "Elena Voss and the crown prince form a secret alliance, ending their initial hostility.",
                    "scope": "relationship_change",
                    "target_id": "Elena Voss",
                    "at_chapter": ch2,
                },
            ]
        else:
            return [
                {
                    "id": "prop_1",
                    "title": "Elena Voss's Sudden Demise",
                    "teaser": "Elena Voss perishes during the skirmish, leaving Marcus without his critical informant and altering the rebel strategy.",
                    "scope": "character_death",
                    "target_id": "Elena Voss",
                    "at_chapter": ch2,
                },
                {
                    "id": "prop_2",
                    "title": "Marcus and Elena Become Bitter Rivals",
                    "teaser": "Elena turns on Marcus, allying with the crown to protect her family, which transforms their alliance into a game of betrayal.",
                    "scope": "relationship_change",
                    "target_id": "Elena Voss",
                    "at_chapter": ch3,
                },
                {
                    "id": "prop_3",
                    "title": "Garrison Escape Never Occurs",
                    "teaser": "The dramatic escape from the garrison never occurs, forcing the rebels to find a quieter exit from the city.",
                    "scope": "event_removal",
                    "target_id": "escape_garrison",
                    "at_chapter": ch3,
                },
            ]

    elif has_holmes:
        if any(w in prompt_lower for w in ["death", "die", "kill", "perish"]):
            return [
                {
                    "id": "prop_1",
                    "title": "Helen Stoner's Sudden Demise",
                    "teaser": "Helen Stoner perishes in her sister's room before Sherlock Holmes can intervene, forcing Holmes to solve a homicide case instead.",
                    "scope": "character_death",
                    "target_id": "Helen Stoner",
                    "at_chapter": ch2,
                },
                {
                    "id": "prop_2",
                    "title": "Dr. Grimesby Roylott Dies Early",
                    "teaser": "Dr. Roylott dies mysteriously before Holmes and Watson arrive at Stoke Moran, leaving the motive of the crime completely obscured.",
                    "scope": "character_death",
                    "target_id": "Dr. Grimesby Roylott",
                    "at_chapter": ch2,
                },
                {
                    "id": "prop_3",
                    "title": "Sherlock Holmes Falls in the Line of Duty",
                    "teaser": "Sherlock Holmes is fatally bitten by the swamp adder, leaving Dr. John Watson to single-handedly wrap up the case.",
                    "scope": "character_death",
                    "target_id": "Sherlock Holmes",
                    "at_chapter": ch3,
                },
            ]
        elif any(w in prompt_lower for w in ["relationship", "rival", "enemy", "betray", "love", "friend"]):
            return [
                {
                    "id": "prop_1",
                    "title": "Holmes and Watson Become Bitter Rivals",
                    "teaser": "A major disagreement over investigative methods turns the legendary partnership into a bitter professional rivalry.",
                    "scope": "relationship_change",
                    "target_id": "Sherlock Holmes",
                    "at_chapter": ch3,
                },
                {
                    "id": "prop_2",
                    "title": "Helen Stoner Betrays Holmes",
                    "teaser": "Helen Stoner is revealed to be working in secret collusion with Dr. Roylott to mislead the detectives.",
                    "scope": "relationship_change",
                    "target_id": "Helen Stoner",
                    "at_chapter": ch2,
                },
                {
                    "id": "prop_3",
                    "title": "Dr. Roylott Proposes an Alliance",
                    "teaser": "Dr. Grimesby Roylott offers Holmes a handsome bribe, converting their initial hostility into an uneasy alliance.",
                    "scope": "relationship_change",
                    "target_id": "Dr. Grimesby Roylott",
                    "at_chapter": ch3,
                },
            ]
        else:
            return [
                {
                    "id": "prop_1",
                    "title": "Helen Stoner's Sudden Demise",
                    "teaser": "Helen Stoner perishes in her sister's room before Sherlock Holmes can intervene, forcing Holmes to solve a homicide case instead.",
                    "scope": "character_death",
                    "target_id": "Helen Stoner",
                    "at_chapter": ch2,
                },
                {
                    "id": "prop_2",
                    "title": "Holmes and Watson Become Bitter Rivals",
                    "teaser": "A major disagreement over investigative methods turns the legendary partnership into a bitter professional rivalry.",
                    "scope": "relationship_change",
                    "target_id": "Sherlock Holmes",
                    "at_chapter": ch3,
                },
                {
                    "id": "prop_3",
                    "title": "Swamp Adder Attack Avoided",
                    "teaser": "The swamp adder is detected and captured before it can crawl through the ventilator, completely avoiding the fatal attack.",
                    "scope": "event_removal",
                    "target_id": "swamp_adder_bite",
                    "at_chapter": ch3,
                },
            ]

    else:
        # Fallback to general dynamic generation using actual characters and chapters present!
        char1 = characters[0] if characters else {"id": "char_001", "name": "Protagonist"}
        char2 = characters[min(1, len(characters) - 1)] if len(characters) > 1 else {"id": "char_002", "name": "Supporting Character"}
        
        target_char = char1
        for c in characters:
            name = c.get("name", "")
            if name.lower() in prompt_lower:
                target_char = c
                break

        if any(w in prompt_lower for w in ["death", "die", "kill", "perish"]):
            return [
                {
                    "id": "prop_1",
                    "title": f"{target_char.get('name')}'s Sudden Demise",
                    "teaser": f"{target_char.get('name')} perishes during this chapter, leaving the remaining characters to navigate the crisis without them.",
                    "scope": "character_death",
                    "target_id": target_char.get("name"),
                    "at_chapter": ch2,
                },
                {
                    "id": "prop_2",
                    "title": f"{char2.get('name')}'s Sudden Demise",
                    "teaser": f"{char2.get('name')} perishes unexpectedly, cutting short their contribution to the narrative.",
                    "scope": "character_death",
                    "target_id": char2.get("name"),
                    "at_chapter": ch3,
                },
                {
                    "id": "prop_3",
                    "title": f"{target_char.get('name')} Dies Early",
                    "teaser": f"{target_char.get('name')} perishes at the very beginning of the journey, leaving their main objective unfulfilled.",
                    "scope": "character_death",
                    "target_id": target_char.get("name"),
                    "at_chapter": ch1,
                },
            ]
        elif any(w in prompt_lower for w in ["relationship", "rival", "enemy", "betray", "love", "friend"]):
            return [
                {
                    "id": "prop_1",
                    "title": f"{target_char.get('name')} and {char2.get('name')} Become Bitter Rivals",
                    "teaser": f"A deep conflict of interest turns {target_char.get('name')} and {char2.get('name')} from allies into bitter opponents.",
                    "scope": "relationship_change",
                    "target_id": target_char.get("name"),
                    "at_chapter": ch3,
                },
                {
                    "id": "prop_2",
                    "title": f"{char2.get('name')} Betrays {target_char.get('name')}",
                    "teaser": f"What if {char2.get('name')} decides to betray {target_char.get('name')} to secure their own safety?",
                    "scope": "relationship_change",
                    "target_id": char2.get("name"),
                    "at_chapter": ch3,
                },
                {
                    "id": "prop_3",
                    "title": "Uneasy Alliance Formed",
                    "teaser": f"Two hostile factions are forced to work together, turning their enmity into an uneasy alliance.",
                    "scope": "relationship_change",
                    "target_id": target_char.get("name"),
                    "at_chapter": ch2,
                },
            ]
        else:
            return [
                {
                    "id": "prop_1",
                    "title": f"{target_char.get('name')}'s Sudden Demise",
                    "teaser": f"{target_char.get('name')} perishes during this chapter, leaving the remaining characters to navigate the crisis without them.",
                    "scope": "character_death",
                    "target_id": target_char.get("name"),
                    "at_chapter": ch2,
                },
                {
                    "id": "prop_2",
                    "title": f"{char1.get('name')} and {char2.get('name')} Become Bitter Rivals",
                    "teaser": f"A deep conflict of interest turns {char1.get('name')} and {char2.get('name')} from allies into bitter opponents.",
                    "scope": "relationship_change",
                    "target_id": char1.get("name"),
                    "at_chapter": ch3,
                },
                {
                    "id": "prop_3",
                    "title": "Key Event Avoided",
                    "teaser": "A pivotal turning point in the story never takes place, forcing the characters to take a different direction.",
                    "scope": "event_removal",
                    "target_id": "pivotal_event",
                    "at_chapter": ch2,
                },
            ]


def _generate_dynamic_whatif_response(
    request: WhatIfRequest,
    chapters: list,
    characters: list,
) -> WhatIfResponse:
    scope = request.scope
    target_id = request.target_id
    at_chapter = request.at_chapter

    # 1. Try to find the target character's name/aliases
    target_char_name = target_id
    target_char = None
    for c in characters:
        if c.get("id") == target_id or c.get("name") == target_id:
            target_char_name = c.get("name")
            target_char = c
            break

    # Get downstream chapters
    ch_ids = [ch.get("chapter_id") for ch in chapters]
    try:
        idx = ch_ids.index(at_chapter)
        downstream_ch = ch_ids[idx + 1:]
    except ValueError:
        downstream_ch = ch_ids[1:]
    
    downstream_ch = downstream_ch[:3]
    if not downstream_ch:
        downstream_ch = ch_ids[-2:] if len(ch_ids) > 1 else ch_ids

    # Detect if we have Elena Voss / Marcus Rey (Time Machine story)
    has_elena = any("elena" in c.get("name", "").lower() for c in characters)
    # Detect if we have Sherlock Holmes / Helen Stoner (Speckled Band story)
    has_holmes = any("holmes" in c.get("name", "").lower() or "sherlock" in c.get("name", "").lower() for c in characters)

    if has_elena:
        if scope == "character_death":
            summary = (
                f"Had {target_char_name} perished at this turning point, the alliance she forged "
                f"would have collapsed before it began. Marcus Rey, stripped of his only "
                f"ally, would have retreated north — and the kingdom's fate would have been "
                f"sealed long before the final siege."
            )
            downstream_impacts = [
                {
                    "chapter_id": "chapter_05" if "chapter_05" in ch_ids else (downstream_ch[0] if downstream_ch else "chapter_01"),
                    "impact": f"The strategy meeting relies on {target_char_name}'s intelligence; without her it would never take place.",
                },
                {
                    "chapter_id": "chapter_09" if "chapter_09" in ch_ids else (downstream_ch[min(1, len(downstream_ch)-1)] if downstream_ch else "chapter_02"),
                    "impact": f"Marcus's rescue of the prisoners is only possible because {target_char_name} scouts the garrison; this scene would need complete rewriting.",
                },
            ]
        elif scope == "relationship_change":
            summary = (
                f"If {target_char_name} and Marcus had been bitter rivals rather than reluctant allies, "
                f"every joint operation in the middle act would collapse into betrayal. "
                f"The story's emotional core—two estranged siblings learning to trust—is "
                f"replaced by a cold power struggle, fundamentally altering the tone."
            )
            downstream_impacts = [
                {
                    "chapter_id": "chapter_04" if "chapter_04" in ch_ids else (downstream_ch[0] if downstream_ch else "chapter_01"),
                    "impact": "Their joint escape would instead be a race against each other; the scene needs a new outcome.",
                },
                {
                    "chapter_id": "chapter_10" if "chapter_10" in ch_ids else (downstream_ch[min(1, len(downstream_ch)-1)] if downstream_ch else "chapter_02"),
                    "impact": "The moment of reconciliation becomes a confrontation; dialogue and stakes must be rewritten.",
                },
            ]
        else:  # event_removal
            summary = (
                f"Without the occurrence of the event '{target_id}' at {at_chapter.replace('_', ' ')}, "
                f"the political vacuum that drives subsequent chapters never forms. "
                f"The cast would have no urgent reason to unite, making the central journey feel unmotivated."
            )
            downstream_impacts = [
                {
                    "chapter_id": "chapter_05" if "chapter_05" in ch_ids else (downstream_ch[0] if downstream_ch else "chapter_01"),
                    "impact": "The refugee subplot depends on displaced citizens; without the kingdom's fall it cannot exist.",
                },
            ]
    elif has_holmes:
        if scope == "character_death":
            summary = (
                f"Had {target_char_name} perished at this turning point, Sherlock Holmes's investigation "
                f"into the Stoke Moran estate would have taken a tragic turn. Dr. Watson would be forced "
                f"to carry out the inquiry alone, lacking the sharp deductive insights needed to solve the case."
            )
            downstream_impacts = [
                {
                    "chapter_id": downstream_ch[0] if downstream_ch else "chapter_01",
                    "impact": f"The inspection of the bedroom would proceed without {target_char_name}'s personal input, missing crucial clues.",
                },
                {
                    "chapter_id": downstream_ch[min(1, len(downstream_ch)-1)] if len(downstream_ch) > 1 else "chapter_02",
                    "impact": "The final night-vigil is significantly more dangerous without all partners present and alert.",
                },
            ]
        elif scope == "relationship_change":
            associate = "Dr. John Watson"
            if target_char_name == "Dr. John Watson":
                associate = "Sherlock Holmes"
            summary = (
                f"If {target_char_name} and {associate} had been bitter rivals rather than devoted companions, "
                f"the investigation would have degenerated into a race of egos. Important findings would be "
                f"withheld from each other, letting Dr. Roylott exploit their division."
            )
            downstream_impacts = [
                {
                    "chapter_id": downstream_ch[0] if downstream_ch else "chapter_01",
                    "impact": "They conduct separate visits to Stoke Moran, alerting Dr. Roylott of their presence much earlier.",
                },
                {
                    "chapter_id": downstream_ch[min(1, len(downstream_ch)-1)] if len(downstream_ch) > 1 else "chapter_02",
                    "impact": "The critical confrontation at the manor becomes a three-way standoff between Holmes, Watson, and Roylott.",
                },
            ]
        else:  # event_removal
            summary = (
                f"Without the event '{target_id}' occurring at {at_chapter.replace('_', ' ')}, "
                f"the chain of suspicion that points to Dr. Grimesby Roylott's sinister plot is broken. "
                f"Holmes is left without a clear lead, prolonging the mystery."
            )
            downstream_impacts = [
                {
                    "chapter_id": downstream_ch[0] if downstream_ch else "chapter_01",
                    "impact": "The detectives are forced to return to London to gather additional background evidence on the Roylott family.",
                },
            ]
    else:
        if scope == "character_death":
            summary = (
                f"Had {target_char_name} perished at this turning point, the narrative path at {at_chapter.replace('_', ' ')} "
                f"would be fundamentally disrupted. The remaining cast members would need to shoulder the burden "
                f"of {target_char_name}'s role, altering subsequent events."
            )
            downstream_impacts = [
                {
                    "chapter_id": downstream_ch[0] if downstream_ch else "chapter_01",
                    "impact": f"Scenes requiring {target_char_name}'s presence must be entirely rewritten to distribute tasks to other characters.",
                },
            ]
        elif scope == "relationship_change":
            summary = (
                f"If the relationship involving {target_char_name} had broken down at {at_chapter.replace('_', ' ')}, "
                f"it would trigger a wave of distrust. Cooperative efforts would collapse, forcing characters "
                f"to take divergent paths."
            )
            downstream_impacts = [
                {
                    "chapter_id": downstream_ch[0] if downstream_ch else "chapter_01",
                    "impact": "A key dialogue scene of reconciliation or planning turns into a hostile argument.",
                },
            ]
        else:  # event_removal
            summary = (
                f"Without the occurrence of the event '{target_id}' at {at_chapter.replace('_', ' ')}, "
                f"the subsequent chain of events is broken. The immediate stakes are lowered, and the narrative "
                f"loses its primary catalyst."
            )
            downstream_impacts = [
                {
                    "chapter_id": downstream_ch[0] if downstream_ch else "chapter_01",
                    "impact": "The characters must search for a new lead or motivation to continue their quest.",
                },
            ]

    return WhatIfResponse(
        summary=summary,
        downstream_impacts=[DownstreamImpact(**d) for d in downstream_impacts],
    )



# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def embed_manuscript(manuscript_id: str, chapters: list, provider: str = "watsonx") -> None:
    """
    Build (or rebuild) a Chroma collection for this manuscript.

    ``chapters`` is a list of dicts with keys ``chapter_id`` and ``text``.

    In MOCK_AI mode this is a no-op — we don't need Chroma for mock responses.
    """
    if settings.mock_ai:
        return

    try:
        import chromadb
        from app.services import llm_client

        store_path = os.path.join(CHROMA_STORE_PATH, manuscript_id)
        client = chromadb.PersistentClient(path=store_path)
        collection = client.get_or_create_collection(
            name="chapters",
            metadata={"hnsw:space": "cosine"},
        )

        ids: list[str] = []
        embeddings: list[list[float]] = []
        documents: list[str] = []
        metadatas: list[dict] = []

        for ch in chapters:
            chapter_id = ch.get("chapter_id", "")
            text = ch.get("text", "")[:2000]  # truncate for embedding budget
            doc_id = _stable_id(manuscript_id, chapter_id)

            # Skip generating embedding if this chapter is already indexed in Chroma
            try:
                existing = collection.get(ids=[doc_id])
                if existing and existing.get("ids"):
                    logger.info("embed_manuscript: Chapter %s already embedded in Chroma — skipping.", chapter_id)
                    continue
            except Exception:
                pass

            vector = llm_client.generate_embedding(text, provider=provider)

            ids.append(doc_id)
            embeddings.append(vector)
            documents.append(text)
            metadatas.append({"chapter_id": chapter_id})

        if ids:
            collection.upsert(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)

        logger.info("embed_manuscript: indexed %d chapters for manuscript %s", len(ids), manuscript_id)

    except Exception:  # noqa: BLE001
        logger.exception("embed_manuscript: failed for manuscript %s — what-if will fall back to full context", manuscript_id)


def run_whatif(
    manuscript_id: str,
    request: WhatIfRequest,
    chapters: list,
    characters: list,
    provider: str = "watsonx",
) -> WhatIfResponse:
    """
    Run a what-if exploration and return a ``WhatIfResponse``.

    ``chapters`` is a list of dicts (chapter_id, text, world_state).
    ``characters`` is a list of dicts (the CharacterObject dicts stored in the DB).
    """
    import sys
    is_mock = settings.mock_ai and (manuscript_id == "d54c0525-28c2-417e-9660-1ad9aa29bc54" or "pytest" in sys.modules)

    if is_mock:
        return _generate_dynamic_whatif_response(request, chapters, characters)

    try:
        context_json, retrieved_text = _build_context(manuscript_id, request, chapters, characters, provider=provider)

        prompt = _PROMPTS[request.scope].format(
            target_id=request.target_id,
            at_chapter=request.at_chapter,
            context_json=context_json,
            retrieved_text=retrieved_text,
        )

        from app.services import llm_client

        raw_response = llm_client.generate_text(
            prompt=prompt,
            provider=provider,
            max_new_tokens=8192 if provider == "gemini" else 768,
            temperature=0.3,
            force_live=True,
        )
        parsed = _parse_whatif_response(raw_response)

        return WhatIfResponse(
            summary=parsed.get("summary", "Alternate path generated."),
            downstream_impacts=[
                DownstreamImpact(**item)
                for item in parsed.get("downstream_impacts", [])
                if isinstance(item, dict)
            ],
        )

    except Exception:  # noqa: BLE001
        logger.exception("run_whatif: failed for manuscript %s", manuscript_id)
        return _generate_dynamic_whatif_response(request, chapters, characters)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_context(
    manuscript_id: str,
    request: WhatIfRequest,
    chapters: list,
    characters: list,
    provider: str = "watsonx",
) -> tuple[str, str]:
    """
    Return (context_json_str, retrieved_text_str) for use in the prompt.

    Tries to use Chroma for retrieval; falls back to passing the target-chapter
    world state and the 2 surrounding chapters verbatim.
    """
    # Build a dict of chapter world states for quick lookup
    world_states = {ch.get("chapter_id"): ch.get("world_state", {}) for ch in chapters}
    target_ws = world_states.get(request.at_chapter, {})

    # Find the character context if scope involves a character
    char_context = {}
    for c in characters:
        if c.get("id") == request.target_id or c.get("name") == request.target_id:
            char_context = c
            break

    context = {
        "target_chapter_world_state": target_ws,
        "character": char_context,
        "total_chapters": len(chapters),
    }
    context_json = json.dumps(context, indent=2)

    # Attempt Chroma retrieval
    retrieved_text = _retrieve_chroma(manuscript_id, request, chapters, provider=provider)

    return context_json, retrieved_text


def _retrieve_chroma(manuscript_id: str, request: WhatIfRequest, chapters: list, provider: str = "watsonx") -> str:
    """
    Query Chroma for the top-3 most relevant chapters to the what-if scenario.
    Falls back to the two chapters around the target chapter on any failure.
    For Gemini, we pass the entire manuscript text directly.
    """
    if provider == "gemini":
        parts = []
        for ch in chapters:
            parts.append(f"[{ch.get('chapter_id', '?')}]: {ch.get('text', '')}")
        return "\n\n".join(parts)

    query = f"{request.scope} {request.target_id} {request.at_chapter}"

    try:
        import chromadb
        from app.services import llm_client

        store_path = os.path.join(CHROMA_STORE_PATH, manuscript_id)
        client = chromadb.PersistentClient(path=store_path)
        collection = client.get_collection(name="chapters")

        query_vector = llm_client.generate_embedding(query, provider=provider)

        results = collection.query(
            query_embeddings=[query_vector],
            n_results=min(3, collection.count()),
        )

        texts = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]

        parts = []
        for meta, text in zip(metas, texts):
            parts.append(f"[{meta.get('chapter_id', '?')}]: {text[:800]}")
        return "\n\n".join(parts)

    except Exception:  # noqa: BLE001
        # Fallback: two chapters around the target
        return _fallback_context(request.at_chapter, chapters)


def _fallback_context(at_chapter: str, chapters: list) -> str:
    """Return text of the chapter before and after `at_chapter` as a fallback."""
    ids = [ch.get("chapter_id") for ch in chapters]
    try:
        idx = ids.index(at_chapter)
    except ValueError:
        idx = 0
    window = chapters[max(0, idx - 1): idx + 2]
    parts = [f"[{ch.get('chapter_id', '?')}]: {ch.get('text', '')[:600]}" for ch in window]
    return "\n\n".join(parts)


def _stable_id(manuscript_id: str, chapter_id: str) -> str:
    return hashlib.md5(f"{manuscript_id}:{chapter_id}".encode()).hexdigest()


def _parse_whatif_response(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except (json.JSONDecodeError, ValueError):
        return {}


def _parse_propose_response(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except (json.JSONDecodeError, ValueError):
        return {}


def generate_proposals(
    manuscript_id: str,
    prompt: str,
    chapters: list,
    characters: list,
    provider: str = "watsonx",
) -> WhatIfProposeResponse:
    """
    Generate 3 what-if trajectory proposals based on the user's free-text prompt.
    """
    import sys
    is_mock = settings.mock_ai and (manuscript_id == "d54c0525-28c2-417e-9660-1ad9aa29bc54" or "pytest" in sys.modules)

    if is_mock:
        props = _get_tailored_mock_proposals(prompt, chapters, characters)
        return WhatIfProposeResponse(proposals=[WhatIfProposal(**p) for p in props])

    try:
        char_list = []
        for c in characters:
            char_list.append(f"- ID: {c.get('id')}, Name: {c.get('name')}")
        characters_str = "\n".join(char_list) if char_list else "No characters extracted yet."

        ch_list = []
        for ch in chapters:
            ch_list.append(f"- {ch.get('chapter_id')}")
        chapters_str = "\n".join(ch_list) if ch_list else "No chapters present."

        formatted_prompt = _PROPOSE_PROMPT.format(
            characters_list=characters_str,
            chapters_list=chapters_str,
            user_prompt=prompt,
        )

        from app.services import llm_client

        # For Gemini, define the responseSchema to ensure reliable output structures
        response_schema = None
        if provider == "gemini":
            response_schema = {
                "type": "OBJECT",
                "properties": {
                    "proposals": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "id": {"type": "STRING"},
                                "title": {"type": "STRING"},
                                "teaser": {"type": "STRING"},
                                "scope": {"type": "STRING", "enum": ["character_death", "relationship_change", "event_removal"]},
                                "target_id": {"type": "STRING"},
                                "at_chapter": {"type": "STRING"},
                            },
                            "required": ["id", "title", "teaser", "scope", "target_id", "at_chapter"],
                        },
                        "minItems": 3,
                        "maxItems": 3,
                    }
                },
                "required": ["proposals"],
            }

        raw_response = llm_client.generate_text(
            prompt=formatted_prompt,
            provider=provider,
            max_new_tokens=8192 if provider == "gemini" else 1024,
            temperature=0.5,
            response_schema=response_schema,
            force_live=True,
        )
        parsed = _parse_propose_response(raw_response)

        proposals_data = parsed.get("proposals", [])
        if not proposals_data or len(proposals_data) < 3:
            raise ValueError("LLM returned insufficient proposals")

        # Normalize and filter
        props = []
        for item in proposals_data[:3]:
            # sanitize scope to make sure it's valid
            scope = item.get("scope")
            if scope not in ("character_death", "relationship_change", "event_removal"):
                scope = "character_death" # fallback
            
            # sanitize chapter
            at_chapter = item.get("at_chapter")
            valid_chapters = [ch.get("chapter_id") for ch in chapters]
            if at_chapter not in valid_chapters and valid_chapters:
                at_chapter = valid_chapters[0]

            props.append(
                WhatIfProposal(
                    id=item.get("id") or f"prop_{len(props)+1}",
                    title=item.get("title") or "Alternate Trajectory",
                    teaser=item.get("teaser") or "A new alternate storyline branch.",
                    scope=scope,
                    target_id=item.get("target_id") or "unknown",
                    at_chapter=at_chapter or "chapter_01",
                )
            )

        # Pad if fewer than 3
        while len(props) < 3:
            props.append(
                WhatIfProposal(
                    id=f"prop_{len(props)+1}",
                    title="Alternate Path",
                    teaser="A branch point is introduced here.",
                    scope="character_death",
                    target_id="unknown",
                    at_chapter="chapter_01",
                )
            )

        return WhatIfProposeResponse(proposals=props)

    except Exception:  # noqa: BLE001
        logger.exception("generate_proposals: failed for manuscript %s, falling back to mock", manuscript_id)
        props = _get_tailored_mock_proposals(prompt, chapters, characters)
        return WhatIfProposeResponse(proposals=[WhatIfProposal(**p) for p in props])
