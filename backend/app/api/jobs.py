from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.job import Job
from app.models.job_match import JobMatch
from app.models.saved_job import SavedJob
from app.models.user import User
from app.schemas.jobs import JobDetailResponse, JobListItem, JobListResponse, JobSaveToggleResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])

DIRECT_SOURCES = {"greenhouse", "lever"}

VISA_POSITIVE_PATTERNS = [
    "visa sponsorship",
    "visa sponsor",
    "visa support",
    "sponsorship available",
    "sponsor visa",
    "sponsor",
    "sponsorship",
    "immigration support",
    "immigration",
    "relocation support",
    "relocation assistance",
    "relocation package",
    "relocation",
    "work permit",
    "work authorization sponsorship",
    "work authorization",
    "h-1b",
    "h1b",
    "global mobility",
]

VISA_NEGATIVE_PATTERNS = [
    "no visa sponsorship",
    "do not sponsor",
    "cannot sponsor",
    "unable to sponsor",
    "without sponsorship",
    "must have existing work authorization",
    "not provide visa sponsorship",
]


def _combined_job_text(job: Job) -> str:
    return " ".join(
        filter(
            None,
            [
                job.title,
                job.company,
                job.location,
                job.description_clean,
                job.description_raw,
                " ".join(job.tags or []),
            ],
        )
    ).lower()


def _supports_visa_sponsorship(job: Job) -> bool:
    text = _combined_job_text(job)
    if any(pattern in text for pattern in VISA_NEGATIVE_PATTERNS):
        return False
    return sum(1 for pattern in VISA_POSITIVE_PATTERNS if pattern in text) > 0


def _visa_filter_clause():
    searchable_columns = [
        Job.title,
        Job.company,
        Job.location,
        Job.description_clean,
        Job.description_raw,
    ]
    return or_(
        *[
            column.ilike(f"%{pattern}%")
            for pattern in VISA_POSITIVE_PATTERNS
            for column in searchable_columns
        ]
    )


def _is_direct_source(source: str | None) -> bool:
    return (source or "").lower() in DIRECT_SOURCES


@router.get("", response_model=JobListResponse)
def list_jobs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="match_score"),
    search: str | None = Query(default=None, alias="query"),
    remote: bool | None = Query(default=None),
    direct_only: bool | None = Query(default=None),
    visa_sponsorship: bool | None = Query(default=None),
    min_salary: float | None = Query(default=None, ge=0),
    min_match: int | None = Query(default=None, ge=0, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobListResponse:
    query = (
        db.query(Job, JobMatch)
        .outerjoin(
            JobMatch,
            and_(JobMatch.job_id == Job.id, JobMatch.user_id == user.id),
        )
    )

    if remote:
        query = query.filter(Job.is_remote.is_(True))
    if direct_only:
        query = query.filter(Job.source.in_(DIRECT_SOURCES))
    if search:
        like_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Job.title.ilike(like_term),
                Job.company.ilike(like_term),
                Job.location.ilike(like_term),
                Job.description_clean.ilike(like_term),
            )
        )
    if visa_sponsorship:
        query = query.filter(_visa_filter_clause())
    if min_salary is not None:
        query = query.filter(Job.salary_max.is_not(None), Job.salary_max >= min_salary)
    if min_match is not None:
        query = query.filter(func.coalesce(JobMatch.match_pct, 0) >= min_match)

    if sort == "date":
        query = query.order_by(Job.posted_at.desc())
    elif sort == "salary":
        query = query.order_by(func.coalesce(Job.salary_max, Job.salary_min, 0).desc(), Job.posted_at.desc())
    else:
        query = query.order_by(func.coalesce(JobMatch.match_pct, 0).desc(), Job.posted_at.desc())

    total_count = query.order_by(None).with_entities(func.count(Job.id)).scalar() or 0
    rows = query.offset((page - 1) * limit).limit(limit).all()
    pages = max(1, (total_count + limit - 1) // limit)

    jobs_payload: list[JobListItem] = []
    for job, job_match in rows:
        jobs_payload.append(
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
                match_pct=int(job_match.match_pct) if job_match else 0,
                matched_skills=job_match.matched_skills if job_match else [],
                missing_skills=job_match.missing_skills if job_match else [],
                top_keywords=job_match.top_keywords if job_match else [],
                posted_at=job.posted_at,
                source=job.source,
                url=job.url,
                description_clean=job.description_clean,
                tags=job.tags,
                is_direct_source=_is_direct_source(job.source),
                visa_sponsorship=_supports_visa_sponsorship(job),
            )
        )

    return JobListResponse(
        jobs=jobs_payload,
        total=total_count,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job(job_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> JobDetailResponse:
    job = db.query(Job).filter(Job.id == job_id).one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job_match = (
        db.query(JobMatch)
        .filter(JobMatch.user_id == user.id, JobMatch.job_id == job.id)
        .one_or_none()
    )

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
        match_pct=int(job_match.match_pct) if job_match else 0,
        matched_skills=job_match.matched_skills if job_match else [],
        missing_skills=job_match.missing_skills if job_match else [],
        top_keywords=job_match.top_keywords if job_match else [],
        posted_at=job.posted_at,
        source=job.source,
        url=job.url,
        description_raw=job.description_raw,
        description_clean=job.description_clean,
        tags=job.tags,
        is_direct_source=_is_direct_source(job.source),
        visa_sponsorship=_supports_visa_sponsorship(job),
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
