from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class WorkflowTypeStats(BaseModel):
    workflow_type: str
    count: int
    avg_duration_seconds: float
    min_duration_seconds: float
    max_duration_seconds: float
    p95_duration_seconds: float


class ActiveWorkflow(BaseModel):
    workflow_type: str
    count: int


class FailedWorkflow(BaseModel):
    workflow_id: str
    workflow_type: str
    started_at: datetime | None
    closed_at: datetime | None
    failure_message: str | None


class WorkflowStatsResponse(BaseModel):
    completed: list[WorkflowTypeStats]
    active: list[ActiveWorkflow]
    recent_failures: list[FailedWorkflow]


class PipelineStatsResponse(BaseModel):
    total_artifacts: int
    total_pages: int
    pages_with_text: int
    pages_with_summary: int
    pages_with_compounds: int
    pages_with_tags: int


class CollectionStats(BaseModel):
    collection_name: str
    points_count: int
    indexed_vectors_count: int
    status: str


class VectorStatsResponse(BaseModel):
    collections: list[CollectionStats]
    embedding_model: dict
    reranker: dict | None
