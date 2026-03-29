from app.utils.hash import make_dedup_hash


def test_make_dedup_hash_is_stable() -> None:
    first = make_dedup_hash("Software Engineer", "Acme", "Remote")
    second = make_dedup_hash("software engineer", "acme", "remote")
    assert first == second


def test_make_dedup_hash_changes_on_input_change() -> None:
    one = make_dedup_hash("Software Engineer", "Acme", "Remote")
    two = make_dedup_hash("Backend Engineer", "Acme", "Remote")
    assert one != two
