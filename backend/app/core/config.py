import json
from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        enable_decoding=False,
    )

    app_name: str = Field(default="JobRadar API", description="Application display name")
    app_env: str = Field(default="development", description="Runtime environment")
    app_debug: bool = Field(default=False, description="Debug flag")
    app_host: str = Field(default="0.0.0.0", description="App bind host")
    app_port: int = Field(default=8000, description="App bind port")
    app_version: str = Field(default="1.0.0", description="Service version")

    postgres_host: str = Field(default="postgres", description="PostgreSQL host")
    postgres_port: int = Field(default=5432, description="PostgreSQL port")
    postgres_db: str = Field(default="jobrador", description="PostgreSQL database")
    postgres_user: str = Field(default="jobrador", description="PostgreSQL user")
    postgres_password: str = Field(default="jobrador", description="PostgreSQL password")

    redis_host: str = Field(default="redis", description="Redis host")
    redis_port: int = Field(default=6379, description="Redis port")
    redis_db: int = Field(default=0, description="Redis DB index")

    celery_broker_url: str = Field(default="redis://redis:6379/0", description="Celery broker URL")
    celery_result_backend: str = Field(default="redis://redis:6379/1", description="Celery result backend")

    jwt_secret_key: str = Field(default="change-me-access", description="JWT signing key")
    jwt_refresh_secret_key: str = Field(default="change-me-refresh", description="Refresh token signing key")
    jwt_algorithm: str = Field(default="HS256", description="JWT signing algorithm")
    access_token_expire_minutes: int = Field(default=15, description="Access token TTL in minutes")
    refresh_token_expire_days: int = Field(default=7, description="Refresh token TTL in days")

    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:3000"],
        description="Allowed CORS origins",
    )
    admin_emails: list[str] = Field(default_factory=list, description="Emails allowed to run admin-only actions")

    adzuna_app_id: str = Field(default="", description="Adzuna API app id")
    adzuna_app_key: str = Field(default="", description="Adzuna API app key")

    rate_limit_default: str = Field(default="60/minute", description="Default API rate limit")
    scrape_interval_minutes: int = Field(default=30, description="Scraper schedule interval")
    scraper_timeout_seconds: int = Field(default=20, description="HTTP timeout for scrapers")

    max_resume_upload_bytes: int = Field(default=5_242_880, description="Maximum resume upload size")
    match_cache_ttl_seconds: int = Field(default=3600, description="Redis TTL for match score cache")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                parsed = json.loads(stripped)
                if isinstance(parsed, list):
                    return [str(origin).strip() for origin in parsed if str(origin).strip()]
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return value
        raise ValueError("cors_origins must be a comma-separated string or list")

    @field_validator("admin_emails", mode="before")
    @classmethod
    def parse_admin_emails(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                parsed = json.loads(stripped)
                if isinstance(parsed, list):
                    return [str(email).strip().lower() for email in parsed if str(email).strip()]
            return [email.strip().lower() for email in value.split(",") if email.strip()]
        if isinstance(value, list):
            return [str(email).strip().lower() for email in value if str(email).strip()]
        raise ValueError("admin_emails must be a comma-separated string or list")

    @property
    def sqlalchemy_database_uri(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
