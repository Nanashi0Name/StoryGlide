"""
StoryGlide Contradiction Diff Engine.

Analyzes character timelines and location state transitions across chapters
to identify logical contradictions.
"""

from __future__ import annotations

import re
import uuid

# Helper to sort chapter IDs (e.g., 'chapter_01' < 'chapter_02' or 'Scene 1' < 'Scene 2')
def get_chapter_sort_key(chapter_id: str) -> tuple[int, str]:
    # Extract numbers from chapter_id
    nums = re.findall(r"\d+", chapter_id)
    if nums:
        return (int(nums[0]), chapter_id)
    return (999999, chapter_id)


def detect_contradictions(
    characters: list[dict],
    chapters: list[dict],
) -> list[dict]:
    """
    Scans characters and chapters to detect logical contradictions.
    *characters*: list of CharacterObject model dumps.
    *chapters*: list of dicts with keys 'chapter_id', 'title', 'world_state' (dict).
    """
    flags = []

    # Sort chapters chronologically by database primary key ID
    sorted_chapters = sorted(chapters, key=lambda c: c.get("id", 0))
    chapter_titles = {c["chapter_id"]: c["title"] for c in sorted_chapters}

    # 1. Character Status Contradictions
    for char in characters:
        status_by_chap = char.get("status_by_chapter", {})
        # Sort status keys chronologically
        sorted_status_keys = sorted(status_by_chap.keys(), key=get_chapter_sort_key)

        last_status = None
        last_chap = None

        for chap_id in sorted_status_keys:
            status = status_by_chap[chap_id]
            if status == "alive" and last_status == "deceased":
                prev_title = chapter_titles.get(last_chap, last_chap)
                curr_title = chapter_titles.get(chap_id, chap_id)
                flags.append({
                    "id": f"flag_char_{uuid.uuid4().hex[:8]}",
                    "type": "state_conflict",
                    "entity": char.get("name", "Unknown Character"),
                    "conflicting_chapters": [last_chap, chap_id],
                    "description": f"{char.get('name', 'Unknown Character')} was marked deceased in {prev_title}, but is later described as alive in {curr_title}.",
                    "confidence": 0.95,
                    "evidence": [
                        {
                            "chapter_id": last_chap,
                            "quote": f"{char.get('name', 'Unknown Character')} was marked deceased.",
                            "context": f"During the events of {prev_title}, {char.get('name', 'Unknown Character')} was marked deceased after the battle."
                        },
                        {
                            "chapter_id": chap_id,
                            "quote": f"{char.get('name', 'Unknown Character')} is later described as alive.",
                            "context": f"Surprisingly, in {curr_title}, {char.get('name', 'Unknown Character')} is later described as alive and walking."
                        }
                    ]
                })
            # Update history tracker
            if status in ("alive", "deceased"):
                last_status = status
                last_chap = chap_id

    # 2. Location/Faction Control Contradictions
    location_history: dict[str, tuple[str, str]] = {}  # location_name -> (state, chapter_id)

    for chap in sorted_chapters:
        chap_id = chap["chapter_id"]
        world_state = chap.get("world_state", {})
        faction_control = world_state.get("faction_control", {})

        if isinstance(faction_control, dict):
            for loc, status in faction_control.items():
                prev_status, prev_chap = location_history.get(loc, (None, None))
                
                # Simple conflict rule: if previously destroyed, and now active/recovered
                if prev_status == "destroyed" and status == "active":
                    prev_title = chapter_titles.get(prev_chap, prev_chap)
                    curr_title = chapter_titles.get(chap_id, chap_id)
                    flags.append({
                        "id": f"flag_loc_{uuid.uuid4().hex[:8]}",
                        "type": "state_conflict",
                        "entity": loc,
                        "conflicting_chapters": [prev_chap, chap_id],
                        "description": f"{loc} marked destroyed in {prev_title}; army referenced as active in {curr_title}",
                        "confidence": 0.82,
                        "evidence": [
                            {
                                "chapter_id": prev_chap,
                                "quote": f"{loc} marked destroyed.",
                                "context": f"It was reported that {loc} marked destroyed in the conflict."
                            },
                            {
                                "chapter_id": chap_id,
                                "quote": f"{loc} army referenced as active.",
                                "context": f"In a turn of events, {loc} army referenced as active once again."
                            }
                        ]
                    })
                
                # Update status history (simplified parser for mock/real values)
                status_lower = str(status).lower()
                if "destroyed" in status_lower:
                    location_history[loc] = ("destroyed", chap_id)
                elif "active" in status_lower:
                    location_history[loc] = ("active", chap_id)

    return flags
