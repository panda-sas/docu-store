"""Port for the agentic RAG chat pipeline."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Literal, Protocol
from uuid import UUID

from application.dtos.chat_dtos import AgentEvent, ChatMessageDTO


class ChatAgentPort(Protocol):
    """Runs the multi-step agent pipeline and yields streaming events.

    Supports two modes:
    - quick: 4-step linear pipeline (Question Analysis → Retrieval → Synthesis → Grounding)
    - thinking: 5-stage advanced pipeline (Planning → Intelligent Retrieval → Assembly → Adaptive Synthesis → Inline Verification)
    """

    async def run(
        self,
        message: str,
        conversation_history: list[ChatMessageDTO],
        workspace_id: UUID,
        allowed_artifact_ids: list[UUID] | None = None,
        mode: Literal["quick", "thinking", "deep_thinking"] | None = None,
    ) -> AsyncGenerator[AgentEvent, None]: ...
