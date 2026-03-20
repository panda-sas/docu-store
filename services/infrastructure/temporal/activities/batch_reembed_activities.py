"""Temporal activity for batch re-embedding artifact pages."""

from collections.abc import Callable
from uuid import UUID

import structlog
from temporalio import activity

from application.use_cases.batch_reembed_use_cases import BatchReEmbedArtifactPagesUseCase

logger = structlog.get_logger()


def create_batch_reembed_artifact_pages_activity(
    use_case: BatchReEmbedArtifactPagesUseCase,
) -> Callable[[str], dict]:
    """Create the batch_reembed_artifact_pages activity with injected dependencies."""

    @activity.defn(name="batch_reembed_artifact_pages")
    async def batch_reembed_artifact_pages_activity(artifact_id: str) -> dict:
        logger.info("batch_reembed_activity_start", artifact_id=artifact_id)

        try:
            result = await use_case.execute(artifact_id=UUID(artifact_id))
        except Exception as e:
            logger.exception(
                "batch_reembed_activity_exception",
                artifact_id=artifact_id,
                error=str(e),
            )
            raise
        else:
            logger.info(
                "batch_reembed_activity_complete",
                artifact_id=artifact_id,
                status=result.get("status"),
                page_count=result.get("page_count", 0),
                chunk_count=result.get("chunk_count", 0),
            )
            return result

    return batch_reembed_artifact_pages_activity
