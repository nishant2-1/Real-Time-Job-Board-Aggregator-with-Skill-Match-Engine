from datetime import UTC, datetime
import zipfile
from io import BytesIO

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.job_match import JobMatch
from app.models.resume import Resume
from app.models.user import User
from app.schemas.resume import ResumeDeleteResponse, ResumeMeResponse, ResumeUploadResponse
from app.services.matcher import SkillMatcher
from app.services.resume_parser import ResumeParser
from app.tasks.match_tasks import recompute_matches_for_user


router = APIRouter(prefix="/resume", tags=["resume"])


def _detect_file_type(content: bytes) -> str:
    if content.startswith(b"%PDF-"):
        return "pdf"
    if content.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(BytesIO(content)) as archive:
                if "word/document.xml" in archive.namelist():
                    return "docx"
        except zipfile.BadZipFile:
            pass
    raise ValueError("Unsupported file type; only PDF and DOCX are allowed")


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeUploadResponse:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")

    content = await file.read()
    if len(content) > settings.max_resume_upload_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 5MB limit")

    try:
        file_type = _detect_file_type(content)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    parser = ResumeParser()
    try:
        parsed = parser.parse(content, file_type=file_type)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    SkillMatcher().invalidate_user_cache(str(user.id))

    resume = Resume(
        user_id=user.id,
        file_type=parsed.file_type,
        original_filename=file.filename,
        extracted_text=parsed.extracted_text,
        parsed_skills=parsed.skills,
        parsed_job_titles=parsed.job_titles,
        years_experience=parsed.years_experience,
        education_level=parsed.education_level,
        uploaded_at=datetime.now(tz=UTC),
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    recompute_matches_for_user.delay(str(user.id))

    return ResumeUploadResponse(
        resume_id=resume.id,
        skills=resume.parsed_skills,
        job_titles=resume.parsed_job_titles,
        years_experience=resume.years_experience,
        education_level=resume.education_level,
        uploaded_at=resume.uploaded_at,
    )


@router.get("/me", response_model=ResumeMeResponse)
def get_latest_resume(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ResumeMeResponse:
    resume = (
        db.query(Resume)
        .filter(Resume.user_id == user.id)
        .order_by(Resume.uploaded_at.desc())
        .first()
    )
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    return ResumeMeResponse(
        resume_id=resume.id,
        skills=resume.parsed_skills,
        job_titles=resume.parsed_job_titles,
        years_experience=resume.years_experience,
        education_level=resume.education_level,
        uploaded_at=resume.uploaded_at,
        original_filename=resume.original_filename,
        file_type=resume.file_type,
    )


@router.delete("/me", response_model=ResumeDeleteResponse)
def delete_latest_resume(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ResumeDeleteResponse:
    resume = (
        db.query(Resume)
        .filter(Resume.user_id == user.id)
        .order_by(Resume.uploaded_at.desc())
        .first()
    )
    if resume is None:
        return ResumeDeleteResponse(deleted=False)

    db.delete(resume)
    db.query(JobMatch).filter(JobMatch.user_id == user.id).delete(synchronize_session=False)
    db.commit()
    SkillMatcher().invalidate_user_cache(str(user.id))
    return ResumeDeleteResponse(deleted=True)
