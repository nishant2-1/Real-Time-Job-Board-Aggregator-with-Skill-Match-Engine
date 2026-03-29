import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class JobMatch(TimestampMixin, Base):
    __tablename__ = "job_matches"
    __table_args__ = (
        Index("ix_job_matches_user_id", "user_id"),
        Index("ix_job_matches_job_id", "job_id"),
        Index("ix_job_matches_match_pct", "match_pct"),
        Index("ix_job_matches_computed_at", "computed_at"),
        Index("ix_job_matches_user_job", "user_id", "job_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    match_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    matched_skills: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    missing_skills: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    top_keywords: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user = relationship("User")
    job = relationship("Job")
