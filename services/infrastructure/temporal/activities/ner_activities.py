from collections.abc import Callable
from uuid import UUID

import structlog
from returns.result import Success
from temporalio import activity

from application.use_cases.aggregate_artifact_tags_use_case import AggregateArtifactTagsUseCase
from application.use_cases.extract_page_entities_use_case import ExtractPageEntitiesUseCase

logger = structlog.get_logger()


def create_extract_page_entities_activity(
    use_case: ExtractPageEntitiesUseCase,
) -> Callable[[str], dict]:
    """Create the extract_page_entities activity with injected dependencies."""

    @activity.defn(name="extract_page_entities")
    async def extract_page_entities_activity(page_id: str) -> dict:
        logger.info("extract_page_entities_activity.start", page_id=page_id)

        try:
            page_uuid = UUID(page_id)
            result = await use_case.execute(page_id=page_uuid)
        except Exception as e:
            logger.exception(
                "extract_page_entities_activity.exception",
                page_id=page_id,
                error=str(e),
            )
            raise
        else:
            if isinstance(result, Success):
                payload = result.unwrap()
                logger.info(
                    "extract_page_entities_activity.success",
                    page_id=page_id,
                    entity_count=payload.get("entity_count", 0),
                    status=payload.get("status"),
                )
                return payload

            error = result.failure()
            logger.error(
                "extract_page_entities_activity.failed",
                page_id=page_id,
                error_code=error.category,
                error_message=error.message,
            )
            if error.category == "concurrency":
                msg = f"Concurrency conflict (will retry): {error.message}"
                raise RuntimeError(msg)
            return {
                "status": "failed",
                "page_id": page_id,
                "error_code": error.category,
                "error_message": error.message,
            }

    return extract_page_entities_activity


def create_aggregate_artifact_tags_activity(
    use_case: AggregateArtifactTagsUseCase,
) -> Callable[[str], dict]:
    """Create the aggregate_artifact_tags activity with injected dependencies."""

    @activity.defn(name="aggregate_artifact_tags")
    async def aggregate_artifact_tags_activity(artifact_id: str) -> dict:
        logger.info("aggregate_artifact_tags_activity.start", artifact_id=artifact_id)

        try:
            artifact_uuid = UUID(artifact_id)
            result = await use_case.execute(artifact_id=artifact_uuid)
        except Exception as e:
            logger.exception(
                "aggregate_artifact_tags_activity.exception",
                artifact_id=artifact_id,
                error=str(e),
            )
            raise
        else:
            if isinstance(result, Success):
                payload = result.unwrap()
                logger.info(
                    "aggregate_artifact_tags_activity.success",
                    artifact_id=artifact_id,
                    tag_count=payload.get("tag_count", 0),
                )
                return payload

            error = result.failure()
            logger.error(
                "aggregate_artifact_tags_activity.failed",
                artifact_id=artifact_id,
                error_code=error.category,
                error_message=error.message,
            )
            if error.category == "concurrency":
                msg = f"Concurrency conflict (will retry): {error.message}"
                raise RuntimeError(msg)
            return {
                "status": "failed",
                "artifact_id": artifact_id,
                "error_code": error.category,
                "error_message": error.message,
            }

    return aggregate_artifact_tags_activity
