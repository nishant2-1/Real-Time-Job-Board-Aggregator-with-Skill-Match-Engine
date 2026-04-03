import json
import re
from dataclasses import dataclass
from typing import Any, Sequence, cast

import numpy as np
from redis import Redis
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.core.redis_client import get_redis_client

FILTERED_KEYWORDS = {
    "experience",
    "work",
    "team",
    "role",
    "job",
    "candidate",
    "requirements",
    "skills",
}


@dataclass
class MatchResult:
    match_pct: int
    matched_skills: list[str]
    missing_skills: list[str]
    top_keywords: list[str]


class SkillMatcher:
    def __init__(self, redis_client: Redis | None = None, cache_ttl_seconds: int = 3600) -> None:
        self.redis = redis_client or get_redis_client()
        self.cache_ttl_seconds = cache_ttl_seconds
        self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=12000)

    def _cache_key(self, user_id: str, job_id: str) -> str:
        return f"match:{user_id}:{job_id}"

    def _normalize_resume_skills(self, resume) -> list[str]:
        return sorted({str(skill).lower() for skill in (resume.parsed_skills or [])})

    def get_top_keywords(self, description: str, n: int = 10) -> list[str]:
        cleaned = re.sub(r"\s+", " ", description or "").strip()
        if not cleaned:
            return []

        tfidf = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=1000)
        matrix = cast(Any, tfidf.fit_transform([cleaned]))
        scores = np.asarray(matrix.toarray()).ravel()
        terms = cast(list[str], tfidf.get_feature_names_out().tolist())
        ranked_indices = np.argsort(scores)[::-1]

        keywords: list[str] = []
        for index in ranked_indices:
            term = terms[index].strip().lower()
            if not term or term in FILTERED_KEYWORDS:
                continue
            keywords.append(term)
            if len(keywords) >= n:
                break
        return keywords

    def compute_match(self, resume, job) -> MatchResult:
        user_id = str(resume.user_id)
        job_id = str(job.id)
        key = self._cache_key(user_id=user_id, job_id=job_id)

        cached = self.redis.get(key)
        if isinstance(cached, str):
            payload = json.loads(cast(str, cached))
            return MatchResult(**payload)

        resume_text = resume.extracted_text or ""
        job_text = job.description_clean or ""
        tfidf_matrix = cast(Any, self.vectorizer.fit_transform([resume_text, job_text]))
        base_score = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]) * 100

        resume_skills = self._normalize_resume_skills(resume)
        if resume_skills:
            job_lower = job_text.lower()
            matched_skills = sorted([skill for skill in resume_skills if skill in job_lower])
            missing_skills = sorted([skill for skill in resume_skills if skill not in job_lower])
            keyword_score = (len(matched_skills) / len(resume_skills)) * 100
        else:
            matched_skills = []
            missing_skills = []
            keyword_score = 0.0

        final_score = (base_score * 0.5) + (keyword_score * 0.5)
        result = MatchResult(
            match_pct=int(round(max(0.0, min(100.0, final_score)))),
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            top_keywords=self.get_top_keywords(job_text, n=10),
        )

        self.redis.setex(key, self.cache_ttl_seconds, json.dumps(result.__dict__))
        return result

    def batch_match(self, resume, jobs: Sequence) -> dict[str, MatchResult]:
        if not jobs:
            return {}

        resume_text = resume.extracted_text or ""
        job_texts = [job.description_clean or "" for job in jobs]
        tfidf_matrix = cast(Any, self.vectorizer.fit_transform([resume_text, *job_texts]))
        base_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten() * 100

        resume_skills = self._normalize_resume_skills(resume)
        if resume_skills:
            skill_vectorizer = TfidfVectorizer(vocabulary=resume_skills, binary=True, use_idf=False, norm=None)
            job_skill_matrix = cast(Any, skill_vectorizer.fit_transform(job_texts))
            matched_skill_counts = np.asarray((job_skill_matrix > 0).sum(axis=1)).ravel()
            keyword_scores = (matched_skill_counts / max(1, len(resume_skills))) * 100
        else:
            keyword_scores = np.zeros(len(jobs))

        final_scores = (base_scores * 0.5) + (keyword_scores * 0.5)
        clamped_scores = np.clip(np.rint(final_scores), 0, 100).astype(int)

        results: dict[str, MatchResult] = {}
        for idx, job in enumerate(jobs):
            job_text = job_texts[idx].lower()
            if resume_skills:
                matched_skills = sorted([skill for skill in resume_skills if skill in job_text])
                missing_skills = sorted([skill for skill in resume_skills if skill not in job_text])
            else:
                matched_skills = []
                missing_skills = []

            result = MatchResult(
                match_pct=int(clamped_scores[idx]),
                matched_skills=matched_skills,
                missing_skills=missing_skills,
                top_keywords=self.get_top_keywords(job.description_clean or "", n=10),
            )
            job_id = str(job.id)
            results[job_id] = result
            key = self._cache_key(user_id=str(resume.user_id), job_id=job_id)
            self.redis.setex(key, self.cache_ttl_seconds, json.dumps(result.__dict__))

        return results

    def invalidate_user_cache(self, user_id: str) -> int:
        pattern = f"match:{user_id}:*"
        keys = list(self.redis.scan_iter(match=pattern))
        if not keys:
            return 0
        return cast(int, self.redis.delete(*keys))
