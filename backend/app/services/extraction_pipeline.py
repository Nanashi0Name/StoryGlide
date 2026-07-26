"""
Extraction pipeline.

Orchestrates: chapter chunking locally → single-pass structured Gemini call → persist to SQLite.
Bypasses intermediate NLU/Granite steps and Chroma indexing.

Called as a FastAPI BackgroundTask so the HTTP response returns immediately.
"""

from __future__ import annotations

import asyncio
import logging
import json
import re
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.manuscript import Chapter, Manuscript
from app.services import chunker as chunker_svc

logger = logging.getLogger(__name__)


def generate_mock_gemini_response(chapters: list[chunker_svc.ChapterChunk]) -> dict:
    """Generate dynamic mock data mirroring the Gemini JSON schema format."""
    chapter_ids = [ch.chapter_id for ch in chapters]
    
    # Generate pacing arc
    pacing_arc = []
    _MOCK_EMOTIONS = ["anticipation", "fear", "anger", "fear", "sadness", "trust"]
    _MOCK_SENTIMENTS = ["neutral", "negative", "negative", "negative", "negative", "neutral"]
    for i, ch_id in enumerate(chapter_ids):
        tension = 0.2 + (i % 5) * 0.15
        pacing_arc.append({
            "chapter_id": ch_id,
            "tension_score": min(1.0, tension),
            "sentiment": _MOCK_SENTIMENTS[i % len(_MOCK_SENTIMENTS)],
            "dominant_emotion": _MOCK_EMOTIONS[i % len(_MOCK_EMOTIONS)]
        })
        
    # Generate character statuses
    char_statuses_1 = []
    char_statuses_2 = []
    for i, ch_id in enumerate(chapter_ids):
        char_statuses_1.append({"chapter_id": ch_id, "status": "alive"})
        status_2 = "absent" if i == 0 else ("alive" if i == 1 else "deceased")
        char_statuses_2.append({"chapter_id": ch_id, "status": status_2})
        
    characters = [
        {
            "id": "char_001",
            "name": "Elena Voss",
            "aliases": ["Elena"],
            "first_appearance": chapter_ids[0] if chapter_ids else "chapter_01",
            "status_by_chapter": char_statuses_1,
            "relationships": []
        },
        {
            "id": "char_002",
            "name": "Marcus Rey",
            "aliases": ["Marcus"],
            "first_appearance": chapter_ids[1] if len(chapter_ids) > 1 else "chapter_01",
            "status_by_chapter": char_statuses_2,
            "relationships": [
                {"target_id": "char_001", "type": "ally", "sentiment": "friendly"}
            ]
        }
    ]
    
    # Contradictions
    contradictions = []
    if len(chapter_ids) >= 3:
        contradictions.append({
            "id": "flag_001",
            "type": "state_conflict",
            "entity": "Elena Voss",
            "conflicting_chapters": [chapter_ids[1], chapter_ids[2]],
            "description": "Elena Voss was marked deceased in chapter 2, but is later described as alive in chapter 3.",
            "confidence": 0.95
        })
        
    # Unresolved threads
    unresolved_threads = [
        {
            "id": "thread_001",
            "type": "chekhov_gun",
            "introduced_chapter": chapter_ids[0] if chapter_ids else "chapter_01",
            "description": "A locked chest in the corner of the room",
            "resolved": False
        }
    ]
    
    # World states
    world_states = []
    for i, ch_id in enumerate(chapter_ids):
        status = "destroyed" if i == 1 else "active"
        world_states.append({
            "chapter_id": ch_id,
            "faction_control": [{"entity": "Kingdom of Varen", "status": status}]
        })
        
    return {
        "characters": characters,
        "contradictions": contradictions,
        "unresolved_threads": unresolved_threads,
        "pacing_arc": pacing_arc,
        "world_states": world_states
    }


