"""Trigger use case: start the artifact tag aggregation workflow.

Uses artifact_id (not page_id) as the workflow ID to prevent duplicate
parallel aggregation runs when multiple pages complete NER simultaneously.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from application.dtos.workflow_dtos import WorkflowStartedResponse

if TYPE_CHECKING:
    from uuid import UUID

    from application.ports.repositories.page_repository import PageRepository
    from application.ports.workflow_orchestrator import WorkflowOrchestrator


class TriggerArtifactTagAggregationUseCase:
    def __init__(
        self,
        page_repository: PageRepository,
        workflow_orchestrator: WorkflowOrchestrator,
    ) -> None:
        self.page_repository = page_repository
        self.workflow_orchestrator = workflow_orchestrator

    async def execute(self, page_id: UUID) -> WorkflowStartedResponse:
        page = self.page_repository.get_by_id(page_id)
        artifact_id = page.artifact_id
        workflow_id = f"artifact-tag-aggregation-{artifact_id}"
        await self.workflow_orchestrator.start_artifact_tag_aggregation_workflow(
            artifact_id=artifact_id,
        )
        return WorkflowStartedResponse(workflow_id=workflow_id)
