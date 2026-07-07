"""
Manuscript text parsing and chapter chunking.

Splitting strategy:
  1. Detect chapter headings with a regex covering common patterns:
       "Chapter 1", "Chapter One", "CHAPTER I", "CHAPTER 01", etc.
  2. If fewer than 2 headings are found, fall back to fixed-length chunks
     of ~FALLBACK_WORDS words.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from io import BytesIO

from docx import Document

FALLBACK_WORDS = 1500

_HEADING_RE = re.compile(
    r"^(?:chapter|ch\.?)\s+"          # "chapter" or "ch."
    r"(?:\d+|[ivxlcdm]+|[a-z]+)"      # Arabic, Roman, or English ordinal
    r"(?:\s*[:\-–—]?\s*.{0,60})?$",   # optional title after separator
    re.IGNORECASE | re.MULTILINE,
)


@dataclass
class ChapterChunk:
    chapter_id: str
    title: str
    word_count: int
    text: str


def parse_text(file_bytes: bytes, filename: str) -> str:
    """Return plain text from a .txt or .docx upload."""
    if filename.lower().endswith(".docx"):
        doc = Document(BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs)
    # Default: treat as UTF-8 text (fall back to latin-1 for legacy files)
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return file_bytes.decode("latin-1")


def split_into_chapters(text: str) -> list[ChapterChunk]:
    """Split *text* into ChapterChunk objects."""
    matches = list(_HEADING_RE.finditer(text))

    if len(matches) >= 2:
        return _split_by_headings(text, matches)
    return _split_by_word_count(text)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _split_by_headings(text: str, matches: list[re.Match]) -> list[ChapterChunk]:
    chunks: list[ChapterChunk] = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        title = match.group(0).strip().splitlines()[0]
        chunks.append(
            ChapterChunk(
                chapter_id=f"chapter_{i + 1:02d}",
                title=title,
                word_count=len(body.split()),
                text=body,
            )
        )
    return chunks


def _split_by_word_count(text: str) -> list[ChapterChunk]:
    words = text.split()
    chunks: list[ChapterChunk] = []
    idx = 0
    chunk_num = 1
    while idx < len(words):
        slice_words = words[idx : idx + FALLBACK_WORDS]
        body = " ".join(slice_words)
        chunks.append(
            ChapterChunk(
                chapter_id=f"chapter_{chunk_num:02d}",
                title=f"Scene {chunk_num}",
                word_count=len(slice_words),
                text=body,
            )
        )
        idx += FALLBACK_WORDS
        chunk_num += 1
    return chunks
