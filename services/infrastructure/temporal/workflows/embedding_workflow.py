from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy


@workflow.defn(name="GeneratePageEmbeddingWorkflow")
class GeneratePageEmbeddingWorkflow:
    """Temporal workflow for generating page embeddings.

    This workflow orchestrates the embedding generation process,
    ensuring durability and retry logic.

    Workflow steps:
    1. Generate the embedding using the embedding generator
    2. Store it in the vector store
    3. Update the domain aggregate
    4. Log completion

    The workflow ID should be based on page_id to ensure idempotency.
    """

    @workflow.run
    async def run(self, input_data: dict | str) -> dict:
        """Execute the embedding generation workflow.

        Args:
            input_data: Either a page_id string (legacy) or a dict with
                ``page_id`` and optional ``skip_sparse`` flag.

        Returns:
            Dictionary with workflow result

        """
        if isinstance(input_data, str):
            page_id = input_data
            input_data = {"page_id": page_id, "skip_sparse": False}
        else:
            page_id = input_data["page_id"]

        workflow.logger.info(
            f"Embedding workflow started for page_id={page_id}, workflow_id={workflow.info().workflow_id}",
        )

        # Define retry policy for activities
        retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=1),
            maximum_interval=timedelta(seconds=30),
            maximum_attempts=3,
            backoff_coefficient=2.0,
        )

        # Step 1: Generate and store the embedding
        result = await workflow.execute_activity(
            "generate_page_embedding",
            input_data,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=retry_policy,
        )

        # Step 2: Log the result
        await workflow.execute_activity(
            "log_embedding_generated",
            result,
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=retry_policy,
        )

        workflow.logger.info(f"Embedding workflow completed for page_id={page_id}, result={result}")

        return result
