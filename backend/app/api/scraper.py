from sqlalchemy import func
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.job import Job
from app.models.scraper_run import ScraperRun
from app.tasks.scraper_tasks import scrape_all_sources
from app.models.user import User


router = APIRouter(prefix="/scraper", tags=["scraper"])


@router.get("/status")
def scraper_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    per_source_runs = (
        db.query(
            ScraperRun.source,
            func.max(ScraperRun.finished_at).label("last_finished_at"),
            func.sum(ScraperRun.jobs_fetched).label("jobs_found"),
            func.sum(ScraperRun.jobs_inserted).label("jobs_new"),
            func.sum(ScraperRun.jobs_updated).label("jobs_updated"),
        )
        .group_by(ScraperRun.source)
        .all()
    )
    per_source_jobs = dict(db.query(Job.source, func.count(Job.id)).group_by(Job.source).all())
    last_scrape_time = db.query(func.max(ScraperRun.finished_at)).scalar()
    if last_scrape_time is None:
        next_run = datetime.now(tz=UTC) + timedelta(minutes=settings.scrape_interval_minutes)
    else:
        next_run = last_scrape_time + timedelta(minutes=settings.scrape_interval_minutes)

    return {
        "last_scrape_time": last_scrape_time,
        "next_run": next_run,
        "sources": [
            {
                "source": item.source,
                "last_finished_at": item.last_finished_at,
                "jobs_found": int(item.jobs_found or 0),
                "jobs_new": int(item.jobs_new or 0),
                "jobs_updated": int(item.jobs_updated or 0),
                "jobs_total": int(per_source_jobs.get(item.source, 0)),
            }
            for item in per_source_runs
        ]
    }


@router.post("/trigger", status_code=status.HTTP_202_ACCEPTED)
def trigger_scraper_run(admin: User = Depends(get_current_admin)) -> dict[str, str]:
    task = scrape_all_sources.delay()
    return {
        "task_id": task.id,
        "status": "queued",
        "message": "Scrape triggered",
    }
