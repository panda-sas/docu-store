"""Shared utilities for the chat/RAG pipeline."""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from application.dtos.chat_dtos import ChatMessageDTO

CITATION_RE = re.compile(r"\[(\d{1,2})\]")


def extract_cited_indices(answer: str) -> set[int]:
    """Extract the set of citation indices actually used in the answer text."""
    return {int(m) for m in CITATION_RE.findall(answer)}


def build_conversation_context(
    history: list[ChatMessageDTO],
    max_chars: int = 300,
) -> str:
    """Build a concise context string from recent conversation history."""
    if not history:
        return ""
    lines = []
    for msg in history[-6:]:
        role = "User" if msg.role == "user" else "Assistant"
        lines.append(f"{role}: {msg.content[:max_chars]}")
    return "\n".join(lines)


def strip_markdown_fences(text: str) -> str:
    """Remove markdown code fences wrapping JSON output from LLMs."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
    return cleaned
