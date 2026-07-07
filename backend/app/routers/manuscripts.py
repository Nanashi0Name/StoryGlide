from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.manuscript import Manuscript
from app.services import extraction_pipeline

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
