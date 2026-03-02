from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy


@workflow.defn(name="NERExtractionWorkflow")
class NERExtractionWorkflow:
    """Run fast + LLM NER on a page and persist TagMentions.

    LLM calls are slow (10-60 s); timeout and retries are set accordingly.
    """

    @workflow.run
    async def run(self, page_id: str) -> dict:
        retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=10),
            maximum_interval=timedelta(seconds=120),
            maximum_attempts=3,
            backoff_coefficient=2.0,
        )

        result = await workflow.execute_activity(
            "extract_page_entities",
            page_id,
            start_to_close_timeout=timedelta(minutes=10),
            retry_policy=retry_policy,
        )

        workflow.logger.info(
            f"NER extraction workflow completed for page_id={page_id}, result={result}",
        )
        return result


@workflow.defn(name="ArtifactTagAggregationWorkflow")
class ArtifactTagAggregationWorkflow:
    """Aggregate NER tags from all pages into artifact-level tags."""

    @workflow.run
    async def run(self, artifact_id: str) -> dict:
        retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=5),
            maximum_interval=timedelta(seconds=60),
            maximum_attempts=3,
            backoff_coefficient=2.0,
        )

        result = await workflow.execute_activity(
            "aggregate_artifact_tags",
            artifact_id,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=retry_policy,
        )

        workflow.logger.info(
            f"Artifact tag aggregation completed for artifact_id={artifact_id}, result={result}",
        )
        return result
