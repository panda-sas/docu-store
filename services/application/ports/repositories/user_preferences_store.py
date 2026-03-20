from abc import ABC, abstractmethod
from uuid import UUID

from application.dtos.user_dtos import UserPreferencesDTO


class UserPreferencesStore(ABC):
    """Simple CRUD for user preferences. NOT event-sourced.

    Preferences are operational UI metadata, not a domain concern.
    One document per (workspace_id, user_id) with partial-update semantics.
    """

    @abstractmethod
    async def get_preferences(
        self,
        workspace_id: UUID,
        user_id: UUID,
    ) -> UserPreferencesDTO:
        pass

    @abstractmethod
    async def update_preferences(
        self,
        workspace_id: UUID,
        user_id: UUID,
        updates: dict,
    ) -> UserPreferencesDTO:
        pass

    @abstractmethod
    async def ensure_indexes(self) -> None:
        pass
