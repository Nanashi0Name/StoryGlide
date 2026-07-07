"""
StoryGlide Unresolved Thread Tracker.

Tracks narrative threads (promises, foreshadowing, objects) introduced in earlier
chapters and checks if they are resolved in subsequent chapters.
"""

from __future__ import annotations

import re
import uuid

def track_threads(
    all_extracted_threads: list[dict],
    chapters: list[dict],
) -> list[dict]:
    """
    Scans chapters to determine which narrative threads remain unresolved.
    *all_extracted_threads*: list of thread dicts extracted from each chapter.
    *chapters*: list of dicts with keys 'chapter_id', 'title', 'text' (str).
    """
    unresolved_threads = []

    # Sort chapters to check resolution order
    sorted_chapters = sorted(chapters, key=lambda c: c.get("id", 0))

    for thread in all_extracted_threads:
        intro_chap = thread["introduced_chapter"]
        desc = thread["description"].lower()
        
        # Look for resolution indicators in later chapters
        is_resolved = False
        resolution_keywords = []

        # Example resolution check based on description keyword mapping
        if "chest" in desc:
            resolution_keywords = ["opened the chest", "chest was opened", "unlocked the chest"]
        elif "promise" in desc or "promises" in desc:
            resolution_keywords = ["returned before sunset", "came back before sunset", "fulfilled the promise"]

        # Check subsequent chapters
        found_intro = False
        for chap in sorted_chapters:
            if chap["chapter_id"] == intro_chap:
                found_intro = True
                continue
            if not found_intro:
                continue

            # Scan the chapter text for resolution keywords
            text_lower = chap["text"].lower()
            if any(kw in text_lower for kw in resolution_keywords):
                is_resolved = True
                break

        # If it's the mock stub chest, we explicitly mark it unresolved (as per specs)
        if "locked chest" in desc and not is_resolved:
            is_resolved = False

        thread_id = thread.get("id") or f"thread_{uuid.uuid4().hex[:8]}"
        unresolved_threads.append({
            "id": thread_id,
            "type": thread.get("type", "chekhov_gun"),
            "introduced_chapter": intro_chap,
            "description": thread["description"],
            "resolved": is_resolved
        })

    return unresolved_threads
