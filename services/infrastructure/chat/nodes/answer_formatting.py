"""Final step (all modes): Answer Formatting.

Reformats the draft answer for coherence and readability.
Preserves all citations, factual content, and technical details.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

import structlog

from infrastructure.config import settings

if TYPE_CHECKING:
    from application.ports.llm_client import LLMClientPort
    from application.ports.prompt_repository import PromptRepositoryPort

log = structlog.get_logger(__name__)


class AnswerFormattingNode:
    """Reformat a draft answer for coherence while preserving citations."""

    def __init__(
        self,
        llm_client: LLMClientPort,
        prompt_repository: PromptRepositoryPort,
    ) -> None:
        self._llm = llm_client
        self._prompts = prompt_repository

    async def run(
        self,
        question: str,
        draft_answer: str,
    ) -> AsyncGenerator[str, None]:
        """Stream the reformatted answer.

        Yields:
            String token deltas of the reformatted answer.

        """
        _debug = settings.chat_debug

        prompt = await self._prompts.render_prompt(
            "chat_answer_formatting",
            question=question,
            draft_answer=draft_answer,
        )

        if _debug:
            log.info(
                "chat.debug.answer_formatting.start",
                question_len=len(question),
                draft_len=len(draft_answer),
            )

        token_count = 0
        async for token in self._llm.stream(prompt):
            token_count += 1
            yield token

        if _debug:
            log.info("chat.debug.answer_formatting.done", tokens=token_count)
