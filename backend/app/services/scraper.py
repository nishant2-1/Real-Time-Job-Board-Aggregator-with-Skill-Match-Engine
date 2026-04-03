import asyncio
import logging
import re
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

import httpx
from bs4 import BeautifulSoup
from redis import Redis
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.job import Job
from app.utils.hash import make_dedup_hash
from app.utils.user_agents import rotate_user_agent

logger = logging.getLogger(__name__)
WHITESPACE_RE = re.compile(r"\s+")


def _looks_remote(*values: str | None) -> bool:
    text = " ".join(filter(None, values)).lower()
    return any(keyword in text for keyword in ["remote", "distributed", "work from home", "anywhere"])


def _parse_datetime(value: str | None) -> datetime:
    if not value:
        return datetime.now(tz=UTC)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(tz=UTC)


def _titleize_identifier(value: str) -> str:
    return value.replace("-", " ").replace("_", " ").strip().title() or "Unknown"


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


@dataclass
class ScrapeSummary:
    source: str
    jobs_found: int
    jobs_new: int
    jobs_updated: int
    duration_seconds: float
    status: str
    error_message: str | None = None


class AsyncJobScraper(ABC):
    source_name: str

    def __init__(self, client: httpx.AsyncClient, db: Session, redis_client: Redis) -> None:
        self.client = client
        self.db = db
        self.redis = redis_client

    @abstractmethod
    async def fetch(self) -> Any:
        raise NotImplementedError

    @abstractmethod
    def parse(self, payload: Any) -> list[NormalizedJob]:
        raise NotImplementedError

    def clean(self, text: str) -> str:
        plain_text = BeautifulSoup(text or "", "html.parser").get_text(" ", strip=True)
        normalized = WHITESPACE_RE.sub(" ", plain_text).strip()
        return normalized[:2000]

    def deduplicate(self, title: str, company: str, location: str) -> tuple[str, bool]:
        dedup_hash = make_dedup_hash(title, company, location)
        is_new = bool(self.redis.set(name=f"jobdedup:{dedup_hash}", value="1", nx=True, ex=2_592_000))
        return dedup_hash, is_new

    async def _request_json(self, url: str, params: dict[str, str] | None = None) -> Any:
        for attempt in range(1, 4):
            headers = {
                "User-Agent": rotate_user_agent(),
                "Accept": "application/json",
            }
            try:
                response = await self.client.get(url, params=params, headers=headers)
                if response.status_code == 429 and attempt < 3:
                    await asyncio.sleep(2 ** (attempt - 1))
                    continue
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as exc:
                if attempt == 3:
                    logger.exception(
                        "scraper_request_failed",
                        extra={"source": self.source_name, "url": url, "attempt": attempt, "error": str(exc)},
                    )
                    raise
                await asyncio.sleep(2 ** (attempt - 1))
        raise RuntimeError("request retries exhausted")

    async def run(self) -> ScrapeSummary:
        started = time.perf_counter()
        jobs_found = 0
        jobs_new = 0
        jobs_updated = 0
        status = "success"
        error_message: str | None = None
        now = datetime.now(tz=UTC)

        try:
            payload = await self.fetch()
            jobs = self.parse(payload)
            jobs_found = len(jobs)

            for item in jobs:
                existing = (
                    self.db.query(Job)
                    .filter(Job.source == item.source, Job.external_id == item.external_id)
                    .one_or_none()
                )
                cleaned = self.clean(item.description_raw)

                if existing:
                    existing.url = item.url
                    existing.company = item.company
                    existing.company_logo_url = item.company_logo_url
                    existing.title = item.title
                    existing.location = item.location
                    existing.is_remote = item.is_remote
                    existing.description_raw = item.description_raw
                    existing.description_clean = cleaned
                    existing.salary_min = item.salary_min
                    existing.salary_max = item.salary_max
                    existing.salary_currency = item.salary_currency
                    existing.tags = item.tags or []
                    existing.posted_at = item.posted_at
                    existing.scraped_at = now
                    existing.metadata_json = item.metadata_json or {}
                    jobs_updated += 1
                    continue

                dedup_hash, is_new = self.deduplicate(item.title, item.company, item.location)
                if not is_new:
                    continue

                self.db.add(
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
                        description_clean=cleaned,
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
                jobs_new += 1

            self.db.commit()
            logger.info(
                "scraper_run_completed",
                extra={
                    "source": self.source_name,
                    "jobs_found": jobs_found,
                    "jobs_new": jobs_new,
                    "jobs_updated": jobs_updated,
                },
            )
        except Exception as exc:
            self.db.rollback()
            status = "failed"
            error_message = str(exc)
            logger.exception("scraper_run_failed", extra={"source": self.source_name, "error": error_message})

        duration = round(time.perf_counter() - started, 4)
        return ScrapeSummary(
            source=self.source_name,
            jobs_found=jobs_found,
            jobs_new=jobs_new,
            jobs_updated=jobs_updated,
            duration_seconds=duration,
            status=status,
            error_message=error_message,
        )


class RemoteOKScraper(AsyncJobScraper):
    source_name = "remoteok"

    async def fetch(self) -> Any:
        return await self._request_json("https://remoteok.com/api")

    def parse(self, payload: Any) -> list[NormalizedJob]:
        jobs: list[NormalizedJob] = []
        if not isinstance(payload, list):
            return jobs

        for item in payload:
            if not isinstance(item, dict) or not item.get("id"):
                continue
            epoch = int(item.get("epoch") or 0)
            posted_at = datetime.fromtimestamp(epoch, tz=UTC) if epoch else datetime.now(tz=UTC)
            jobs.append(
                NormalizedJob(
                    source=self.source_name,
                    external_id=str(item.get("id")),
                    url=str(item.get("url") or item.get("apply_url") or ""),
                    company=str(item.get("company") or "Unknown"),
                    title=str(item.get("position") or "Untitled"),
                    location=str(item.get("location") or "Remote"),
                    is_remote="remote" in str(item.get("location") or "remote").lower(),
                    description_raw=str(item.get("description") or ""),
                    posted_at=posted_at,
                    company_logo_url=item.get("company_logo"),
                    tags=item.get("tags") if isinstance(item.get("tags"), list) else [],
                    metadata_json={"salary": str(item.get("salary") or "")},
                )
            )
        return jobs


class RemotiveScraper(AsyncJobScraper):
    source_name = "remotive"

    async def fetch(self) -> Any:
        return await self._request_json("https://remotive.com/api/remote-jobs")

    def parse(self, payload: Any) -> list[NormalizedJob]:
        jobs: list[NormalizedJob] = []
        if not isinstance(payload, dict):
            return jobs

        for item in payload.get("jobs", []):
            if not isinstance(item, dict):
                continue
            published = str(item.get("publication_date") or "")
            posted_at = datetime.now(tz=UTC)
            if published:
                posted_at = datetime.fromisoformat(published.replace("Z", "+00:00"))

            jobs.append(
                NormalizedJob(
                    source=self.source_name,
                    external_id=str(item.get("id") or ""),
                    url=str(item.get("url") or ""),
                    company=str(item.get("company_name") or "Unknown"),
                    title=str(item.get("title") or "Untitled"),
                    location=str(item.get("candidate_required_location") or "Remote"),
                    is_remote=True,
                    description_raw=str(item.get("description") or ""),
                    posted_at=posted_at,
                    company_logo_url=item.get("company_logo_url"),
                    tags=item.get("tags") if isinstance(item.get("tags"), list) else [],
                    metadata_json={"job_type": str(item.get("job_type") or "")},
                )
            )
        return jobs


class AdzunaScraper(AsyncJobScraper):
    source_name = "adzuna"

    async def fetch(self) -> Any:
        if not settings.adzuna_app_id or not settings.adzuna_app_key:
            logger.warning("adzuna_credentials_missing", extra={"source": self.source_name})
            return {"results": []}

        return await self._request_json(
            "https://api.adzuna.com/v1/api/jobs/us/search/1",
            params={
                "app_id": settings.adzuna_app_id,
                "app_key": settings.adzuna_app_key,
                "results_per_page": "50",
                "what": "software engineer",
                "content-type": "application/json",
            },
        )

    def parse(self, payload: Any) -> list[NormalizedJob]:
        jobs: list[NormalizedJob] = []
        if not isinstance(payload, dict):
            return jobs

        for item in payload.get("results", []):
            if not isinstance(item, dict):
                continue
            created = str(item.get("created") or "")
            posted_at = datetime.now(tz=UTC)
            if created:
                posted_at = datetime.fromisoformat(created.replace("Z", "+00:00"))

            salary_min = item.get("salary_min")
            salary_max = item.get("salary_max")
            jobs.append(
                NormalizedJob(
                    source=self.source_name,
                    external_id=str(item.get("id") or ""),
                    url=str(item.get("redirect_url") or ""),
                    company=str(item.get("company", {}).get("display_name") or "Unknown"),
                    title=str(item.get("title") or "Untitled"),
                    location=str(item.get("location", {}).get("display_name") or "Unknown"),
                    is_remote="remote" in str(item.get("description") or "").lower(),
                    description_raw=str(item.get("description") or ""),
                    posted_at=posted_at,
                    salary_min=Decimal(str(salary_min)) if salary_min is not None else None,
                    salary_max=Decimal(str(salary_max)) if salary_max is not None else None,
                    salary_currency="USD" if salary_min is not None or salary_max is not None else None,
                    tags=[],
                    metadata_json={"category": str(item.get("category", {}).get("label") or "")},
                )
            )
        return jobs


class GreenhouseScraper(AsyncJobScraper):
    source_name = "greenhouse"

    async def fetch(self) -> Any:
        if not settings.greenhouse_boards:
            return []

        payloads: list[dict[str, Any]] = []
        for board in settings.greenhouse_boards:
            payload = await self._request_json(f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs", params={"content": "true"})
            payloads.append({"board": board, "payload": payload})
        return payloads

    def parse(self, payload: Any) -> list[NormalizedJob]:
        jobs: list[NormalizedJob] = []
        if not isinstance(payload, list):
            return jobs

        for board_payload in payload:
            if not isinstance(board_payload, dict):
                continue
            board = str(board_payload.get("board") or "greenhouse")
            board_jobs = board_payload.get("payload", {}).get("jobs", [])
            if not isinstance(board_jobs, list):
                continue

            for item in board_jobs:
                if not isinstance(item, dict):
                    continue
                location = str(item.get("location", {}).get("name") or "Unknown")
                raw_metadata = item.get("metadata")
                metadata = raw_metadata if isinstance(raw_metadata, list) else []
                tags = [str(entry.get("value")) for entry in metadata if isinstance(entry, dict) and entry.get("value")]
                jobs.append(
                    NormalizedJob(
                        source=self.source_name,
                        external_id=str(item.get("id") or ""),
                        url=str(item.get("absolute_url") or ""),
                        company=_titleize_identifier(board),
                        title=str(item.get("title") or "Untitled"),
                        location=location,
                        is_remote=_looks_remote(location, str(item.get("content") or "")),
                        description_raw=str(item.get("content") or ""),
                        posted_at=_parse_datetime(str(item.get("updated_at") or item.get("created_at") or "")),
                        tags=tags,
                        metadata_json={"board": board, "provider": "greenhouse"},
                    )
                )

        return jobs


class LeverScraper(AsyncJobScraper):
    source_name = "lever"

    async def fetch(self) -> Any:
        if not settings.lever_companies:
            return []

        payloads: list[dict[str, Any]] = []
        for company in settings.lever_companies:
            payload = await self._request_json(f"https://api.lever.co/v0/postings/{company}", params={"mode": "json"})
            payloads.append({"company": company, "payload": payload})
        return payloads

    def parse(self, payload: Any) -> list[NormalizedJob]:
        jobs: list[NormalizedJob] = []
        if not isinstance(payload, list):
            return jobs

        for company_payload in payload:
            if not isinstance(company_payload, dict):
                continue
            company_identifier = str(company_payload.get("company") or "lever")
            company_name = _titleize_identifier(company_identifier)
            postings = company_payload.get("payload")
            if not isinstance(postings, list):
                continue

            for item in postings:
                if not isinstance(item, dict):
                    continue
                raw_categories = item.get("categories")
                categories = raw_categories if isinstance(raw_categories, dict) else {}
                location = str(categories.get("location") or "Unknown")
                tags = [
                    str(value)
                    for value in [categories.get("commitment"), categories.get("team"), categories.get("department")]
                    if value
                ]
                jobs.append(
                    NormalizedJob(
                        source=self.source_name,
                        external_id=str(item.get("id") or ""),
                        url=str(item.get("hostedUrl") or item.get("applyUrl") or ""),
                        company=company_name,
                        title=str(item.get("text") or "Untitled"),
                        location=location,
                        is_remote=_looks_remote(location, str(item.get("description") or "")),
                        description_raw=str(item.get("description") or ""),
                        posted_at=_parse_datetime(str(item.get("createdAt") or "")),
                        tags=tags,
                        metadata_json={"company": company_identifier, "provider": "lever"},
                    )
                )

        return jobs
