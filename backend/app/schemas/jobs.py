from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class JobListItem(BaseModel):
    id: UUID = Field(description="Job identifier")
    title: str = Field(description="Job title")
    company: str = Field(description="Company name")
    company_logo_url: str | None = Field(default=None, description="Company logo URL")
    location: str = Field(description="Job location")
    is_remote: bool = Field(description="Whether job is remote")
    salary_min: Decimal | None = Field(default=None, description="Minimum salary")
    salary_max: Decimal | None = Field(default=None, description="Maximum salary")
    salary_currency: str | None = Field(default=None, description="Salary currency")
    match_pct: int = Field(default=0, ge=0, le=100, description="Match percentage")
    matched_skills: list[str] = Field(default_factory=list, description="Matched skills")
    missing_skills: list[str] = Field(default_factory=list, description="Top missing skills")
    top_keywords: list[str] = Field(default_factory=list, description="Top TF-IDF keywords")
    posted_at: datetime = Field(description="Original job post date")
    source: str = Field(description="Source board identifier")
    url: str = Field(description="Original job URL")
    description_clean: str = Field(description="Plain text description")
    tags: list[str] = Field(default_factory=list, description="Job tags from source")
    is_direct_source: bool = Field(default=False, description="Whether the role came from a direct ATS company feed")
    visa_sponsorship: bool = Field(default=False, description="Whether the role likely supports visa sponsorship")


class JobListResponse(BaseModel):
    jobs: list[JobListItem] = Field(description="Current page results")
    total: int = Field(ge=0, description="Total number of jobs")
    page: int = Field(ge=1, description="Current page")
    limit: int = Field(ge=1, le=100, description="Page size")
    pages: int = Field(ge=1, description="Total pages")


class JobDetailResponse(JobListItem):
    description_raw: str = Field(description="Raw job description")


class JobSaveToggleResponse(BaseModel):
    job_id: UUID = Field(description="Job identifier")
    saved: bool = Field(description="Current saved state")


class JobQueryParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Result page")
    limit: int = Field(default=20, ge=1, le=100, description="Page size")
    sort: str = Field(default="match_score", description="Sort field")
    query: str | None = Field(default=None, description="Keyword search across title, company, location, and description")
    remote: bool | None = Field(default=None, description="Remote-only filter")
    direct_only: bool | None = Field(default=None, description="Filter roles sourced directly from company ATS feeds")
    visa_sponsorship: bool | None = Field(default=None, description="Filter roles that likely support visa sponsorship")
    min_salary: float | None = Field(default=None, ge=0, description="Minimum salary filter")
    min_match: int | None = Field(default=None, ge=0, le=100, description="Minimum match percentage")

    @field_validator("sort")
    @classmethod
    def validate_sort(cls, value: str) -> str:
        allowed = {"match_score", "date", "salary"}
        if value not in allowed:
            raise ValueError(f"Sort must be one of: {', '.join(sorted(allowed))}")
        return value
