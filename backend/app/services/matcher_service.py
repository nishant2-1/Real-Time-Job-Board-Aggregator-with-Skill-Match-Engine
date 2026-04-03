import json
from dataclasses import dataclass
from typing import Any, cast

from redis import Redis
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import settings
from app.core.redis_client import get_redis_client
from app.models.job import Job
from app.models.resume import Resume


@dataclass
class MatchResult:
    score: float
    top_matched_skills: list[str]
    missing_skills: list[str]


class MatcherService:
    def __init__(self, redis_client: Redis | None = None) -> None:
        self.redis = redis_client or get_redis_client()
        self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=8000)

    def _cache_key(self, resume_id: str, job_id: str) -> str:
        return f"match:{resume_id}:{job_id}"

    def _extract_overlap(self, resume_skills: list[str], job_text: str) -> tuple[list[str], list[str]]:
        text = job_text.lower()
        matched = sorted([skill for skill in resume_skills if skill.lower() in text])
        missing = sorted([skill for skill in resume_skills if skill.lower() not in text])
        return matched[:15], missing[:15]

    def compute(self, resume: Resume, job: Job) -> MatchResult:
        key = self._cache_key(str(resume.id), str(job.id))
        cached = self.redis.get(key)
        if isinstance(cached, str):
            payload = json.loads(cast(str, cached))
            return MatchResult(**payload)

        corpus = [resume.extracted_text or "", job.description_clean or ""]
        tfidf_matrix = cast(Any, self.vectorizer.fit_transform(corpus))
        similarity = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])

        matched_skills, missing_skills = self._extract_overlap(resume.parsed_skills, job.description_clean)

        score = max(0.0, min(1.0, similarity)) * 100
        boost = min(25.0, len(matched_skills) * 1.8)
        final_score = round(min(100.0, score + boost), 2)

        result = MatchResult(
            score=final_score,
            top_matched_skills=matched_skills[:5],
            missing_skills=missing_skills[:5],
        )
        self.redis.setex(key, settings.match_cache_ttl_seconds, json.dumps(result.__dict__))
        return result
