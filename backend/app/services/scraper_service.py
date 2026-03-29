import asyncio
import logging
import random
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.redis_client import get_redis_client
from app.models.job import Job
from app.models.scraper_run import ScraperRun
from app.utils.hash import make_dedup_hash


logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)",
    "Mozilla/5.0 (X11; Linux x86_64)",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
]


@dataclass
class NormalizedJob:
    source: str
    external_id: str
    url: str
    company: str
    title: str
    location: str
    is_remote: bool
    description_raw: str
    posted_at: datetime
    company_logo_url: str | None = None
    salary_min: Decimal | None = None
    salary_max: Decimal | None = None
    salary_currency: str | None = None
    tags: list[str] | None = None
    metadata_json: dict[str, str] | None = None


class ScraperService:
    def __init__(self) -> None:
        self.redis = get_redis_client()

    @retry(wait=wait_exponential(multiplier=1, min=1, max=10), stop=stop_after_attempt(4), reraise=True)
    async def _fetch_json(self, client: httpx.AsyncClient, url: str, params: dict[str, str] | None = None) -> dict | list:
        headers = {"User-Agent": random.choice(USER_AGENTS)}
        response = await client.get(url, params=params, headers=headers)
        if response.status_code == 429:
            raise httpx.HTTPStatusError("rate limit", request=response.request, response=response)
        response.raise_for_status()
        return response.json()

    def _clean_html(self, html_text: str) -> str:
        return BeautifulSoup(html_text or "", "html.parser").get_text(" ", strip=True)

    def _is_new_job(self, dedup_hash: str) -> bool:
        return bool(self.redis.set(name=f"jobdedup:{dedup_hash}", value="1", nx=True, ex=2_592_000))

    async def scrape_remoteok(self, client: httpx.AsyncClient) -> list[NormalizedJob]:
        payload = await self._fetch_json(client, "https://remoteok.com/api")
        jobs: list[NormalizedJob] = []
        for item in payload[1:] if isinstance(payload, list) else []:
            posted_epoch = int(item.get("epoch") or 0)
            posted_at = datetime.fromtimestamp(posted_epoch, tz=UTC) if posted_epoch else datetime.now(tz=UTC)
            jobs.append(
                NormalizedJob(
                    source="remoteok",
                    external_id=str(item.get("id")),
                    url=item.get("url") or item.get("apply_url") or "",
                    company=item.get("company") or "Unknown",
                    title=item.get("position") or "Untitled",
                    location=item.get("location") or "Remote",
                    is_remote="remote" in str(item.get("location", "remote")).lower(),
                    description_raw=item.get("description") or "",
                    posted_at=posted_at,
                    company_logo_url=item.get("company_logo"),
                    tags=item.get("tags") or [],
                    metadata_json={"salary": str(item.get("salary"))},
                )
            )
        return jobs

    async def scrape_remotive(self, client: httpx.AsyncClient) -> list[NormalizedJob]:
        payload = await self._fetch_json(client, "https://remotive.com/api/remote-jobs")
        jobs: list[NormalizedJob] = []
        for item in payload.get("jobs", []) if isinstance(payload, dict) else []:
            publication_date = item.get("publication_date") or ""
            posted_at = datetime.now(tz=UTC)
            if publication_date:
                posted_at = datetime.fromisoformat(publication_date.replace("Z", "+00:00"))
            jobs.append(
                NormalizedJob(
                    source="remotive",
                    external_id=str(item.get("id")),
                    url=item.get("url") or "",
                    company=item.get("company_name") or "Unknown",
                    title=item.get("title") or "Untitled",
                    location=item.get("candidate_required_location") or "Remote",
                    is_remote=True,
                    description_raw=item.get("description") or "",
                    posted_at=posted_at,
                    company_logo_url=item.get("company_logo_url"),
                    tags=item.get("tags") or [],
                    metadata_json={"job_type": str(item.get("job_type"))},
                )
            )
        return jobs

    async def scrape_adzuna(self, client: httpx.AsyncClient) -> list[NormalizedJob]:
        if not settings.adzuna_app_id or not settings.adzuna_app_key:
            logger.warning("Adzuna credentials missing; skipping Adzuna scrape")
            return []

        payload = await self._fetch_json(
            client,
            "https://api.adzuna.com/v1/api/jobs/us/search/1",
            params={
                "app_id": settings.adzuna_app_id,
                "app_key": settings.adzuna_app_key,
                "results_per_page": "50",
                "what": "software engineer",
                "content-type": "application/json",
            },
        )
        jobs: list[NormalizedJob] = []
        for item in payload.get("results", []) if isinstance(payload, dict) else []:
            created_at = item.get("created") or ""
            posted_at = datetime.now(tz=UTC)
            if created_at:
                posted_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            salary_min = item.get("salary_min")
            salary_max = item.get("salary_max")
            jobs.append(
                NormalizedJob(
                    source="adzuna",
                    external_id=str(item.get("id")),
                    url=item.get("redirect_url") or "",
                    company=item.get("company", {}).get("display_name") or "Unknown",
                    title=item.get("title") or "Untitled",
                    location=item.get("location", {}).get("display_name") or "Unknown",
                    is_remote="remote" in str(item.get("description", "")).lower(),
                    description_raw=item.get("description") or "",
                    posted_at=posted_at,
                    salary_min=Decimal(str(salary_min)) if salary_min is not None else None,
                    salary_max=Decimal(str(salary_max)) if salary_max is not None else None,
                    salary_currency=item.get("salary_is_predicted") and "USD" or None,
                    tags=[],
                    metadata_json={"category": str(item.get("category", {}).get("label", ""))},
                )
            )
        return jobs

    async def run_all(self, db_session) -> dict[str, int]:
        timeout = httpx.Timeout(settings.scraper_timeout_seconds)
        now = datetime.now(tz=UTC)
        async with httpx.AsyncClient(timeout=timeout) as client:
            remoteok_task = self.scrape_remoteok(client)
            remotive_task = self.scrape_remotive(client)
            adzuna_task = self.scrape_adzuna(client)
            remoteok_jobs, remotive_jobs, adzuna_jobs = await asyncio.gather(
                remoteok_task,
                remotive_task,
                adzuna_task,
                return_exceptions=False,
            )

        inserted = 0
        updated = 0
        total_fetched = len(remoteok_jobs) + len(remotive_jobs) + len(adzuna_jobs)

        for source, items in {
            "remoteok": remoteok_jobs,
            "remotive": remotive_jobs,
            "adzuna": adzuna_jobs,
        }.items():
            started_at = datetime.now(tz=UTC)
            source_inserted = 0
            source_updated = 0
            status = "success"
            error_message = None

            try:
                for item in items:
                    dedup_hash = make_dedup_hash(item.title, item.company, item.location)
                    description_clean = self._clean_html(item.description_raw)
                    existing = (
                        db_session.query(Job)
                        .filter(Job.source == item.source, Job.external_id == item.external_id)
                        .one_or_none()
                    )
                    if existing:
                        existing.title = item.title
                        existing.company = item.company
                        existing.location = item.location
                        existing.url = item.url
                        existing.is_remote = item.is_remote
                        existing.description_raw = item.description_raw
                        existing.description_clean = description_clean
                        existing.salary_min = item.salary_min
                        existing.salary_max = item.salary_max
                        existing.salary_currency = item.salary_currency
                        existing.company_logo_url = item.company_logo_url
                        existing.tags = item.tags or []
                        existing.posted_at = item.posted_at
                        existing.scraped_at = now
                        existing.metadata_json = item.metadata_json or {}
                        source_updated += 1
                        continue

                    if not self._is_new_job(dedup_hash):
                        continue

                    db_session.add(
                        Job(
                            source=item.source,
                            external_id=item.external_id,
                            url=item.url,
                            company=item.company,
                            company_logo_url=item.company_logo_url,
                            title=item.title,
                            location=item.location,
                            is_remote=item.is_remote,
                            description_raw=item.description_raw,
                            description_clean=description_clean,
                            salary_min=item.salary_min,
                            salary_max=item.salary_max,
                            salary_currency=item.salary_currency,
                            tags=item.tags or [],
                            posted_at=item.posted_at,
                            scraped_at=now,
                            dedup_hash=dedup_hash,
                            metadata_json=item.metadata_json or {},
                        )
                    )
                    source_inserted += 1

                db_session.commit()
                inserted += source_inserted
                updated += source_updated
            except Exception as exc:
                db_session.rollback()
                status = "failed"
                error_message = str(exc)
                logger.exception("Scrape source failed", extra={"source": source})
            finally:
                db_session.add(
                    ScraperRun(
                        source=source,
                        status=status,
                        jobs_fetched=len(items),
                        jobs_inserted=source_inserted,
                        jobs_updated=source_updated,
                        error_message=error_message,
                        started_at=started_at,
                        finished_at=datetime.now(tz=UTC),
                    )
                )
                db_session.commit()

        return {
            "jobs_fetched": total_fetched,
            "jobs_inserted": inserted,
            "jobs_updated": updated,
        }
