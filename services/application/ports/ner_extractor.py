"""Port for Named Entity Recognition extraction."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class NEREntity:
    """A single named entity extracted from text."""

    text: str
    entity_type: str
    confidence: float | None = None
    attributes: dict[str, str] = field(default_factory=dict)


class NERExtractorPort(Protocol):
    """Abstract port for NER extraction.

    Implementations may use LLM-based or dictionary-based extraction.
    Both fast and LLM modes share this interface.
    """

    async def extract(self, text: str) -> list[NEREntity]:
        """Extract named entities from text.

        Args:
            text: Plain text to extract entities from.

        Returns:
            List of extracted entities with type and confidence.

        """
        ...
