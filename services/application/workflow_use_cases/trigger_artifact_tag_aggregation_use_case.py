"""Trigger use case: start the artifact tag aggregation workflow.

Uses artifact_id (not page_id) as the workflow ID to prevent duplicate
parallel aggregation runs when multiple pages complete NER simultaneously.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from application.dtos.workflow_dtos import WorkflowStartedResponse

if TYPE_CHECKING:
    from uuid import UUID

    from application.ports.workflow_orchestrator import WorkflowOrchestrator


class TriggerArtifactTagAggregationUseCase:
    def __init__(
        self,
        workflow_orchestrator: WorkflowOrchestrator,
    ) -> None:
        self.workflow_orchestrator = workflow_orchestrator

    async def execute(self, artifact_id: UUID) -> WorkflowStartedResponse:
        workflow_id = f"artifact-tag-aggregation-{artifact_id}"
        await self.workflow_orchestrator.start_artifact_tag_aggregation_workflow(
            artifact_id=artifact_id,
        )
        return WorkflowStartedResponse(workflow_id=workflow_id)
