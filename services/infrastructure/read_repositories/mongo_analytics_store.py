"""MongoDB adapter for AnalyticsReadModel port."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from motor.motor_asyncio import AsyncIOMotorClient

from application.dtos.stats_dtos import (
    ChatLatencyStatsResponse,
    GroundingBucket,
    GroundingStatsResponse,
    SearchQualityStats,
    SearchQualityStatsResponse,
    StepLatencyStats,
    TokenUsageBucket,
    TokenUsageStatsResponse,
)


class MongoAnalyticsStore:
    """Aggregation queries over chat_messages and user_activity collections."""

    def __init__(self, client: AsyncIOMotorClient, db_name: str) -> None:
        self._db = client[db_name]

    async def get_token_usage(self, period_days: int) -> TokenUsageStatsResponse:
        since = datetime.now(UTC) - timedelta(days=period_days)

        pipeline = [
            {"$match": {"role": "assistant", "created_at": {"$gte": since}}},
            {
                "$group": {
                    "_id": {
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                        "mode": {"$ifNull": ["$query_context.query_type", "unknown"]},
                    },
                    "total_tokens": {"$sum": {"$ifNull": ["$token_usage.total", 0]}},
                    "prompt_tokens": {"$sum": {"$ifNull": ["$token_usage.prompt", 0]}},
                    "completion_tokens": {"$sum": {"$ifNull": ["$token_usage.completion", 0]}},
                    "message_count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.date": 1}},
        ]

        cursor = self._db["chat_messages"].aggregate(pipeline)
        results = await cursor.to_list(length=500)

        buckets = [
            TokenUsageBucket(
                date=r["_id"]["date"],
                mode=r["_id"]["mode"],
                total_tokens=r["total_tokens"],
                prompt_tokens=r["prompt_tokens"],
                completion_tokens=r["completion_tokens"],
                message_count=r["message_count"],
            )
            for r in results
        ]

        total_tokens = sum(b.total_tokens for b in buckets)
        total_messages = sum(b.message_count for b in buckets)

        return TokenUsageStatsResponse(
            buckets=buckets,
            total_tokens=total_tokens,
            total_messages=total_messages,
        )

    async def get_chat_latency(self, period_days: int) -> ChatLatencyStatsResponse:
        since = datetime.now(UTC) - timedelta(days=period_days)

        pipeline = [
            {"$match": {"role": "assistant", "created_at": {"$gte": since}, "agent_trace": {"$ne": None}}},
            {"$unwind": "$agent_trace.steps"},
            {
                "$project": {
                    "step_name": "$agent_trace.steps.step",
                    "duration_ms": {
                        "$cond": {
                            "if": {"$and": [
                                {"$ne": ["$agent_trace.steps.started_at", None]},
                                {"$ne": ["$agent_trace.steps.completed_at", None]},
                            ]},
                            "then": {
                                "$subtract": [
                                    {"$toLong": {"$dateFromString": {
                                        "dateString": "$agent_trace.steps.completed_at",
                                        "onError": None,
                                    }}},
                                    {"$toLong": {"$dateFromString": {
                                        "dateString": "$agent_trace.steps.started_at",
                                        "onError": None,
                                    }}},
                                ]
                            },
                            "else": None,
                        }
                    },
                }
            },
            {"$match": {"duration_ms": {"$ne": None, "$gt": 0}}},
            {"$group": {
                "_id": "$step_name",
                "durations": {"$push": "$duration_ms"},
                "count": {"$sum": 1},
                "avg_ms": {"$avg": "$duration_ms"},
                "max_ms": {"$max": "$duration_ms"},
            }},
            {"$sort": {"count": -1}},
        ]

        cursor = self._db["chat_messages"].aggregate(pipeline)
        results = await cursor.to_list(length=50)

        steps: list[StepLatencyStats] = []
        all_durations: list[float] = []
        for r in results:
            durations = sorted(r["durations"])
            count = len(durations)
            p50 = durations[count // 2] if count else 0
            p95 = durations[int(count * 0.95)] if count else 0
            steps.append(StepLatencyStats(
                step_name=r["_id"] or "unknown",
                count=count,
                avg_ms=round(r["avg_ms"], 1),
                p50_ms=round(p50, 1),
                p95_ms=round(p95, 1),
                max_ms=round(r["max_ms"], 1),
            ))
            all_durations.extend(durations)

        all_durations.sort()
        total = len(all_durations)

        return ChatLatencyStatsResponse(
            steps=steps,
            overall_avg_ms=round(sum(all_durations) / total, 1) if total else 0,
            overall_p95_ms=round(all_durations[int(total * 0.95)], 1) if total else 0,
        )

    async def get_search_quality(self, period_days: int) -> SearchQualityStatsResponse:
        since = datetime.now(UTC) - timedelta(days=period_days)

        pipeline = [
            {"$match": {"type": "search", "created_at": {"$gte": since}}},
            {
                "$group": {
                    "_id": "$search_mode",
                    "total_searches": {"$sum": 1},
                    "zero_result_count": {
                        "$sum": {"$cond": [{"$eq": [{"$ifNull": ["$result_count", 1]}, 0]}, 1, 0]}
                    },
                    "total_results": {"$sum": {"$ifNull": ["$result_count", 0]}},
                }
            },
        ]

        cursor = self._db["user_activity"].aggregate(pipeline)
        results = await cursor.to_list(length=20)

        modes: list[SearchQualityStats] = []
        grand_total = 0
        grand_zero = 0
        for r in results:
            total = r["total_searches"]
            zero = r["zero_result_count"]
            grand_total += total
            grand_zero += zero
            modes.append(SearchQualityStats(
                search_mode=r["_id"] or "unknown",
                total_searches=total,
                zero_result_count=zero,
                zero_result_rate=round(zero / total, 3) if total else 0,
                avg_result_count=round(r["total_results"] / total, 1) if total else 0,
            ))

        return SearchQualityStatsResponse(
            modes=modes,
            total_searches=grand_total,
            overall_zero_result_rate=round(grand_zero / grand_total, 3) if grand_total else 0,
        )

    async def get_grounding_stats(self, period_days: int) -> GroundingStatsResponse:
        since = datetime.now(UTC) - timedelta(days=period_days)

        pipeline = [
            {
                "$match": {
                    "role": "assistant",
                    "created_at": {"$gte": since},
                    "agent_trace.grounding_confidence": {"$ne": None},
                }
            },
            {
                "$group": {
                    "_id": {"$ifNull": ["$query_context.query_type", "unknown"]},
                    "total": {"$sum": 1},
                    "grounded": {
                        "$sum": {"$cond": [{"$eq": ["$agent_trace.grounding_is_grounded", True]}, 1, 0]}
                    },
                    "not_grounded": {
                        "$sum": {"$cond": [{"$ne": ["$agent_trace.grounding_is_grounded", True]}, 1, 0]}
                    },
                    "avg_confidence": {"$avg": "$agent_trace.grounding_confidence"},
                }
            },
        ]

        cursor = self._db["chat_messages"].aggregate(pipeline)
        results = await cursor.to_list(length=20)

        modes: list[GroundingBucket] = []
        grand_total = 0
        grand_grounded = 0
        total_confidence = 0.0
        for r in results:
            total = r["total"]
            grounded = r["grounded"]
            grand_total += total
            grand_grounded += grounded
            total_confidence += r["avg_confidence"] * total
            modes.append(GroundingBucket(
                mode=r["_id"],
                total_messages=total,
                grounded_count=grounded,
                not_grounded_count=r["not_grounded"],
                grounded_rate=round(grounded / total, 3) if total else 0,
                avg_confidence=round(r["avg_confidence"], 3),
            ))

        return GroundingStatsResponse(
            modes=modes,
            overall_grounded_rate=round(grand_grounded / grand_total, 3) if grand_total else 0,
            overall_avg_confidence=round(total_confidence / grand_total, 3) if grand_total else 0,
        )
