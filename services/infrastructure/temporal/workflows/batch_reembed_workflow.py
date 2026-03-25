"""Temporal workflow for batch re-embedding all pages of an artifact.

Triggered after all page summaries are complete. Runs a single activity
that batch-encodes all chunks with contextual prefixes and upserts to Qdrant.
"""

from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy


@workflow.defn(name="BatchReEmbedArtifactPagesWorkflow")
class BatchReEmbedArtifactPagesWorkflow:
    """Batch re-embed all pages of an artifact with full context prefixes."""

    @workflow.run
    async def run(self, artifact_id: str) -> dict:
        workflow.logger.info(
            f"Batch re-embed workflow started for artifact_id={artifact_id}",
        )

        retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=5),
            maximum_interval=timedelta(seconds=60),
            maximum_attempts=2,
            backoff_coefficient=2.0,
        )

        result = await workflow.execute_activity(
            "batch_reembed_artifact_pages",
            artifact_id,
            start_to_close_timeout=timedelta(minutes=30),
            retry_policy=retry_policy,
        )

        workflow.logger.info(
            f"Batch re-embed workflow completed for artifact_id={artifact_id}, result={result}",
        )

        return result
