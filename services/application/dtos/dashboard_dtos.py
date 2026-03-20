from pydantic import BaseModel, Field


class DashboardStatsResponse(BaseModel):
    """Aggregate statistics for the workspace dashboard."""

    total_artifacts: int = Field(..., description="Total number of artifacts")
    total_pages: int = Field(..., description="Total pages across all artifacts")
    total_compounds: int = Field(..., description="Total compound mentions across all pages")
    with_summary: int = Field(..., description="Artifacts that have a generated summary")
