import asyncio
from datetime import UTC, datetime, timedelta

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.redis_client import get_redis_client
from app.models.scraper_run import ScraperRun
from app.services.scraper import AdzunaScraper, RemoteOKScraper, RemotiveScraper
from app.tasks.celery_app import celery_app
import httpx


async def _run_scrapers() -> list:
    db = SessionLocal()
    redis_client = get_redis_client()
    timeout = httpx.Timeout(settings.scraper_timeout_seconds)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            scrapers = [
                RemoteOKScraper(client=client, db=db, redis_client=redis_client),
                RemotiveScraper(client=client, db=db, redis_client=redis_client),
                AdzunaScraper(client=client, db=db, redis_client=redis_client),
            ]
            summaries = await asyncio.gather(*(scraper.run() for scraper in scrapers), return_exceptions=False)

        now = datetime.now(tz=UTC)
        for summary in summaries:
            finished_at = now
            started_at = finished_at - timedelta(seconds=summary.duration_seconds)
            db.add(
                ScraperRun(
                    source=summary.source,
                    status=summary.status,
                    jobs_fetched=summary.jobs_found,
                    jobs_inserted=summary.jobs_new,
                    jobs_updated=summary.jobs_updated,
                    error_message=summary.error_message,
                    started_at=started_at,
                    finished_at=finished_at,
                    metadata_json={"duration_seconds": f"{summary.duration_seconds:.4f}"},
                )
            )
        db.commit()
        return summaries
    finally:
        db.close()


@celery_app.task(name="app.tasks.scraper_tasks.scrape_all_sources")
def scrape_all_sources() -> dict[str, object]:
    summaries = asyncio.run(_run_scrapers())
    return {
        "sources": [
            {
                "source": summary.source,
                "jobs_found": summary.jobs_found,
                "jobs_new": summary.jobs_new,
                "jobs_updated": summary.jobs_updated,
                "duration_seconds": summary.duration_seconds,
                "status": summary.status,
                "error_message": summary.error_message,
            }
            for summary in summaries
        ]
    }


@celery_app.task(name="app.tasks.scraper_tasks.run_all_scrapers")
def run_all_scrapers() -> dict[str, object]:
    return scrape_all_sources()
