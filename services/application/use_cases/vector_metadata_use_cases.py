"""Use cases for updating vector store metadata without re-embedding.

These use cases patch Qdrant payloads (tags, entity types) on existing points
using set_payload — no vector regeneration needed.
"""

from uuid import UUID

import structlog

from application.ports.repositories.page_repository import PageRepository
from application.ports.summary_vector_store import SummaryVectorStore
from application.ports.vector_store import VectorStore
from domain.exceptions import AggregateNotFoundError

logger = structlog.get_logger()


def _build_tag_payload(tag_mentions: list | None) -> dict:
    """Build the tag-related payload fields from tag mentions."""
    if not tag_mentions:
        return {"tags": [], "tag_normalized": [], "entity_types": []}

    tags = [tm.tag for tm in tag_mentions]
    tag_normalized = [tm.tag.lower() for tm in tag_mentions]
    entity_types = sorted({tm.entity_type for tm in tag_mentions if tm.entity_type})

    return {
        "tags": tags,
        "tag_normalized": tag_normalized,
        "entity_types": entity_types,
    }


class SyncPageTagsToVectorStoreUseCase:
    """Sync page tags to Qdrant payloads on both page_embeddings and summary_embeddings.

    Triggered by Page.TagMentionsUpdated — patches existing points without re-embedding.
    """

    def __init__(
        self,
        page_repository: PageRepository,
        vector_store: VectorStore,
        summary_vector_store: SummaryVectorStore,
    ) -> None:
        self.page_repository = page_repository
        self.vector_store = vector_store
        self.summary_vector_store = summary_vector_store

    async def execute(self, page_id: UUID) -> None:
        try:
            page = self.page_repository.get_by_id(page_id)
        except AggregateNotFoundError:
            logger.warning("sync_tags_page_not_found", page_id=str(page_id))
            return

        tag_payload = _build_tag_payload(page.tag_mentions)

        # Patch page_embeddings (all chunk points for this page)
        await self.vector_store.set_page_payload(page_id, tag_payload)

        # Patch summary_embeddings (page summary point, if it exists)
        await self.summary_vector_store.set_summary_payload("page", page_id, tag_payload)

        logger.info(
            "page_tags_synced_to_vector_stores",
            page_id=str(page_id),
            tag_count=len(tag_payload["tags"]),
        )
