import hashlib


def make_dedup_hash(title: str, company: str, location: str) -> str:
    canonical = f"{title.strip().lower()}::{company.strip().lower()}::{location.strip().lower()}"
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
