"""add job matches table

Revision ID: 20260329_0002
Revises: 20260329_0001
Create Date: 2026-03-29 00:30:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260329_0002"
down_revision = "20260329_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("match_pct", sa.Integer(), nullable=False),
        sa.Column("matched_skills", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("missing_skills", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("top_keywords", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], name=op.f("fk_job_matches_job_id_jobs"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_job_matches_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_job_matches")),
    )
    op.create_index("ix_job_matches_user_id", "job_matches", ["user_id"], unique=False)
    op.create_index("ix_job_matches_job_id", "job_matches", ["job_id"], unique=False)
    op.create_index("ix_job_matches_match_pct", "job_matches", ["match_pct"], unique=False)
    op.create_index("ix_job_matches_computed_at", "job_matches", ["computed_at"], unique=False)
    op.create_index("ix_job_matches_user_job", "job_matches", ["user_id", "job_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_job_matches_user_job", table_name="job_matches")
    op.drop_index("ix_job_matches_computed_at", table_name="job_matches")
    op.drop_index("ix_job_matches_match_pct", table_name="job_matches")
    op.drop_index("ix_job_matches_job_id", table_name="job_matches")
    op.drop_index("ix_job_matches_user_id", table_name="job_matches")
    op.drop_table("job_matches")
