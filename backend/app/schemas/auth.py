from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr = Field(description="User email address")
    full_name: str = Field(min_length=2, max_length=255, description="User full name")
    password: str = Field(min_length=8, max_length=128, description="Plaintext password")

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if not any(char.isupper() for char in value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.islower() for char in value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must contain at least one digit")
        return value


class LoginRequest(BaseModel):
    email: EmailStr = Field(description="User email address")
    password: str = Field(min_length=8, max_length=128, description="Plaintext password")


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=16, description="Refresh token JWT")


class TokenPairResponse(BaseModel):
    access_token: str = Field(description="JWT access token")
    refresh_token: str = Field(description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
