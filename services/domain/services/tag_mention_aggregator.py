"""Domain service: aggregate tag mentions from multiple pages into artifact-level tags.

Deduplicates tags across pages by (entity_type, normalized tag name).
For compound_name entities, bioactivities and synonyms are merged across pages.
For all other entity types, the highest-confidence mention is kept.
"""

from __future__ import annotations

from domain.value_objects.tag_mention import TagMention


def _normalize(name: str) -> str:
    """Lowercase, strip, and collapse whitespace for tag matching."""
    return name.strip().lower().replace(" ", "")


def aggregate_tag_mentions(
    pages_tags: list[list[TagMention]],
) -> list[TagMention]:
    """Merge tag mentions from multiple pages into a deduplicated artifact-level list.

    Parameters
    ----------
    pages_tags:
        One list of TagMentions per page.

    Returns
    -------
    A single deduplicated list suitable for ``Artifact.update_tag_mentions()``.
    """
    # Flatten
    all_tags: list[TagMention] = []
    for page_tags in pages_tags:
        all_tags.extend(page_tags)

    if not all_tags:
        return []

    # Group by (entity_type, normalized tag)
    groups: dict[tuple[str, str], list[TagMention]] = {}
    for tm in all_tags:
        key = (tm.entity_type or "other", _normalize(tm.tag))
        groups.setdefault(key, []).append(tm)

    result: list[TagMention] = []
    for (_etype, _norm_tag), mentions in groups.items():
        if mentions[0].entity_type == "compound_name":
            result.append(_merge_compound_group(mentions))
        else:
            result.append(_pick_best(mentions))

    return result


def _pick_best(mentions: list[TagMention]) -> TagMention:
    """Return the TagMention with the highest confidence (or first if all None)."""
    best = mentions[0]
    for tm in mentions[1:]:
        if tm.confidence is not None and (
            best.confidence is None or tm.confidence > best.confidence
        ):
            best = tm
    return best


def _merge_compound_group(mentions: list[TagMention]) -> TagMention:
    """Merge multiple occurrences of the same compound across pages.

    - Picks the best-confidence TagMention as the base.
    - Merges all ``bioactivities`` lists.
    - Merges ``synonyms`` (union, comma-separated).
    """
    base = _pick_best(mentions)

    # Collect all bioactivities across pages
    all_activities: list[dict] = []
    all_synonyms: set[str] = set()

    for tm in mentions:
        params = tm.additional_model_params or {}
        activities = params.get("bioactivities")
        if isinstance(activities, list):
            all_activities.extend(activities)
        synonyms_str = params.get("synonyms")
        if isinstance(synonyms_str, str) and synonyms_str.strip():
            for s in synonyms_str.split(","):
                s = s.strip()
                if s:
                    all_synonyms.add(s)

    # Deduplicate bioactivities by (assay_type, value, unit)
    seen: set[tuple[str, str, str]] = set()
    deduped_activities: list[dict] = []
    for a in all_activities:
        key = (a.get("assay_type", ""), a.get("value", ""), a.get("unit", ""))
        if key not in seen:
            seen.add(key)
            deduped_activities.append(a)

    # Build updated params
    updated_params = dict(base.additional_model_params or {})
    if deduped_activities:
        updated_params["bioactivities"] = deduped_activities
    if all_synonyms:
        updated_params["synonyms"] = ", ".join(sorted(all_synonyms))

    return base.model_copy(update={"additional_model_params": updated_params})
