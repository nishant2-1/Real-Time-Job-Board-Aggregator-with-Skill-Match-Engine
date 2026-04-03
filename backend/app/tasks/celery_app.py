from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "jobrador",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    beat_schedule={
        "run-all-scrapers-every-30-minutes": {
            "task": "app.tasks.scraper_tasks.scrape_all_sources",
            "schedule": settings.scrape_interval_minutes * 60,
        }
    },
)

celery_app.autodiscover_tasks(["app.tasks"])
