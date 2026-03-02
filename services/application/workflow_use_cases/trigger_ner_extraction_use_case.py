"""Trigger use case: start the NER extraction workflow for a page."""

from __future__ import annotations

from typing import TYPE_CHECKING

from application.dtos.workflow_dtos import WorkflowStartedResponse

if TYPE_CHECKING:
    from uuid import UUID

    from application.ports.workflow_orchestrator import WorkflowOrchestrator


class TriggerNERExtractionUseCase:
    def __init__(self, workflow_orchestrator: WorkflowOrchestrator) -> None:
        self.workflow_orchestrator = workflow_orchestrator

    async def execute(self, page_id: UUID) -> WorkflowStartedResponse:
        workflow_id = f"ner-extraction-{page_id}"
        await self.workflow_orchestrator.start_ner_extraction_workflow(page_id=page_id)
        return WorkflowStartedResponse(workflow_id=workflow_id)
