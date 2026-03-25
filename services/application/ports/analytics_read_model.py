"""Port for analytics aggregation queries."""

from __future__ import annotations

from typing import Protocol

from application.dtos.stats_dtos import (
    ChatLatencyStatsResponse,
    GroundingStatsResponse,
    SearchQualityStatsResponse,
    TokenUsageStatsResponse,
)


class AnalyticsReadModel(Protocol):
    """Read-only queries for analytics aggregation dashboards."""

    async def get_token_usage(self, period_days: int) -> TokenUsageStatsResponse: ...

    async def get_chat_latency(self, period_days: int) -> ChatLatencyStatsResponse: ...

    async def get_search_quality(self, period_days: int) -> SearchQualityStatsResponse: ...

    async def get_grounding_stats(self, period_days: int) -> GroundingStatsResponse: ...
