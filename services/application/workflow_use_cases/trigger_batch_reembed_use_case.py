"""Trigger the batch re-embed workflow for an artifact."""

from __future__ import annotations

from typing import TYPE_CHECKING

import structlog

from application.dtos.workflow_dtos import WorkflowStartedResponse

if TYPE_CHECKING:
    from uuid import UUID

    from application.ports.workflow_orchestrator import WorkflowOrchestrator

log = structlog.get_logger(__name__)


class TriggerBatchReEmbedUseCase:
    """Start the batch re-embed workflow for an artifact.

    Called when all page summaries are complete so that every page's
    chunk embeddings get the full contextual prefix (title + tags + summary)
    in a single batched encoding call.
    """

    def __init__(self, workflow_orchestrator: WorkflowOrchestrator) -> None:
        self.workflow_orchestrator = workflow_orchestrator

    async def execute(self, artifact_id: UUID) -> WorkflowStartedResponse:
        workflow_id = f"batch-reembed-{artifact_id}"
        await self.workflow_orchestrator.start_batch_reembed_workflow(
            artifact_id=artifact_id,
        )
        log.info(
            "trigger_batch_reembed.started",
            artifact_id=str(artifact_id),
            workflow_id=workflow_id,
        )
        return WorkflowStartedResponse(workflow_id=workflow_id)
