from types import SimpleNamespace

from app.services.matcher_service import MatcherService


class FakeRedis:
    def __init__(self) -> None:
        self.storage: dict[str, str] = {}

    def get(self, key: str):
        return self.storage.get(key)

    def setex(self, key: str, _ttl: int, value: str) -> None:
        self.storage[key] = value


def test_matcher_compute_returns_bounded_score() -> None:
    matcher = MatcherService(redis_client=FakeRedis())
    resume = SimpleNamespace(id="resume1", extracted_text="Python FastAPI Docker", parsed_skills=["python", "fastapi", "docker"])
    job = SimpleNamespace(id="job1", description_clean="We need Python and Docker expertise")

    result = matcher.compute(resume, job)
    assert 0 <= result.score <= 100
    assert "python" in result.top_matched_skills
