"""
Extraction pipeline.

Orchestrates: chapter chunking locally → single-pass structured Gemini call → persist to SQLite.
Bypasses manual intermediate extraction steps.

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


def generate_mock_gemini_response(chapters: list[chunker_svc.ChapterChunk], manuscript_id: str = None) -> dict:
    """Generate dynamic mock data mirroring the Gemini JSON schema format."""
    chapter_ids = [ch.chapter_id for ch in chapters]
    
    # Generate character statuses
    char_statuses = []
    for ch_id in chapter_ids:
        char_statuses.append({"chapter_id": ch_id, "status": "alive"})
        
    characters = [
        {
            "id": "char_001",
            "name": "Sherlock Holmes",
            "aliases": ["Holmes", "Mr. Sherlock Holmes"],
            "first_appearance": chapter_ids[0] if chapter_ids else "chapter_01",
            "status_by_chapter": char_statuses,
            "relationships": [
                {"target_id": "char_002", "type": "friend", "sentiment": "friendly"},
                {"target_id": "char_004", "type": "enemy", "sentiment": "hostile"}
            ]
        },
        {
            "id": "char_002",
            "name": "Dr. John Watson",
            "aliases": ["Watson", "Dr. Watson"],
            "first_appearance": chapter_ids[0] if chapter_ids else "chapter_01",
            "status_by_chapter": char_statuses,
            "relationships": [
                {"target_id": "char_001", "type": "friend", "sentiment": "friendly"}
            ]
        },
        {
            "id": "char_003",
            "name": "Helen Stoner",
            "aliases": ["Helen", "Miss Stoner"],
            "first_appearance": chapter_ids[0] if chapter_ids else "chapter_01",
            "status_by_chapter": char_statuses,
            "relationships": [
                {"target_id": "char_004", "type": "stepfather", "sentiment": "hostile"},
                {"target_id": "char_001", "type": "client", "sentiment": "friendly"}
            ]
        },
        {
            "id": "char_004",
            "name": "Dr. Grimesby Roylott",
            "aliases": ["Dr. Roylott", "Roylott", "Grimesby"],
            "first_appearance": chapter_ids[0] if chapter_ids else "chapter_01",
            "status_by_chapter": char_statuses,
            "relationships": [
                {"target_id": "char_001", "type": "enemy", "sentiment": "hostile"},
                {"target_id": "char_003", "type": "stepdaughter", "sentiment": "hostile"}
            ]
        }
    ]
    
    # Contradictions
    contradictions = []
    if len(chapter_ids) >= 3:
        contradictions.append({
            "id": "flag_001",
            "type": "state_conflict",
            "entity": "Dr. Grimesby Roylott",
            "conflicting_chapters": [chapter_ids[1], chapter_ids[2]],
            "description": "Dr. Grimesby Roylott is reported to be sleeping at Stoke Moran in Scene 2, but a witness testimony places him in London at the exact same hour in Scene 3.",
            "confidence": 0.95,
            "evidence": [
                {
                    "chapter_id": chapter_ids[1],
                    "quote": "Roylott retired early, claiming he would sleep soundly through the night at Stoke Moran.",
                    "context": "At nine o'clock, Dr. Grimesby Roylott retired early, claiming he would sleep soundly through the night at Stoke Moran. The manor was quiet, save for the wind."
                },
                {
                    "chapter_id": chapter_ids[2],
                    "quote": "Mr. Roylott was seen under the gas lamp in London at eleven that evening.",
                    "context": "A reliable witness swore that Mr. Roylott was seen under the gas lamp in London at eleven that evening, far from his country estate."
                }
            ]
        })
        
    # Unresolved threads
    unresolved_threads = [
        {
            "id": "thread_001",
            "type": "chekhov_gun",
            "introduced_chapter": chapter_ids[0] if chapter_ids else "chapter_01",
            "description": "A low whistle heard by Helen's sister right before she died.",
            "resolved": False,
            "evidence": {
                "chapter_id": chapter_ids[0] if chapter_ids else "chapter_01",
                "quote": "Suddenly, in the dead of the night, she heard a low, clear whistle.",
                "context": "It was three in the morning when the event occurred. Suddenly, in the dead of the night, she heard a low, clear whistle, though no one was near."
            }
        },
        {
            "id": "thread_002",
            "type": "question",
            "introduced_chapter": chapter_ids[1] if len(chapter_ids) > 1 else "chapter_01",
            "description": "Why was the ventilator installed between two rooms instead of to the outside?",
            "resolved": False,
            "evidence": {
                "chapter_id": chapter_ids[1] if len(chapter_ids) > 1 else "chapter_01",
                "quote": "The ventilator does not open to the outer air, but into the next room.",
                "context": "Holmes examined the wall closely. The ventilator does not open to the outer air, but into the next room, a most singular arrangement."
            }
        }
    ]
    
    # World states
    world_states = []
    for i, ch_id in enumerate(chapter_ids):
        status = "destroyed" if i == 1 else "active"
        world_states.append({
            "chapter_id": ch_id,
            "faction_control": [{"entity": "Stoke Moran Manor", "status": status}]
        })
        
    return {
        "characters": characters,
        "contradictions": contradictions,
        "unresolved_threads": unresolved_threads,
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
                analysis_data = generate_mock_gemini_response(chunks, manuscript_id=manuscript_id)
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
                    "Output a structured JSON object containing: world_state, contradictions, unresolved_threads."
                )
                user_prompt = (
                    f"Below is the manuscript text split into sections/chapters:\n\n{manuscript_text}\n\n"
                    "Perform a single-pass deep structural analysis. Analyze every section/chapter chronologically.\n"
                    "Identify all characters, their statuses (alive, deceased, or absent) in each chapter, their relationships, "
                    "timeline/continuity contradictions (e.g. location status conflicts or character deaths/resurrections), "
                    "and unresolved narrative threads.\n"
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
                                    "confidence": {"type": "NUMBER", "description": "Confidence score between 0.0 and 1.0"},
                                    "evidence": {
                                        "type": "ARRAY",
                                        "description": "List of evidence/citations corresponding to each of the conflicting chapters",
                                        "items": {
                                            "type": "OBJECT",
                                            "properties": {
                                                "chapter_id": {"type": "STRING", "description": "The chapter ID where this evidence is located"},
                                                "quote": {"type": "STRING", "description": "The exact specific sentence/s where this information was found in the chapter"},
                                                "context": {"type": "STRING", "description": "The surrounding paragraph or immediate context around the quote"}
                                            },
                                            "required": ["chapter_id", "quote", "context"]
                                        }
                                    }
                                },
                                "required": ["id", "type", "entity", "conflicting_chapters", "description", "confidence", "evidence"]
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
                                    "resolved": {"type": "BOOLEAN", "description": "Whether the thread is resolved by the end of the manuscript"},
                                    "evidence": {
                                        "type": "OBJECT",
                                        "description": "Evidence showing where the thread was introduced",
                                        "properties": {
                                            "chapter_id": {"type": "STRING", "description": "The chapter ID where the thread was introduced"},
                                            "quote": {"type": "STRING", "description": "The exact specific sentence/s where this thread was introduced in the chapter"},
                                            "context": {"type": "STRING", "description": "The surrounding paragraph or immediate context around the quote"}
                                        },
                                        "required": ["chapter_id", "quote", "context"]
                                    }
                                },
                                "required": ["id", "type", "description", "introduced_chapter", "resolved", "evidence"]
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
                    "required": ["characters", "contradictions", "unresolved_threads", "world_states"]
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

            # 4. Transformed unresolved threads
            transformed_threads = []
            for thread in analysis_data.get("unresolved_threads", []):
                thread_item = {
                    "id": thread["id"],
                    "type": thread["type"],
                    "introduced_chapter": thread["introduced_chapter"],
                    "description": thread["description"],
                    "resolved": thread["resolved"]
                }
                if "evidence" in thread:
                    thread_item["evidence"] = thread["evidence"]
                transformed_threads.append(thread_item)

            # 5. Transformed contradictions
            transformed_contradictions = []
            for flag in analysis_data.get("contradictions", []):
                contradiction_item = {
                    "id": flag["id"],
                    "type": flag["type"],
                    "entity": flag["entity"],
                    "conflicting_chapters": flag["conflicting_chapters"],
                    "description": flag["description"],
                    "confidence": flag["confidence"]
                }
                if "evidence" in flag:
                    contradiction_item["evidence"] = flag["evidence"]
                transformed_contradictions.append(contradiction_item)

            # 6. Cache state on individual chapters
            for ch in db_chapters:
                # Merge world state details
                ch_ws = world_states_by_chapter.get(ch.chapter_id, {"faction_control": {}})
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
            manuscript.status = "done"
            await db.commit()

            logger.info(
                "Pipeline: manuscript %s completed via single-pass Gemini call (%d characters, %d contradictions, %d threads)",
                manuscript_id, len(transformed_characters), len(transformed_contradictions), len(transformed_threads),
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
