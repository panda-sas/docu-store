from abc import ABC, abstractmethod
from uuid import UUID

from application.dtos.page_dtos import PageResponse


class PageReadModel(ABC):
    @abstractmethod
    async def get_page_by_id(
        self,
        page_id: UUID,
        workspace_id: UUID | None = None,
    ) -> PageResponse | None:
        pass

    @abstractmethod
    async def get_pages_by_id(
        self,
        page_ids: list[UUID],
        workspace_id: UUID | None = None,
    ) -> list[PageResponse]:
        pass

    @abstractmethod
    async def count_pages_with_summaries(self, artifact_id: UUID) -> int:
        """Count pages belonging to an artifact that have a non-empty summary."""
        pass
