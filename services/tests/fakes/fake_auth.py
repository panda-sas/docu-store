"""Fake auth context for testing."""

from __future__ import annotations

from uuid import UUID, uuid4

_ROLE_HIERARCHY = {"viewer": 0, "editor": 1, "admin": 2, "owner": 3}


class FakeAuth:
    """Satisfies the AuthContext Protocol for unit tests."""

    def __init__(
        self,
        role: str = "editor",
        user_id: UUID | None = None,
        workspace_id: UUID | None = None,
    ) -> None:
        self.user_id = user_id or uuid4()
        self.workspace_id = workspace_id or uuid4()
        self.workspace_role = role
        self.is_admin = role in ("admin", "owner")

    def has_role(self, minimum_role: str) -> bool:
        return _ROLE_HIERARCHY.get(self.workspace_role, -1) >= _ROLE_HIERARCHY.get(
            minimum_role, 99,
        )
