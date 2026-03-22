"""Router that dispatches to Quick or Thinking chat agent."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Literal
from uuid import UUID

from application.dtos.chat_dtos import AgentEvent, ChatMessageDTO
from application.ports.chat_agent import ChatAgentPort


class ChatAgentRouter:
    """Routes to Quick or Thinking agent based on mode selection."""

    def __init__(
        self,
        quick_agent: ChatAgentPort,
        thinking_agent: ChatAgentPort,
        default_mode: Literal["quick", "thinking"] = "thinking",
    ) -> None:
        self._quick = quick_agent
        self._thinking = thinking_agent
        self._default_mode = default_mode

    async def run(
        self,
        message: str,
        conversation_history: list[ChatMessageDTO],
        workspace_id: UUID,
        allowed_artifact_ids: list[UUID] | None = None,
        mode: Literal["quick", "thinking"] | None = None,
    ) -> AsyncGenerator[AgentEvent, None]:
        effective_mode = mode or self._default_mode
        agent = self._thinking if effective_mode == "thinking" else self._quick

        async for event in agent.run(
            message=message,
            conversation_history=conversation_history,
            workspace_id=workspace_id,
            allowed_artifact_ids=allowed_artifact_ids,
        ):
            yield event
