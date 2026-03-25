"""Stage 1 (Thinking Mode): Query Planning & Decomposition.

Three parallel tracks: NER extraction + GLiNER2 author detection + LLM planning.
"""

from __future__ import annotations

import asyncio
import json
from typing import TYPE_CHECKING

import structlog

from infrastructure.chat.models import (
    QUERY_FILTER_ENTITY_TYPES,
    NEREntityFilter,
    QueryPlan,
)
from infrastructure.chat.utils import build_follow_up_context, strip_markdown_fences
from infrastructure.config import settings

if TYPE_CHECKING:
    from application.dtos.chat_dtos import ChatMessageDTO
    from application.ports.llm_client import LLMClientPort
    from application.ports.ner_extractor import NERExtractorPort
    from application.ports.prompt_repository import PromptRepositoryPort
    from application.ports.structured_extractor import StructuredExtractorPort

log = structlog.get_logger(__name__)

# GLiNER2 schema for author/person extraction
_AUTHOR_SCHEMA = [
    "author_name::person::Author or person name mentioned in the text",
]


class QueryPlanningNode:
    """Classify the query, decompose sub-queries, extract NER entities + authors."""

    def __init__(
        self,
        llm_client: LLMClientPort,
        prompt_repository: PromptRepositoryPort,
        ner_extractor: NERExtractorPort,
        structured_extractor: StructuredExtractorPort,
    ) -> None:
        self._llm = llm_client
        self._prompts = prompt_repository
        self._ner = ner_extractor
        self._structured_extractor = structured_extractor

    async def run(
        self,
        question: str,
        conversation_history: list[ChatMessageDTO],
    ) -> tuple[QueryPlan, str]:
        """Return (plan, raw_llm_output) — raw output is the LLM's reasoning."""
        conversation_context = build_follow_up_context(conversation_history)
        _debug = settings.chat_debug

        if _debug:
            log.info(
                "chat.debug.planning.start",
                question_len=len(question),
                history_len=len(conversation_history),
            )

        # Run all 3 extractors in parallel
        ner_task = self._run_ner(question)
        author_task = self._run_author_detection(question)
        llm_task = self._run_llm_planning(question, conversation_context)

        ner_filters, author_mentions, llm_result = await asyncio.gather(
            ner_task,
            author_task,
            llm_task,
            return_exceptions=True,
        )

        # Handle individual failures gracefully
        if isinstance(ner_filters, BaseException):
            log.warning("chat.planning.ner_failed", error=str(ner_filters))
            ner_filters = []
        if isinstance(author_mentions, BaseException):
            log.warning("chat.planning.author_failed", error=str(author_mentions))
            author_mentions = []
        raw_llm_output = ""
        if isinstance(llm_result, BaseException):
            log.warning("chat.planning.llm_failed", error=str(llm_result))
            llm_plan = _default_llm_plan(question)
        else:
            llm_plan, raw_llm_output = llm_result

        # Merge into QueryPlan
        plan = llm_plan.model_copy(
            update={
                "ner_entity_filters": ner_filters,
                "author_mentions": author_mentions,
            },
        )

        # Merge NER context from previous grounded turns
        plan = self._merge_ner_context(plan, conversation_history)

        if _debug:
            log.info(
                "chat.debug.planning.done",
                query_type=plan.query_type,
                strategy=plan.search_strategy,
                confidence=plan.confidence,
                sub_queries=plan.sub_queries,
                ner_filters=[(f.entity_text, f.entity_type) for f in plan.ner_entity_filters],
                author_mentions=plan.author_mentions,
                hyde=plan.hyde_hypothesis is not None,
            )

        return plan, raw_llm_output

    async def _run_ner(self, question: str) -> list[NEREntityFilter]:
        """Extract entities via StructfloNER, filter to whitelist."""
        entities = await self._ner.extract(question)

        filters = []
        for ent in entities:
            if ent.entity_type in QUERY_FILTER_ENTITY_TYPES:
                filters.append(
                    NEREntityFilter(entity_text=ent.text, entity_type=ent.entity_type),
                )

        log.info(
            "chat.planning.ner_done",
            total_entities=len(entities),
            filtered=len(filters),
            types=[f.entity_type for f in filters],
        )
        return filters

    async def _run_author_detection(self, question: str) -> list[str]:
        """Extract author/person names via GLiNER2."""
        fields = await self._structured_extractor.extract(
            question,
            _AUTHOR_SCHEMA,
            threshold=0.4,
        )
        authors = [f.value for f in fields if f.name == "author_name" and f.value.strip()]
        log.info("chat.planning.authors_done", count=len(authors), authors=authors)
        return authors

    async def _run_llm_planning(
        self,
        question: str,
        conversation_context: str,
    ) -> tuple[QueryPlan, str]:
        """LLM call for query classification, sub-queries, HyDE, confidence.

        Returns (plan, raw_llm_output).
        """
        enable_sub = (
            "ENABLED — decompose if multi-faceted"
            if settings.chat_enable_sub_queries
            else "DISABLED — leave empty"
        )
        enable_hyde = (
            "ENABLED — generate for exploratory queries"
            if settings.chat_enable_hyde
            else "DISABLED — set to null"
        )

        prompt = await self._prompts.render_prompt(
            "chat_query_planning",
            question=question,
            conversation_context=conversation_context or "No prior conversation.",
            enable_sub_queries=enable_sub,
            enable_hyde=enable_hyde,
        )

        if settings.chat_debug:
            log.info("chat.debug.planning.llm_prompt", prompt_len=len(prompt), preview=prompt[:500])

        raw = await self._llm.complete(prompt)

        if settings.chat_debug:
            log.info("chat.debug.planning.llm_raw", raw_len=len(raw), raw=raw[:1000])

        cleaned = strip_markdown_fences(raw)

        data = json.loads(cleaned)

        # Clamp sub_queries to max 3
        if "sub_queries" in data and len(data["sub_queries"]) > 3:
            data["sub_queries"] = data["sub_queries"][:3]

        return QueryPlan(**data), raw

    def _merge_ner_context(
        self,
        plan: QueryPlan,
        conversation_history: list[ChatMessageDTO],
    ) -> QueryPlan:
        """Merge NER entities from previous grounded turns into the current plan.

        Merge strategy based on query_type:
        - follow_up + no new NER → inherit grounded entities
        - follow_up + new NER → union (new wins on entity_text conflict)
        - not follow_up + overlap with accumulated → union (continuation)
        - not follow_up + no overlap → new only (topic switch)
        """
        # Scan last 3 grounded assistant messages for accumulated context
        accumulated_entities: list[NEREntityFilter] = []
        accumulated_authors: list[str] = []

        grounded_msgs = [
            m
            for m in conversation_history
            if m.role == "assistant" and m.query_context is not None and m.query_context.grounded
        ]

        for msg in grounded_msgs[-3:]:
            qc = msg.query_context
            assert qc is not None  # noqa: S101
            for ent in qc.ner_entities:
                if ent.get("entity_text") and ent.get("entity_type"):
                    accumulated_entities.append(
                        NEREntityFilter(
                            entity_text=ent["entity_text"],
                            entity_type=ent["entity_type"],
                        ),
                    )
            accumulated_authors.extend(qc.authors)

        if not accumulated_entities and not accumulated_authors:
            if settings.chat_debug:
                log.info(
                    "chat.debug.planning.ner_merge_skip",
                    reason="no_accumulated_context",
                    grounded_msgs=len(grounded_msgs),
                    current_ner=[f.entity_text for f in plan.ner_entity_filters],
                )
            return plan

        # Deduplicate accumulated
        seen_ent: set[str] = set()
        deduped_entities: list[NEREntityFilter] = []
        for e in accumulated_entities:
            key = e.entity_text.lower()
            if key not in seen_ent:
                seen_ent.add(key)
                deduped_entities.append(e)

        seen_auth: set[str] = set()
        deduped_authors: list[str] = []
        for a in accumulated_authors:
            key = a.lower()
            if key not in seen_auth:
                seen_auth.add(key)
                deduped_authors.append(a)

        new_ent_texts = {f.entity_text.lower() for f in plan.ner_entity_filters}
        new_author_texts = {a.lower() for a in plan.author_mentions}
        acc_ent_texts = {e.entity_text.lower() for e in deduped_entities}

        is_follow_up = plan.query_type == "follow_up"
        has_new_ner = bool(plan.ner_entity_filters)
        has_overlap = bool(new_ent_texts & acc_ent_texts)

        if is_follow_up and not has_new_ner:
            # Inherit all grounded entities
            merged_entities = deduped_entities
            merged_authors = deduped_authors
        elif is_follow_up and has_new_ner:
            # Union — new wins on conflict
            merged_entities = list(plan.ner_entity_filters)
            for e in deduped_entities:
                if e.entity_text.lower() not in new_ent_texts:
                    merged_entities.append(e)
            merged_authors = list(plan.author_mentions)
            for a in deduped_authors:
                if a.lower() not in new_author_texts:
                    merged_authors.append(a)
        elif not is_follow_up and has_overlap:
            # Continuation — union
            merged_entities = list(plan.ner_entity_filters)
            for e in deduped_entities:
                if e.entity_text.lower() not in new_ent_texts:
                    merged_entities.append(e)
            merged_authors = list(plan.author_mentions)
            for a in deduped_authors:
                if a.lower() not in new_author_texts:
                    merged_authors.append(a)
        else:
            # Topic switch — keep new only
            if settings.chat_debug:
                log.info(
                    "chat.debug.planning.ner_merge_skip",
                    reason="topic_switch",
                    current_ner=[f.entity_text for f in plan.ner_entity_filters],
                    accumulated_ner=[e.entity_text for e in deduped_entities],
                )
            return plan

        log.info(
            "chat.planning.ner_merged",
            original_ner=[f.entity_text for f in plan.ner_entity_filters],
            merged_ner=[f.entity_text for f in merged_entities],
            original_authors=plan.author_mentions,
            merged_authors=merged_authors,
            strategy="follow_up_inherit"
            if is_follow_up and not has_new_ner
            else "union"
            if is_follow_up or has_overlap
            else "new_only",
        )

        return plan.model_copy(
            update={
                "ner_entity_filters": merged_entities,
                "author_mentions": merged_authors,
            },
        )


def _default_llm_plan(question: str) -> QueryPlan:
    """Fallback plan when LLM planning fails."""
    return QueryPlan(
        query_type="factual",
        reformulated_query=question,
        search_strategy="hierarchical",
        confidence=0.5,
        summary=question[:200],
    )
