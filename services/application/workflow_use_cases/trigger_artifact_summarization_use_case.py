from __future__ import annotations

from typing import TYPE_CHECKING

import structlog

from application.dtos.workflow_dtos import WorkflowStartedResponse

if TYPE_CHECKING:
    from uuid import UUID

    from application.ports.repositories.artifact_repository import ArtifactRepository
    from application.ports.repositories.page_read_models import PageReadModel
    from application.ports.workflow_orchestrator import WorkflowOrchestrator

log = structlog.get_logger(__name__)


class TriggerArtifactSummarizationUseCase:
    """Trigger the artifact summarization workflow when all pages are summarized.

    Checks that every page in the artifact has a non-empty summary_candidate before
    starting the workflow.  If any page is still pending this call is a no-op and
    returns None — the next Page.SummaryCandidateUpdated event will re-check.
    """

    def __init__(
        self,
        artifact_repository: ArtifactRepository,
        page_read_model: PageReadModel,
        workflow_orchestrator: WorkflowOrchestrator,
    ) -> None:
        self.artifact_repository = artifact_repository
        self.page_read_model = page_read_model
        self.workflow_orchestrator = workflow_orchestrator

    async def execute(self, artifact_id: UUID) -> WorkflowStartedResponse | None:
        artifact = self.artifact_repository.get_by_id(artifact_id)

        total_pages = len(artifact.pages) if artifact.pages else 0
        if total_pages == 0:
            log.info(
                "trigger_artifact_summarization.no_pages",
                artifact_id=str(artifact_id),
            )
            return None

        # Single read model count query instead of N aggregate loads.
        # Use total_pages - 1 threshold to handle eventual consistency:
        # the read model projector is a separate process and may not have
        # projected the current page's summary yet, but we KNOW the current
        # page has a summary (we received its SummaryCandidateUpdated event).
        pages_with_summaries = await self.page_read_model.count_pages_with_summaries(
            artifact_id=artifact_id,
        )

        if pages_with_summaries < total_pages - 1:
            log.debug(
                "trigger_artifact_summarization.pages_not_ready",
                artifact_id=str(artifact_id),
                have=pages_with_summaries,
                need=total_pages,
            )
            return None

        log.info(
            "trigger_artifact_summarization.all_pages_ready",
            artifact_id=str(artifact_id),
            page_count=total_pages,
        )

        workflow_id = f"artifact-summarization-{artifact_id}"
        await self.workflow_orchestrator.start_artifact_summarization_workflow(
            artifact_id=artifact_id,
        )
        return WorkflowStartedResponse(workflow_id=workflow_id)
