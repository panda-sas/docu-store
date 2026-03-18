"""DTOs for entity-level permission operations (sharing, visibility)."""

from uuid import UUID

from pydantic import BaseModel, Field


class ShareResourceRequest(BaseModel):
    grantee_type: str = Field(pattern=r"^(user|group)$")
    grantee_id: UUID
    permission: str = Field(default="view", pattern=r"^(view|edit)$")


class UpdateVisibilityRequest(BaseModel):
    visibility: str = Field(pattern=r"^(private|workspace)$")
