import httpx
import pytest

from app.services.scraper import RemoteOKScraper


class FakeRedis:
    def __init__(self) -> None:
        self.storage: dict[str, str] = {}

    def set(self, name: str, value: str, nx: bool = False, ex: int | None = None) -> bool:  # noqa: ARG002
        if nx and name in self.storage:
            return False
        self.storage[name] = value
        return True


@pytest.mark.asyncio
async def test_remoteok_fetch_with_httpx_mock() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api"
        assert request.headers.get("User-Agent")
        return httpx.Response(
            status_code=200,
            json=[
                {"legal": "meta"},
                {
                    "id": 1001,
                    "url": "https://remoteok.com/remote-jobs/1001",
                    "company": "Acme",
                    "position": "Backend Engineer",
                    "location": "Remote",
                    "description": "<p>Python  FastAPI</p>",
                    "epoch": 1711737600,
                },
            ],
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        scraper = RemoteOKScraper(client=client, db=None, redis_client=FakeRedis())
        payload = await scraper.fetch()
        parsed = scraper.parse(payload)

    assert len(parsed) == 1
    assert parsed[0].company == "Acme"


def test_clean_strips_html_normalizes_whitespace_and_truncates() -> None:
    scraper = RemoteOKScraper(client=None, db=None, redis_client=FakeRedis())
    dirty = "<div>  Hello   <b>World</b>\n\nfrom\tJobRadar </div>"
    cleaned = scraper.clean(dirty)
    assert cleaned == "Hello World from JobRadar"

    very_long = "x" * 3000
    assert len(scraper.clean(very_long)) == 2000


def test_deduplicate_uses_redis_hash_key() -> None:
    redis = FakeRedis()
    scraper = RemoteOKScraper(client=None, db=None, redis_client=redis)

    dedup_hash_a, is_new_a = scraper.deduplicate("Software Engineer", "Acme", "Remote")
    dedup_hash_b, is_new_b = scraper.deduplicate("Software Engineer", "Acme", "Remote")

    assert dedup_hash_a == dedup_hash_b
    assert is_new_a is True
    assert is_new_b is False
