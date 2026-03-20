from abc import ABC, abstractmethod
from uuid import UUID

from application.dtos.user_dtos import RecentDocumentEntry, SearchHistoryEntry


class UserActivityStore(ABC):
    """Append-only activity tracking. NOT event-sourced.

    Stores search queries and document opens per user per workspace.
    TTL-indexed for automatic cleanup.
    """

    @abstractmethod
    async def record_search(
        self,
        workspace_id: UUID,
        user_id: UUID,
        query_text: str,
        search_mode: str,
        result_count: int | None = None,
    ) -> None:
        pass

    @abstractmethod
    async def record_document_open(
        self,
        workspace_id: UUID,
        user_id: UUID,
        artifact_id: str,
        artifact_title: str | None = None,
    ) -> None:
        pass

    @abstractmethod
    async def get_recent_searches(
        self,
        workspace_id: UUID,
        user_id: UUID,
        limit: int = 20,
    ) -> list[SearchHistoryEntry]:
        pass

    @abstractmethod
    async def get_recent_documents(
        self,
        workspace_id: UUID,
        user_id: UUID,
        limit: int = 20,
    ) -> list[RecentDocumentEntry]:
        pass

    @abstractmethod
    async def delete_search_entry(
        self,
        workspace_id: UUID,
        user_id: UUID,
        query_text: str,
    ) -> None:
        pass

    @abstractmethod
    async def clear_search_history(
        self,
        workspace_id: UUID,
        user_id: UUID,
    ) -> None:
        pass

    @abstractmethod
    async def ensure_indexes(self) -> None:
        pass
