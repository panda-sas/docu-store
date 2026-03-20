"""One-time script to populate the tag_dictionary collection from existing artifacts.

Reads tag_mentions, author_mentions, and presentation_date from the artifact
read model and materializes them into the tag_dictionary collection using
$merge for idempotent upserts.

Usage:
    uv run python scripts/backfill_tag_dictionary.py
"""

from __future__ import annotations

import asyncio

import structlog
from motor.motor_asyncio import AsyncIOMotorClient

from infrastructure.config import settings

logger = structlog.get_logger()


async def backfill() -> None:
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db]
    artifacts = db[settings.mongo_artifacts_collection]
    tag_dict = db[settings.mongo_tag_dictionary_collection]

    # Drop existing dictionary for clean backfill
    await tag_dict.drop()
    logger.info("tag_dictionary_dropped")

    # Create unique index BEFORE $merge (MongoDB requires it for join field verification)
    await tag_dict.create_index(
        [("workspace_id", 1), ("entity_type", 1), ("tag_normalized", 1)],
        unique=True,
        name="idx_tagdict_unique",
    )
    logger.info("unique_index_created")

    # Pipeline 1: tag_mentions → tag_dictionary
    tag_pipeline = [
        {"$match": {"tag_mentions.0": {"$exists": True}}},
        {"$unwind": "$tag_mentions"},
        {"$match": {"tag_mentions.entity_type": {"$ne": None}}},
        {
            "$group": {
                "_id": {
                    "workspace_id": "$workspace_id",
                    "entity_type": "$tag_mentions.entity_type",
                    "tag_normalized": {"$toLower": "$tag_mentions.tag"},
                },
                "tag": {"$first": "$tag_mentions.tag"},
                "artifact_ids": {"$addToSet": "$artifact_id"},
                "last_seen": {"$max": "$updated_at"},
            },
        },
        {
            "$addFields": {
                "workspace_id": "$_id.workspace_id",
                "entity_type": "$_id.entity_type",
                "tag_normalized": "$_id.tag_normalized",
                "artifact_count": {"$size": "$artifact_ids"},
            },
        },
        {"$unset": "_id"},
        {
            "$merge": {
                "into": settings.mongo_tag_dictionary_collection,
                "on": ["workspace_id", "entity_type", "tag_normalized"],
                "whenMatched": "replace",
                "whenNotMatched": "insert",
            },
        },
    ]
    await artifacts.aggregate(tag_pipeline).to_list(0)
    tag_count = await tag_dict.count_documents({})
    logger.info("tag_mentions_backfilled", count=tag_count)

    # Pipeline 2: author_mentions → tag_dictionary
    author_pipeline = [
        {"$match": {"author_mentions.0": {"$exists": True}}},
        {"$unwind": "$author_mentions"},
        {
            "$group": {
                "_id": {
                    "workspace_id": "$workspace_id",
                    "entity_type": {"$literal": "author"},
                    "tag_normalized": {"$toLower": "$author_mentions.name"},
                },
                "tag": {"$first": "$author_mentions.name"},
                "artifact_ids": {"$addToSet": "$artifact_id"},
                "last_seen": {"$max": "$updated_at"},
            },
        },
        {
            "$addFields": {
                "workspace_id": "$_id.workspace_id",
                "entity_type": "$_id.entity_type",
                "tag_normalized": "$_id.tag_normalized",
                "artifact_count": {"$size": "$artifact_ids"},
            },
        },
        {"$unset": "_id"},
        {
            "$merge": {
                "into": settings.mongo_tag_dictionary_collection,
                "on": ["workspace_id", "entity_type", "tag_normalized"],
                "whenMatched": "replace",
                "whenNotMatched": "insert",
            },
        },
    ]
    await artifacts.aggregate(author_pipeline).to_list(0)
    author_count = await tag_dict.count_documents({"entity_type": "author"})
    logger.info("author_mentions_backfilled", count=author_count)

    # Pipeline 3: presentation_date → tag_dictionary (year only)
    date_pipeline = [
        {"$match": {"presentation_date.date": {"$ne": None}}},
        {
            "$group": {
                "_id": {
                    "workspace_id": "$workspace_id",
                    "entity_type": {"$literal": "date"},
                    "tag_normalized": {
                        "$toString": {"$year": {"$toDate": "$presentation_date.date"}},
                    },
                },
                "tag": {
                    "$first": {
                        "$toString": {"$year": {"$toDate": "$presentation_date.date"}},
                    },
                },
                "artifact_ids": {"$addToSet": "$artifact_id"},
                "last_seen": {"$max": "$updated_at"},
            },
        },
        {
            "$addFields": {
                "workspace_id": "$_id.workspace_id",
                "entity_type": "$_id.entity_type",
                "tag_normalized": "$_id.tag_normalized",
                "artifact_count": {"$size": "$artifact_ids"},
            },
        },
        {"$unset": "_id"},
        {
            "$merge": {
                "into": settings.mongo_tag_dictionary_collection,
                "on": ["workspace_id", "entity_type", "tag_normalized"],
                "whenMatched": "replace",
                "whenNotMatched": "insert",
            },
        },
    ]
    await artifacts.aggregate(date_pipeline).to_list(0)
    date_count = await tag_dict.count_documents({"entity_type": "date"})
    logger.info("dates_backfilled", count=date_count)

    # Create indexes
    await tag_dict.create_index(
        [("workspace_id", 1), ("tag_normalized", 1)],
        name="idx_tagdict_autocomplete",
    )
    await tag_dict.create_index(
        [("workspace_id", 1), ("entity_type", 1), ("artifact_count", -1)],
        name="idx_tagdict_popular",
    )
    await tag_dict.create_index(
        [("workspace_id", 1), ("entity_type", 1), ("tag_normalized", 1)],
        unique=True,
        name="idx_tagdict_unique",
    )
    logger.info("indexes_created")

    total = await tag_dict.count_documents({})
    logger.info("backfill_complete", total_entries=total)

    client.close()


if __name__ == "__main__":
    asyncio.run(backfill())
