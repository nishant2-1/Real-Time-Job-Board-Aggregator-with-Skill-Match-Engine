from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_and_verify() -> None:
    plain = "StrongPass123"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed)


def test_access_token_round_trip() -> None:
    token = create_access_token("user-id")
    payload = decode_token(token)
    assert payload["sub"] == "user-id"


def test_refresh_token_round_trip() -> None:
    token = create_refresh_token("user-id")
    payload = decode_token(token, refresh=True)
    assert payload["sub"] == "user-id"
