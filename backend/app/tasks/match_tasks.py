from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.dialects.postgresql import insert

from app.core.database import SessionLocal
from app.models.job import Job
from app.models.job_match import JobMatch
from app.models.resume import Resume
from app.services.matcher import SkillMatcher
from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.match_tasks.recompute_matches_for_user")
def recompute_matches_for_user(user_id: str) -> dict[str, int | str]:
    db = SessionLocal()
    try:
        user_uuid = UUID(user_id)
        latest_resume = (
            db.query(Resume)
            .filter(Resume.user_id == user_uuid)
            .order_by(Resume.uploaded_at.desc())
            .first()
        )
        if latest_resume is None:
            return {"user_id": user_id, "jobs_processed": 0, "status": "no_resume"}

        cutoff = datetime.now(tz=UTC) - timedelta(days=7)
        jobs = db.query(Job).filter(Job.posted_at >= cutoff).all()
        if not jobs:
            return {"user_id": user_id, "jobs_processed": 0, "status": "no_jobs"}

        matcher = SkillMatcher()
        results = matcher.batch_match(latest_resume, jobs)

        now = datetime.now(tz=UTC)
        for job in jobs:
            result = results.get(str(job.id))
            if result is None:
                continue
            stmt = insert(JobMatch).values(
                user_id=user_uuid,
                job_id=job.id,
                match_pct=result.match_pct,
                matched_skills=result.matched_skills,
                missing_skills=result.missing_skills,
                top_keywords=result.top_keywords,
                computed_at=now,
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=[JobMatch.user_id, JobMatch.job_id],
                set_={
                    "match_pct": result.match_pct,
                    "matched_skills": result.matched_skills,
                    "missing_skills": result.missing_skills,
                    "top_keywords": result.top_keywords,
                    "computed_at": now,
                    "updated_at": now,
                },
            )
            db.execute(stmt)

        db.commit()
        return {"user_id": user_id, "jobs_processed": len(results), "status": "ok"}
    finally:
        db.close()
