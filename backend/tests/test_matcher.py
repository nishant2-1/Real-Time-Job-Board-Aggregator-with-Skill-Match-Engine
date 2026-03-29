from types import SimpleNamespace

from app.services.matcher import SkillMatcher


class FakeRedis:
    def __init__(self) -> None:
        self.storage: dict[str, str] = {}
        self.setex_calls = 0

    def get(self, key: str):
        return self.storage.get(key)

    def setex(self, key: str, _ttl: int, value: str) -> None:
        self.setex_calls += 1
        self.storage[key] = value

    def scan_iter(self, match: str):
        prefix = match.replace("*", "")
        for key in self.storage.keys():
            if key.startswith(prefix):
                yield key

    def delete(self, *keys: str) -> int:
        deleted = 0
        for key in keys:
            if key in self.storage:
                del self.storage[key]
                deleted += 1
        return deleted


def test_compute_match_returns_bounded_score_and_skills() -> None:
    matcher = SkillMatcher(redis_client=FakeRedis())
    resume = SimpleNamespace(
        id="resume1",
        user_id="user1",
        extracted_text="Python FastAPI Docker Kubernetes",
        parsed_skills=["python", "fastapi", "docker", "kubernetes"],
    )
    job = SimpleNamespace(id="job1", description_clean="We need Python and Docker expertise")

    result = matcher.compute_match(resume, job)

    assert 0 <= result.match_pct <= 100
    assert "python" in result.matched_skills
    assert "kubernetes" in result.missing_skills


def test_batch_match_consistent_with_compute_match() -> None:
    redis = FakeRedis()
    matcher = SkillMatcher(redis_client=redis)
    resume = SimpleNamespace(
        id="resume1",
        user_id="user1",
        extracted_text="Python FastAPI Docker Kubernetes",
        parsed_skills=["python", "fastapi", "docker", "kubernetes"],
    )
    jobs = [
        SimpleNamespace(id="job1", description_clean="Python Docker backend role"),
        SimpleNamespace(id="job2", description_clean="React frontend role"),
    ]

    batch_results = matcher.batch_match(resume, jobs)
    single_result = matcher.compute_match(resume, jobs[0])

    assert "job1" in batch_results
    assert "job2" in batch_results
    assert abs(batch_results["job1"].match_pct - single_result.match_pct) <= 1


def test_compute_match_uses_redis_cache_hit() -> None:
    redis = FakeRedis()
    matcher = SkillMatcher(redis_client=redis)
    resume = SimpleNamespace(
        id="resume1",
        user_id="user1",
        extracted_text="Python FastAPI Docker",
        parsed_skills=["python", "fastapi", "docker"],
    )
    job = SimpleNamespace(id="job1", description_clean="We need Python and Docker expertise")

    first = matcher.compute_match(resume, job)
    set_calls_after_first = redis.setex_calls
    second = matcher.compute_match(resume, job)

    assert first.match_pct == second.match_pct
    assert redis.setex_calls == set_calls_after_first


def test_invalidate_user_cache_deletes_user_keys() -> None:
    redis = FakeRedis()
    matcher = SkillMatcher(redis_client=redis)
    redis.setex("match:user1:job1", 3600, "x")
    redis.setex("match:user1:job2", 3600, "y")
    redis.setex("match:user2:job1", 3600, "z")

    deleted = matcher.invalidate_user_cache("user1")

    assert deleted == 2
    assert "match:user2:job1" in redis.storage
