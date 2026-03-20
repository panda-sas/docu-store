from abc import ABC, abstractmethod
from uuid import UUID

from application.dtos.dashboard_dtos import DashboardStatsResponse


class DashboardReadModel(ABC):
    @abstractmethod
    async def get_dashboard_stats(
        self,
        workspace_id: UUID | None = None,
        allowed_artifact_ids: list[UUID] | None = None,
    ) -> DashboardStatsResponse:
        pass
