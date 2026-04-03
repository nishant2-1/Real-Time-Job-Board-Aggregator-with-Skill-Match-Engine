from datetime import datetime

from pydantic import BaseModel, Field


class AdminCountsResponse(BaseModel):
    users: int = Field(description="Total registered users")
    resumes: int = Field(description="Total uploaded resumes")
    jobs: int = Field(description="Total indexed jobs")
    saved_jobs: int = Field(description="Total saved-job records")
    scraper_runs: int = Field(description="Total scraper run history rows")
    direct_jobs: int = Field(description="Total jobs sourced from direct ATS feeds")


class AdminStorageResponse(BaseModel):
    app_env: str = Field(description="Runtime environment")
    app_version: str = Field(description="Backend version")
    postgres_host: str = Field(description="Configured PostgreSQL host")
    postgres_port: int = Field(description="Configured PostgreSQL port")
    postgres_db: str = Field(description="Configured PostgreSQL database name")
    redis_host: str = Field(description="Configured Redis host")
    redis_port: int = Field(description="Configured Redis port")
    redis_db: int = Field(description="Configured Redis database index")
    scrape_interval_minutes: int = Field(description="Scraper cadence in minutes")
    match_cache_ttl_seconds: int = Field(description="Match cache TTL in seconds")
    rate_limit_default: str = Field(description="Default API rate limit")
    cors_origin_count: int = Field(description="Configured allowed origin count")
    admin_email_count: int = Field(description="Configured admin email count")
    adzuna_configured: bool = Field(description="Whether Adzuna keys are configured")
    greenhouse_board_count: int = Field(description="Configured Greenhouse board count")
    lever_company_count: int = Field(description="Configured Lever company count")


class AdminUserSummary(BaseModel):
    id: str = Field(description="User identifier")
    email: str = Field(description="User email")
    full_name: str = Field(description="User full name")
    created_at: datetime = Field(description="User creation time")
    last_login_at: datetime | None = Field(default=None, description="Last login timestamp")


class AdminJobSummary(BaseModel):
    id: str = Field(description="Job identifier")
    title: str = Field(description="Job title")
    company: str = Field(description="Company name")
    source: str = Field(description="Source system")
    location: str = Field(description="Job location")
    posted_at: datetime = Field(description="Job posted timestamp")
    is_remote: bool = Field(description="Whether the job is remote")


class AdminScraperRunSummary(BaseModel):
    id: str = Field(description="Scraper run identifier")
    source: str = Field(description="Scraper source")
    status: str = Field(description="Scraper run status")
    jobs_fetched: int = Field(description="Fetched count")
    jobs_inserted: int = Field(description="Inserted count")
    jobs_updated: int = Field(description="Updated count")
    started_at: datetime = Field(description="Run start time")
    finished_at: datetime = Field(description="Run finish time")
    error_message: str | None = Field(default=None, description="Failure detail when present")


class AdminOverviewResponse(BaseModel):
    generated_at: datetime = Field(description="Response generation time")
    counts: AdminCountsResponse = Field(description="Top-level table and feature counts")
    storage: AdminStorageResponse = Field(description="Configured runtime and storage endpoints")
    recent_users: list[AdminUserSummary] = Field(default_factory=list, description="Newest users")
    recent_jobs: list[AdminJobSummary] = Field(default_factory=list, description="Newest indexed jobs")
    recent_scraper_runs: list[AdminScraperRunSummary] = Field(default_factory=list, description="Latest scraper runs")