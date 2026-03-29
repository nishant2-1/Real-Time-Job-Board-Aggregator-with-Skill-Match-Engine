from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ResumeUploadResponse(BaseModel):
    resume_id: UUID = Field(description="Persisted resume identifier")
    skills: list[str] = Field(description="Extracted skills")
    job_titles: list[str] = Field(description="Extracted titles")
    years_experience: int = Field(ge=0, le=60, description="Estimated years of experience")
    education_level: str = Field(description="Education level classification")
    uploaded_at: datetime = Field(description="Upload timestamp in UTC")

    @field_validator("skills")
    @classmethod
    def ensure_unique_skills(cls, value: list[str]) -> list[str]:
        return sorted(set(value))


class ResumeMeResponse(ResumeUploadResponse):
    original_filename: str = Field(description="Original uploaded filename")
    file_type: str = Field(description="Resume file type")


class ResumeDeleteResponse(BaseModel):
    deleted: bool = Field(description="Whether a resume was deleted")