async def run(manuscript_id: str, file_bytes: bytes, filename: str) -> None:
    """
    Full pipeline for a single manuscript upload.
    Runs entirely inside its own DB session so it is safe to call from
    BackgroundTasks after the upload response has been sent.
    """
    async with AsyncSessionLocal() as db:
        manuscript = await _get_manuscript(db, manuscript_id)
        if manuscript is None:
            logger.error("Pipeline: manuscript %s not found", manuscript_id)
            return

        try:
            # Stage 1: parse + chunk
            manuscript.status = "chunked"
            await db.commit()

            text = chunker_svc.parse_text(file_bytes, filename)
            chunks = chunker_svc.split_into_chapters(text)

            # Caching Check: Never re-analyze an unmodified manuscript
            stmt = select(Manuscript).where(
                Manuscript.filename == filename,
                Manuscript.status == "done"
            )
            existing_result = await db.execute(stmt)
            existing_manuscripts = existing_result.scalars().all()

            cached_manuscript = None
            cached_chapters = []
            for em in existing_manuscripts:
                ch_stmt = select(Chapter).where(Chapter.manuscript_id == em.id).order_by(Chapter.id)
                ch_result = await db.execute(ch_stmt)
                em_chapters = list(ch_result.scalars().all())
                if len(em_chapters) == len(chunks):
                    match = True
                    for em_ch, chunk in zip(em_chapters, chunks):
                        if em_ch.text != chunk.text:
                            match = False
                            break
                    if match:
                        cached_manuscript = em
                        cached_chapters = em_chapters
                        break

            if cached_manuscript is not None:
                logger.info("Pipeline: Unmodified manuscript found (id=%s). Reusing cached analysis.", cached_manuscript.id)
                for chunk in chunks:
                    cached_ch = next((c for c in cached_chapters if c.chapter_id == chunk.chapter_id), None)
                    db.add(
                        Chapter(
                            manuscript_id=manuscript_id,
                            chapter_id=chunk.chapter_id,
                            title=chunk.title,
                            word_count=chunk.word_count,
                            text=chunk.text,
                            world_state_json=cached_ch.world_state_json if cached_ch else None,
                            characters_json=cached_ch.characters_json if cached_ch else None,
                            threads_json=cached_ch.threads_json if cached_ch else None,
                        )
                    )
                manuscript.characters_json = cached_manuscript.characters_json
                manuscript.contradictions_json = cached_manuscript.contradictions_json
                manuscript.threads_json = cached_manuscript.threads_json
                manuscript.arc_json = cached_manuscript.arc_json
                manuscript.status = "done"
                await db.commit()
                return

            # Save chunks to database
            for chunk in chunks:
                db.add(
                    Chapter(
                        manuscript_id=manuscript_id,
                        chapter_id=chunk.chapter_id,
                        title=chunk.title,
                        word_count=chunk.word_count,
                        text=chunk.text,
                    )
                )
            await db.commit()

            # Fetch them again to get database primary keys
            result = await db.execute(
                select(Chapter).where(Chapter.manuscript_id == manuscript_id).order_by(Chapter.id)
            )
            db_chapters = list(result.scalars().all())

            # Stage 2: extraction
            manuscript.status = "extracting"
            await db.commit()

            import sys
            is_mock = settings.mock_ai and (manuscript_id == "d54c0525-28c2-417e-9660-1ad9aa29bc54" or "pytest" in sys.modules)

            if is_mock:
                logger.info("Pipeline: Mocking Gemini response...")
                analysis_data = generate_mock_gemini_response(chunks)
            else:
                logger.info("Pipeline: Sending manuscript to Gemini API...")
                formatted_chapters = []
                for chunk in chunks:
                    formatted_chapters.append(
                        f"--- START OF {chunk.chapter_id} ({chunk.title}) ---\n"
                        f"{chunk.text}\n"
                        f"--- END OF {chunk.chapter_id} ---"
                    )
                manuscript_text = "\n\n".join(formatted_chapters)

                system_prompt = (
                    "You are a master story editor and continuity tracker. Analyze the provided manuscript. "
                    "Output a structured JSON object containing: world_state, contradictions, unresolved_threads, pacing_arc."
                )
                user_prompt = (
                    f"Below is the manuscript text split into sections/chapters:\n\n{manuscript_text}\n\n"
                    "Perform a single-pass deep structural analysis. Analyze every section/chapter chronologically.\n"
                    "Identify all characters, their statuses (alive, deceased, or absent) in each chapter, their relationships, "
                    "timeline/continuity contradictions (e.g. location status conflicts or character deaths/resurrections), "
                    "unresolved narrative threads, and chapter-by-chapter pacing tension scores.\n"
                    "Return the analysis strictly according to the specified JSON schema."
                )

                gemini_schema = {
                    "type": "OBJECT",
                    "properties": {
                        "characters": {
                            "type": "ARRAY",
                            "description": "List of characters extracted from the manuscript",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "id": {"type": "STRING", "description": "Unique ID for the character (e.g. char_001)"},
                                    "name": {"type": "STRING", "description": "Full name of the character"},
                                    "aliases": {
                                        "type": "ARRAY",
                                        "items": {"type": "STRING"},
                                        "description": "Other names or aliases the character goes by"
                                    },
                                    "first_appearance": {"type": "STRING", "description": "Chapter ID where the character first appears (e.g. chapter_01)"},
                                    "status_by_chapter": {
                                        "type": "ARRAY",
                                        "description": "Status of the character in each chapter",
                                        "items": {
                                            "type": "OBJECT",
                                            "properties": {
                                                "chapter_id": {"type": "STRING"},
                                                "status": {"type": "STRING", "description": "alive, deceased, or absent"}
                                            },
                                            "required": ["chapter_id", "status"]
                                        }
                                    },
                                    "relationships": {
                                        "type": "ARRAY",
                                        "description": "Relationships with other characters",
                                        "items": {
                                            "type": "OBJECT",
                                            "properties": {
                                                "target_id": {"type": "STRING", "description": "Character ID of the related character"},
                                                "type": {"type": "STRING", "description": "Type of relationship (e.g. friend, rival, sibling, ally)"},
                                                "sentiment": {"type": "STRING", "description": "friendly, hostile, or neutral"}
                                            },
                                            "required": ["target_id", "type", "sentiment"]
                                        }
                                    }
                                },
                                "required": ["id", "name", "aliases", "first_appearance", "status_by_chapter", "relationships"]
                            }
                        },
                        "contradictions": {
                            "type": "ARRAY",
                            "description": "Logical inconsistencies or timeline conflicts across chapters",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "id": {"type": "STRING", "description": "Unique flag ID (e.g. flag_001)"},
                                    "type": {"type": "STRING", "description": "Type of conflict (e.g. state_conflict)"},
                                    "entity": {"type": "STRING", "description": "Name of character or location involved"},
                                    "conflicting_chapters": {
                                        "type": "ARRAY",
                                        "items": {"type": "STRING"},
                                        "description": "List of chapter IDs that conflict (e.g. ['chapter_01', 'chapter_03'])"
                                    },
                                    "description": {"type": "STRING", "description": "Clear explanation of the contradiction"},
                                    "confidence": {"type": "NUMBER", "description": "Confidence score between 0.0 and 1.0"}
                                },
                                "required": ["id", "type", "entity", "conflicting_chapters", "description", "confidence"]
                            }
                        },
                        "unresolved_threads": {
                            "type": "ARRAY",
                            "description": "Unresolved narrative threads, Chekhov's guns, unanswered questions",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "id": {"type": "STRING", "description": "Unique thread ID (e.g. thread_001)"},
                                    "type": {"type": "STRING", "description": "chekhov_gun, promise, foreshadowing, or question"},
                                    "description": {"type": "STRING", "description": "Description of the thread or item"},
                                    "introduced_chapter": {"type": "STRING", "description": "Chapter ID where the thread is introduced (e.g. chapter_01)"},
                                    "resolved": {"type": "BOOLEAN", "description": "Whether the thread is resolved by the end of the manuscript"}
                                },
                                "required": ["id", "type", "description", "introduced_chapter", "resolved"]
                            }
                        },
                        "pacing_arc": {
                            "type": "ARRAY",
                            "description": "Chapter-by-chapter pacing and emotional arc data points",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "chapter_id": {"type": "STRING", "description": "Chapter ID (e.g. chapter_01)"},
                                    "tension_score": {"type": "NUMBER", "description": "Float tension score between 0.0 (calm) and 1.0 (climax)"},
                                    "sentiment": {"type": "STRING", "description": "positive, negative, or neutral"},
                                    "dominant_emotion": {"type": "STRING", "description": "fear, anger, joy, sadness, surprise, disgust, anticipation, or trust"}
                                },
                                "required": ["chapter_id", "tension_score", "sentiment", "dominant_emotion"]
                            }
                        },
                        "world_states": {
                            "type": "ARRAY",
                            "description": "Chapter-by-chapter world states, mapping chapter ID to locations, objects, and faction control status",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "chapter_id": {"type": "STRING"},
                                    "faction_control": {
                                        "type": "ARRAY",
                                        "description": "Status of location or faction control in this chapter",
                                        "items": {
                                            "type": "OBJECT",
                                            "properties": {
                                                "entity": {"type": "STRING", "description": "Name of location or faction"},
                                                "status": {"type": "STRING", "description": "active, destroyed, or other status description"}
                                            },
                                            "required": ["entity", "status"]
                                        }
                                    }
                                },
                                "required": ["chapter_id", "faction_control"]
                            }
                        }
                    },
                    "required": ["characters", "contradictions", "unresolved_threads", "pacing_arc", "world_states"]
                }

                from app.services import llm_client
                full_prompt = f"{system_prompt}\n\n{user_prompt}"

                raw_response = await asyncio.to_thread(
                    llm_client.generate_text,
                    prompt=full_prompt,
                    provider="gemini",
                    max_new_tokens=16384,
                    temperature=0.2,
                    response_schema=gemini_schema,
                    force_live=True
                )
                try:
                    cleaned_response = re.sub(r"```(?:json)?", "", raw_response).strip()
                    json_match = re.search(r"\{.*\}", cleaned_response, re.DOTALL)
                    if json_match:
                        analysis_data = json.loads(json_match.group(0))
                    else:
                        analysis_data = json.loads(cleaned_response)
                except Exception as e:
                    logger.error("Failed parsing Gemini JSON response. Raw response: %s", raw_response)
                    raise

            # Map the parsed/mock JSON results back into the DB fields

            # 1. Transform characters: status_by_chapter from list to dict
            transformed_characters = []
            for char in analysis_data.get("characters", []):
                status_dict = {}
                for item in char.get("status_by_chapter", []):
                    status_dict[item["chapter_id"]] = item["status"]
                
                transformed_characters.append({
                    "id": char["id"],
                    "name": char["name"],
                    "aliases": char.get("aliases", []),
                    "first_appearance": char["first_appearance"],
                    "status_by_chapter": status_dict,
                    "relationships": char.get("relationships", []),
                    "extracted_by": "gemini" if not is_mock else "stub"
                })

            # 2. Transform world states to map by chapter
            world_states_by_chapter = {}
            for ws in analysis_data.get("world_states", []):
                faction_dict = {}
                for fc in ws.get("faction_control", []):
                    faction_dict[fc["entity"]] = fc["status"]
                world_states_by_chapter[ws["chapter_id"]] = {
                    "faction_control": faction_dict
                }

            # 3. Transformed pacing_arc data points
            chapter_word_counts = {ch.chapter_id: ch.word_count for ch in chunks}
            transformed_arc = []
            arc_by_chapter = {}
            for point in analysis_data.get("pacing_arc", []):
                ch_id = point["chapter_id"]
                w_count = chapter_word_counts.get(ch_id, 0)
                point_data = {
                    "chapter_id": ch_id,
                    "tension_score": point["tension_score"],
                    "sentiment": point["sentiment"],
                    "dominant_emotion": point["dominant_emotion"],
                    "word_count": w_count
                }
                transformed_arc.append(point_data)
                arc_by_chapter[ch_id] = point_data

            # 4. Transformed unresolved threads
            transformed_threads = []
            for thread in analysis_data.get("unresolved_threads", []):
                transformed_threads.append({
                    "id": thread["id"],
                    "type": thread["type"],
                    "introduced_chapter": thread["introduced_chapter"],
                    "description": thread["description"],
                    "resolved": thread["resolved"]
                })

            # 5. Transformed contradictions
            transformed_contradictions = []
            for flag in analysis_data.get("contradictions", []):
                transformed_contradictions.append({
                    "id": flag["id"],
                    "type": flag["type"],
                    "entity": flag["entity"],
                    "conflicting_chapters": flag["conflicting_chapters"],
                    "description": flag["description"],
                    "confidence": flag["confidence"]
                })

            # 6. Cache state on individual chapters
            for ch in db_chapters:
                # Merge world state and emotional arc details
                ch_ws = world_states_by_chapter.get(ch.chapter_id, {"faction_control": {}})
                arc_point = arc_by_chapter.get(ch.chapter_id, {})
                if arc_point:
                    ch_ws["tension_score"] = arc_point["tension_score"]
                    ch_ws["sentiment"] = arc_point["sentiment"]
                    ch_ws["dominant_emotion"] = arc_point["dominant_emotion"]
                
                ch.set_world_state(ch_ws)

                # Save characters present in this chapter
                ch_chars = []
                for char in transformed_characters:
                    status = char["status_by_chapter"].get(ch.chapter_id, "absent")
                    if status != "absent":
                        ch_chars.append(char)
                ch.set_characters(ch_chars)

                # Save threads introduced in this chapter
                ch_threads = [t for t in transformed_threads if t["introduced_chapter"] == ch.chapter_id]
                ch.set_threads(ch_threads)

            # Persist results on the Manuscript
            manuscript.set_characters(transformed_characters)
            manuscript.set_contradictions(transformed_contradictions)
            manuscript.set_threads(transformed_threads)
            manuscript.set_arc(transformed_arc)
            manuscript.status = "done"
            await db.commit()

            logger.info(
                "Pipeline: manuscript %s completed via single-pass Gemini call (%d characters, %d contradictions, %d threads, %d arc points)",
                manuscript_id, len(transformed_characters), len(transformed_contradictions), len(transformed_threads), len(transformed_arc),
            )

        except Exception as exc:  # noqa: BLE001
            logger.exception("Pipeline: manuscript %s failed", manuscript_id)
            manuscript.status = "error"
            manuscript.error_message = str(exc)[:500]
            await db.commit()


async def _get_manuscript(db: AsyncSession, manuscript_id: str) -> Manuscript | None:
    from sqlalchemy import select

    result = await db.execute(
        select(Manuscript).where(Manuscript.id == manuscript_id)
    )
    return result.scalar_one_or_none()
