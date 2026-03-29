import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.enums import ResumeEducationLevel, ResumeFileType


class Resume(TimestampMixin, Base):
    __tablename__ = "resumes"
    __table_args__ = (
        Index("ix_resumes_user_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False, default=ResumeFileType.PDF.value)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    extracted_text: Mapped[str] = mapped_column(Text, nullable=False)
    parsed_skills: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    parsed_job_titles: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    years_experience: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    education_level: Mapped[str] = mapped_column(String(50), nullable=False, default=ResumeEducationLevel.UNKNOWN.value)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user = relationship("User", back_populates="resumes")
