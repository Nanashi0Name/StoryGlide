from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.manuscript import Chapter, Manuscript
from app.services import extraction_pipeline
from app.services.whatif_generator import WhatIfRequest, run_whatif

router = APIRouter(tags=["manuscripts"])

_ALLOWED_CONTENT_TYPES = {
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",  # some browsers send this for .docx
}
_ALLOWED_EXTENSIONS = {".txt", ".docx"}


def _validate_file(file: UploadFile) -> None:
    import os

    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '{ext}'. Use .txt or .docx.",
        )


@router.post("/manuscripts", status_code=202)
async def upload_manuscript(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Upload a manuscript. Returns a manuscript_id immediately; processing runs in the background."""
    _validate_file(file)

    file_bytes = await file.read()

    manuscript = Manuscript(filename=file.filename or "upload", status="processing")
    db.add(manuscript)
    await db.commit()
    await db.refresh(manuscript)

    background_tasks.add_task(
        extraction_pipeline.run,
        manuscript_id=manuscript.id,
        file_bytes=file_bytes,
        filename=manuscript.filename,
    )

    return {"manuscript_id": manuscript.id, "status": manuscript.status}


@router.get("/manuscripts/{manuscript_id}/status")
async def get_status(
    manuscript_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Poll the processing status of a manuscript."""
    manuscript = await _fetch_or_404(db, manuscript_id)
    payload = {"manuscript_id": manuscript.id, "status": manuscript.status}
    if manuscript.status == "error":
        payload["error"] = manuscript.error_message
    return payload


@router.get("/manuscripts/{manuscript_id}/characters")
async def get_characters(
    manuscript_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return the extracted character list (available when status is 'done')."""
    manuscript = await _fetch_or_404(db, manuscript_id)
    if manuscript.status != "done":
        raise HTTPException(
            status_code=202,
            detail=f"Processing not complete yet. Current status: {manuscript.status}",
        )
    return {"manuscript_id": manuscript.id, "characters": manuscript.get_characters()}


@router.get("/manuscripts/{manuscript_id}/contradictions")
async def get_contradictions(
    manuscript_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return the contradiction flags (available when status is 'done')."""
    manuscript = await _fetch_or_404(db, manuscript_id)
    if manuscript.status != "done":
        raise HTTPException(
            status_code=202,
            detail=f"Processing not complete yet. Current status: {manuscript.status}",
        )
    return {"manuscript_id": manuscript.id, "contradictions": manuscript.get_contradictions()}


@router.get("/manuscripts/{manuscript_id}/threads")
async def get_threads(
    manuscript_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return the unresolved thread list (available when status is 'done')."""
    manuscript = await _fetch_or_404(db, manuscript_id)
    if manuscript.status != "done":
        raise HTTPException(
            status_code=202,
            detail=f"Processing not complete yet. Current status: {manuscript.status}",
        )
    return {"manuscript_id": manuscript.id, "threads": manuscript.get_threads()}


@router.get("/manuscripts/{manuscript_id}/arc")
async def get_arc(
    manuscript_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return emotional arc data points (available when status is 'done')."""
    manuscript = await _fetch_or_404(db, manuscript_id)
    if manuscript.status != "done":
        raise HTTPException(
            status_code=202,
            detail=f"Processing not complete yet. Current status: {manuscript.status}",
        )
    return {"manuscript_id": manuscript.id, "arc": manuscript.get_arc()}


@router.get("/manuscripts/{manuscript_id}/dashboard")
async def get_dashboard(
    manuscript_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return all analysis data in a single aggregated payload (available when status is 'done')."""
    manuscript = await _fetch_or_404(db, manuscript_id)
    if manuscript.status != "done":
        raise HTTPException(
            status_code=202,
            detail=f"Processing not complete yet. Current status: {manuscript.status}",
        )
    return {
        "manuscript_id": manuscript.id,
        "characters": manuscript.get_characters(),
        "contradictions": manuscript.get_contradictions(),
        "threads": manuscript.get_threads(),
        "arc": manuscript.get_arc(),
    }


@router.post("/manuscripts/{manuscript_id}/whatif")
async def run_whatif_endpoint(
    manuscript_id: str,
    body: WhatIfRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run a what-if exploration scenario."""
    manuscript = await _fetch_or_404(db, manuscript_id)
    if manuscript.status != "done":
        raise HTTPException(
            status_code=202,
            detail=f"Processing not complete yet. Current status: {manuscript.status}",
        )

    # Load chapters and characters from DB
    result = await db.execute(
        select(Chapter).where(Chapter.manuscript_id == manuscript_id)
    )
    db_chapters = list(result.scalars().all())
    db_chapters = sorted(db_chapters, key=lambda c: c.id)

    chapters = [
        {
            "chapter_id": ch.chapter_id,
            "text": ch.text,
            "word_count": ch.word_count,
            "world_state": ch.get_world_state(),
        }
        for ch in db_chapters
    ]

    response = run_whatif(
        manuscript_id=manuscript_id,
        request=body,
        chapters=chapters,
        characters=manuscript.get_characters(),
    )
    return response.model_dump()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

async def _fetch_or_404(db: AsyncSession, manuscript_id: str) -> Manuscript:
    result = await db.execute(
        select(Manuscript).where(Manuscript.id == manuscript_id)
    )
    manuscript = result.scalar_one_or_none()
    if manuscript is None:
        raise HTTPException(status_code=404, detail="Manuscript not found.")
    return manuscript
