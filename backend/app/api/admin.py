from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.config import settings
from app.core.database import get_db
from app.models.job import Job
from app.models.resume import Resume
from app.models.saved_job import SavedJob
from app.models.scraper_run import ScraperRun
from app.models.user import User
from app.schemas.admin import (
    AdminCountsResponse,
    AdminJobSummary,
    AdminOverviewResponse,
    AdminScraperRunSummary,
    AdminStorageResponse,
    AdminUserSummary,
)

router = APIRouter(prefix="/admin", tags=["admin"])

DIRECT_SOURCES = {"greenhouse", "lever"}


def _count(query) -> int:
    return int(query.scalar() or 0)


@router.get("/overview", response_model=AdminOverviewResponse)
def admin_overview(_: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> AdminOverviewResponse:
    counts = AdminCountsResponse(
        users=_count(db.query(func.count(User.id))),
        resumes=_count(db.query(func.count(Resume.id))),
        jobs=_count(db.query(func.count(Job.id))),
        saved_jobs=_count(db.query(func.count(SavedJob.id))),
        scraper_runs=_count(db.query(func.count(ScraperRun.id))),
        direct_jobs=_count(db.query(func.count(Job.id)).filter(Job.source.in_(DIRECT_SOURCES))),
    )

    storage = AdminStorageResponse(
        app_env=settings.app_env,
        app_version=settings.app_version,
        postgres_host=settings.postgres_host,
        postgres_port=settings.postgres_port,
        postgres_db=settings.postgres_db,
        redis_host=settings.redis_host,
        redis_port=settings.redis_port,
        redis_db=settings.redis_db,
        scrape_interval_minutes=settings.scrape_interval_minutes,
        match_cache_ttl_seconds=settings.match_cache_ttl_seconds,
        rate_limit_default=settings.rate_limit_default,
        cors_origin_count=len(settings.cors_origins),
        admin_email_count=len(settings.admin_emails),
        adzuna_configured=bool(settings.adzuna_app_id and settings.adzuna_app_key),
        greenhouse_board_count=len(settings.greenhouse_boards),
        lever_company_count=len(settings.lever_companies),
    )

    recent_users = [
        AdminUserSummary(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        )
        for user in db.query(User).order_by(User.created_at.desc()).limit(6).all()
    ]

    recent_jobs = [
        AdminJobSummary(
            id=str(job.id),
            title=job.title,
            company=job.company,
            source=job.source,
            location=job.location,
            posted_at=job.posted_at,
            is_remote=job.is_remote,
        )
        for job in db.query(Job).order_by(Job.posted_at.desc()).limit(8).all()
    ]

    recent_scraper_runs = [
        AdminScraperRunSummary(
            id=str(run.id),
            source=run.source,
            status=run.status,
            jobs_fetched=run.jobs_fetched,
            jobs_inserted=run.jobs_inserted,
            jobs_updated=run.jobs_updated,
            started_at=run.started_at,
            finished_at=run.finished_at,
            error_message=run.error_message,
        )
        for run in db.query(ScraperRun).order_by(ScraperRun.started_at.desc()).limit(8).all()
    ]

    return AdminOverviewResponse(
        generated_at=datetime.now(tz=UTC),
        counts=counts,
        storage=storage,
        recent_users=recent_users,
        recent_jobs=recent_jobs,
        recent_scraper_runs=recent_scraper_runs,
    )