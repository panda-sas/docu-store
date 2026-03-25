from pydantic import BaseModel


class BlobRef(BaseModel):
    """Value object representing a reference to a blob stored in object storage."""

    model_config = {"frozen": True}

    key: str
    sha256: str
    size_bytes: int
    mime_type: str | None
    filename: str | None
