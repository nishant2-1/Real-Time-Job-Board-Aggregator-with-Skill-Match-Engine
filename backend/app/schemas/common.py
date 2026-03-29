from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(description="Machine-readable error code")
    message: str = Field(description="Human-readable error message")
    details: list[str] = Field(default_factory=list, description="Optional error details")


class ErrorResponse(BaseModel):
    error: ErrorDetail


class PaginatedMeta(BaseModel):
    total_count: int = Field(ge=0, description="Total number of records")
    page: int = Field(ge=1, description="Current page number")
    limit: int = Field(ge=1, le=100, description="Page size")
