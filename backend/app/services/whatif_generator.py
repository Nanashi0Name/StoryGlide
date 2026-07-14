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


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def embed_manuscript(manuscript_id: str, chapters: list) -> None:
    """
    Build (or rebuild) a Chroma collection for this manuscript.

    ``chapters`` is a list of dicts with keys ``chapter_id`` and ``text``.

    In MOCK_AI mode this is a no-op — we don't need Chroma for mock responses.
    """
    if settings.mock_ai:
        return

    try:
        import chromadb
        from ibm_watsonx_ai import Credentials
        from ibm_watsonx_ai.foundation_models import ModelInference

        store_path = os.path.join(CHROMA_STORE_PATH, manuscript_id)
        client = chromadb.PersistentClient(path=store_path)
        collection = client.get_or_create_collection(
            name="chapters",
            metadata={"hnsw:space": "cosine"},
        )

        credentials = Credentials(
            url=settings.watsonx_url,
            api_key=settings.watsonx_api_key,
        )
        embed_model = ModelInference(
            model_id=EMBED_MODEL_ID,
            credentials=credentials,
            project_id=settings.watsonx_project_id,
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

            raw_embed = embed_model.generate_embeddings(
                input=text,
                params={"return_tokens": False},
            )
            # watsonx.ai embedding response shape: {"results": [{"embedding": [...]}]}
            vector = raw_embed["results"][0]["embedding"]

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
) -> WhatIfResponse:
    """
    Run a what-if exploration and return a ``WhatIfResponse``.

    ``chapters`` is a list of dicts (chapter_id, text, world_state).
    ``characters`` is a list of dicts (the CharacterObject dicts stored in the DB).
    """
    if settings.mock_ai:
        mock = _MOCK_RESPONSES[request.scope]
        return WhatIfResponse(
            summary=mock["summary"],
            downstream_impacts=[DownstreamImpact(**d) for d in mock["downstream_impacts"]],
        )

    try:
        context_json, retrieved_text = _build_context(manuscript_id, request, chapters, characters)

        prompt = _PROMPTS[request.scope].format(
            target_id=request.target_id,
            at_chapter=request.at_chapter,
            context_json=context_json,
            retrieved_text=retrieved_text,
        )

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
            params={"max_new_tokens": 768, "temperature": 0.3},
        )

        raw = model.generate_text(prompt=prompt)
        parsed = _parse_whatif_response(raw)

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
        return WhatIfResponse(
            summary="Could not generate a what-if response. Please try again.",
            downstream_impacts=[],
        )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_context(
    manuscript_id: str,
    request: WhatIfRequest,
    chapters: list,
    characters: list,
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
    retrieved_text = _retrieve_chroma(manuscript_id, request, chapters)

    return context_json, retrieved_text


def _retrieve_chroma(manuscript_id: str, request: WhatIfRequest, chapters: list) -> str:
    """
    Query Chroma for the top-3 most relevant chapters to the what-if scenario.
    Falls back to the two chapters around the target chapter on any failure.
    """
    query = f"{request.scope} {request.target_id} {request.at_chapter}"

    try:
        import chromadb
        from ibm_watsonx_ai import Credentials
        from ibm_watsonx_ai.foundation_models import ModelInference

        store_path = os.path.join(CHROMA_STORE_PATH, manuscript_id)
        client = chromadb.PersistentClient(path=store_path)
        collection = client.get_collection(name="chapters")

        credentials = Credentials(
            url=settings.watsonx_url,
            api_key=settings.watsonx_api_key,
        )
        embed_model = ModelInference(
            model_id=EMBED_MODEL_ID,
            credentials=credentials,
            project_id=settings.watsonx_project_id,
        )

        raw_embed = embed_model.generate_embeddings(
            input=query,
            params={"return_tokens": False},
        )
        query_vector = raw_embed["results"][0]["embedding"]

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
