from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.job import Job
from app.models.resume import Resume
from app.models.saved_job import SavedJob
from app.models.user import User
from app.schemas.jobs import JobDetailResponse, JobListItem, JobListResponse, JobSaveToggleResponse
from app.schemas.common import PaginatedMeta
from app.services.matcher_service import MatcherService


router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=JobListResponse)
def list_jobs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="match_score"),
    filter: str | None = Query(default=None),
    location: str | None = Query(default=None),
    min_salary: float | None = Query(default=None, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobListResponse:
    query = db.query(Job)

    if filter == "remote":
        query = query.filter(Job.is_remote.is_(True))
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if min_salary is not None:
        query = query.filter(Job.salary_max.is_not(None), Job.salary_max >= min_salary)

    if sort == "posted_at":
        query = query.order_by(Job.posted_at.desc())
    elif sort == "company":
        query = query.order_by(Job.company.asc())
    else:
        query = query.order_by(Job.match_score.desc().nullslast(), Job.posted_at.desc())

    total_count = query.with_entities(func.count(Job.id)).scalar() or 0
    jobs = query.offset((page - 1) * limit).limit(limit).all()

    latest_resume = (
        db.query(Resume)
        .filter(Resume.user_id == user.id)
        .order_by(Resume.uploaded_at.desc())
        .first()
    )
    matcher = MatcherService()

    data: list[JobListItem] = []
    for job in jobs:
        if latest_resume:
            match = matcher.compute(latest_resume, job)
            job.match_score = match.score
            job.top_matched_skills = match.top_matched_skills
            job.missing_skills = match.missing_skills
        data.append(
            JobListItem(
                id=job.id,
                title=job.title,
                company=job.company,
                company_logo_url=job.company_logo_url,
                location=job.location,
                is_remote=job.is_remote,
                salary_min=job.salary_min,
                salary_max=job.salary_max,
                salary_currency=job.salary_currency,
                match_score=job.match_score,
                top_matched_skills=job.top_matched_skills,
                missing_skills=job.missing_skills,
                posted_at=job.posted_at,
            )
        )

    db.commit()

    return JobListResponse(
        data=data,
        pagination=PaginatedMeta(total_count=total_count, page=page, limit=limit),
    )


@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job(job_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> JobDetailResponse:
    job = db.query(Job).filter(Job.id == job_id).one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    latest_resume = (
        db.query(Resume)
        .filter(Resume.user_id == user.id)
        .order_by(Resume.uploaded_at.desc())
        .first()
    )
    if latest_resume:
        match = MatcherService().compute(latest_resume, job)
        job.match_score = match.score
        job.top_matched_skills = match.top_matched_skills
        job.missing_skills = match.missing_skills
        db.commit()

    return JobDetailResponse(
        id=job.id,
        title=job.title,
        company=job.company,
        company_logo_url=job.company_logo_url,
        location=job.location,
        is_remote=job.is_remote,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        salary_currency=job.salary_currency,
        match_score=job.match_score,
        top_matched_skills=job.top_matched_skills,
        missing_skills=job.missing_skills,
        posted_at=job.posted_at,
        source=job.source,
        url=job.url,
        description_raw=job.description_raw,
        description_clean=job.description_clean,
        tags=job.tags,
    )


@router.post("/{job_id}/save", response_model=JobSaveToggleResponse)
def toggle_save_job(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobSaveToggleResponse:
    job = db.query(Job).filter(Job.id == job_id).one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    existing = db.query(SavedJob).filter(SavedJob.user_id == user.id, SavedJob.job_id == job.id).one_or_none()
    if existing:
        db.delete(existing)
        db.commit()
        return JobSaveToggleResponse(job_id=job.id, saved=False)

    from datetime import UTC, datetime

    db.add(SavedJob(user_id=user.id, job_id=job.id, saved_at=datetime.now(tz=UTC)))
    db.commit()
    return JobSaveToggleResponse(job_id=job.id, saved=True)
