# Search Pipeline — Engineering Design & Improvement Roadmap

> Reference document for implementing the full search pipeline upgrade.
> Supersedes Phase 2 of `SUMMARY_EMBEDDINGS_AND_SEARCH.md` and extends
> the search architecture across all three Qdrant collections.

---

## 1. Current State

### 1.1 Infrastructure

- **Qdrant v1.16.2** (docker: `qdrant/qdrant:v1.16.2`)
- **Embedding model**: `sentence-transformers/all-MiniLM-L6-v2` — 384 dimensions, cosine distance
- **SMILES model**: `DeepChem/ChemBERTa-77M-MTR` — 384 dimensions, cosine distance
- **Text chunking**: LangChain `RecursiveCharacterTextSplitter`, 1000 chars, 200 overlap
- **Dev mode**: No production data — collections can be rebuilt freely

### 1.2 Three Qdrant Collections

#### `page_embeddings` — Raw text chunks

| Field | Type | Indexed | Notes |
|-------|------|---------|-------|
| `page_id` | KEYWORD | yes | Primary key for chunk grouping |
| `artifact_id` | KEYWORD | yes | Scoping filter |
| `workspace_id` | KEYWORD | yes | Tenant isolation |
| `page_index` | int | no | Page position in artifact |
| `chunk_index` | int | no | Chunk position in page |
| `chunk_count` | int | no | Total chunks for page |
| `embedding_id` | UUID | no | Reference to embedding metadata |
| `model_name` | string | no | Embedding model used |
| `dimensions` | int | no | Vector dimensionality |
| `generated_at` | string | no | ISO timestamp |

**Point ID scheme**: `uuid5(NAMESPACE_URL, f"{page_id}:chunk:{chunk_index}")` — deterministic.

**Vector config**: Single unnamed vector, 384d cosine.

#### `summary_embeddings` — Unified page + artifact summaries

| Field | Type | Indexed | Notes |
|-------|------|---------|-------|
| `entity_type` | KEYWORD | yes | `"page"` or `"artifact"` |
| `entity_id` | KEYWORD | yes | Page ID or artifact ID |
| `artifact_id` | KEYWORD | yes | Parent artifact |
| `workspace_id` | KEYWORD | yes | Tenant isolation |
| `summary_text` | string | no | Full summary (self-contained results) |
| `artifact_title` | string | no | For display |
| `page_index` | int | no | Page summaries only |
| `page_count` | int | no | Artifact summaries only |
| `model_name` | string | no | Embedding model |
| `dimensions` | int | no | Vector dimensionality |
| `generated_at` | string | no | ISO timestamp |

**Point ID scheme**: `uuid5(NAMESPACE_URL, f"page:{page_id}")` or `uuid5(NAMESPACE_URL, f"artifact:{artifact_id}")`.

**Vector config**: Single unnamed vector, 384d cosine.

#### `compound_embeddings` — SMILES structural similarity

| Field | Type | Indexed | Notes |
|-------|------|---------|-------|
| `page_id` | KEYWORD | yes | Source page |
| `artifact_id` | KEYWORD | yes | Source artifact |
| `workspace_id` | KEYWORD | yes | Tenant isolation |
| `canonical_smiles` | KEYWORD | yes | Dedup / exact match |
| `smiles` | string | no | Original SMILES |
| `extracted_id` | string | no | Extraction reference |
| `confidence` | float | no | Extraction confidence |
| `is_smiles_valid` | bool | no | RDKit validation |
| `page_index` | int | no | Page position |
| `compound_index` | int | no | Compound position in page |
| `embedding_id` | UUID | no | Embedding reference |
| `model_name` | string | no | ChemBERTa model |

**Point ID scheme**: `uuid5(NAMESPACE_URL, f"{page_id}:compound:{idx}")`.

**Vector config**: Single unnamed vector, 384d cosine.

### 1.3 Search Pipeline Flow

```
User query (text)
  │
  ├─ embed with all-MiniLM-L6-v2 (384d, ~5ms)
  │
  ├─ Qdrant query_points() — cosine distance
  │   └─ filters: workspace_id, artifact_id, allowed_artifact_ids
  │   └─ score_threshold (optional)
  │
  ├─ Application-level dedup (page_embeddings only)
  │   └─ fetch limit × 3, keep best chunk per page_id
  │
  ├─ Read-model enrichment (MongoDB round-trips)
  │   └─ text preview, artifact title, artifact details, tags
  │
  └─ Return sorted by cosine score
```

### 1.4 Search Endpoints

| Endpoint | Collection(s) | Use Case Class |
|----------|---------------|----------------|
| `POST /search/pages` | page_embeddings | `SearchSimilarPagesUseCase` |
| `POST /search/summaries` | summary_embeddings | `SearchSummariesUseCase` |
| `POST /search/hierarchical` | both | `HierarchicalSearchUseCase` |
| `POST /search/compounds` | compound_embeddings | `SearchSimilarCompoundsUseCase` |

### 1.5 What's NOT in Qdrant Today

The following metadata is extracted during document processing but **not stored** in any Qdrant payload:

| Data | Available On | Where It Lives | Why It Matters |
|------|-------------|----------------|----------------|
| **Tags** (NER-extracted) | Page aggregate, artifact aggregate | MongoDB read model | Enables filtered search: "find pages tagged PptT" |
| **Entity types** (compound_name, target, gene_name, disease) | TagMention.entity_type | MongoDB read model | Faceted search by entity category |
| **Tag confidence** | TagMention.confidence | MongoDB read model | Filter by extraction quality |
| **Compound mentions** (on page_embeddings) | Page aggregate | MongoDB read model | Cross-reference text chunks ↔ compounds |
| **Page summary** (on page_embeddings) | Page read model | MongoDB | Context for chunks |
| **Artifact title** (on page_embeddings) | Artifact read model | MongoDB | Context for chunks |

---

## 2. Gap Analysis

### Gap 1: No Tag Metadata in Qdrant

Tags are the primary way scientists filter results. A researcher who knows the target is "PptT" currently has no way to scope vector search to documents mentioning that target. They must search semantically and hope cosine similarity surfaces the right pages.

**Impact**: Users cannot combine semantic search with known-entity filters.

### Gap 2: No Hybrid Search (Dense + Sparse)

Scientific identifiers are opaque tokens to dense models: `SACC-111`, `NadD`, `TAMU`, `IC50`. The model may never have seen them during training. BM25/sparse vectors guarantee exact-term recall for these tokens.

**Example failure case**: Query `"SACC-111"` → all-MiniLM-L6-v2 embeds it as an unknown token sequence → low cosine similarity with pages that mention SACC-111 → result buried or missing.

**Impact**: Exact-identifier queries return poor results.

### Gap 3: Manual Chunk Deduplication

`SearchSimilarPagesUseCase` and `HierarchicalSearchUseCase._search_chunks` both do:
```python
results = await self.vector_store.search_similar_pages(limit=request.limit * 3)
# then Python-level dedup by page_id
```

Qdrant v1.16 has `query_groups()` which does this server-side: group by payload field, return best point per group, fetch exactly `limit` groups.

**Impact**: 3x network overhead, wasted Qdrant compute, unnecessary application complexity.

### Gap 4: No Rescoring / Reranking

Single-stage retrieval: cosine distance is the only signal. Cross-encoder reranking (bi-encoder retrieval → cross-encoder rescoring) typically improves precision@10 by 10-30% on information retrieval benchmarks.

**Impact**: Suboptimal result ordering, especially for nuanced scientific queries.

### Gap 5: No Query Understanding

Queries are embedded as-is. No decomposition of multi-concept queries, no synonym expansion, no intent detection. A query like `"NadD inhibitors with IC50 below 10uM from TAMU"` contains entity references, numeric constraints, and institutional attribution — all compressed into a single 384d vector.

**Impact**: Multi-faceted queries lose precision.

### Gap 6: Context-Free Chunk Embeddings

Chunks are embedded in isolation. A chunk saying "The IC50 was 2.3 uM" carries no information about which compound, target, or study it belongs to. The embedding captures the general concept of "IC50 measurement" but not the specific context.

**Impact**: Semantically similar but contextually different chunks are indistinguishable.

### Gap 7: Small Embedding Model

all-MiniLM-L6-v2 (22M params, 384d) is a lightweight model designed for speed. It ranks below larger models on MTEB retrieval benchmarks, particularly for domain-specific scientific text.

**Impact**: Lower baseline retrieval quality.

---

## 3. Improvement Roadmap

### Phase 1: Metadata Enrichment & Filtered Search

**Objective**: Store extracted tags and entity types in Qdrant payloads. Enable filtered search.

#### 1.1 New Payload Fields

**page_embeddings** — add to each chunk point:

```python
payload = {
    # existing fields...

    # NEW: tags from page's tag_mentions
    "tags": ["PptT", "NadD", "SACC-111", "IC50"],           # list[str] — all tag strings
    "tag_normalized": ["pptt", "nadd", "sacc-111", "ic50"],  # list[str] — lowercased for case-insensitive filter
    "entity_types": ["target", "compound_name"],             # list[str] — unique entity_type values present
    "tag_by_entity": {                                        # dict — grouped for faceted queries
        "target": ["PptT", "NadD"],
        "compound_name": ["SACC-111"],
    },

    # NEW: compound context (cross-reference)
    "compound_smiles": ["C1=CC=CC=C1", "CCO"],               # list[str] — canonical SMILES on this page
}
```

**summary_embeddings** — add to each summary point:

```python
payload = {
    # existing fields...

    # NEW: for page summaries — page-level tags
    "tags": ["PptT", "NadD"],
    "tag_normalized": ["pptt", "nadd"],
    "entity_types": ["target"],

    # NEW: for artifact summaries — aggregated artifact-level tags
    "tags": ["PptT", "NadD", "SACC-111", "TAMU"],
    "tag_normalized": ["pptt", "nadd", "sacc-111", "tamu"],
    "entity_types": ["target", "compound_name", "institution"],
}
```

#### 1.2 New Payload Indexes

```python
# page_embeddings
await client.create_payload_index(
    collection_name="page_embeddings",
    field_name="tags",
    field_schema=models.PayloadSchemaType.KEYWORD,
)
await client.create_payload_index(
    collection_name="page_embeddings",
    field_name="tag_normalized",
    field_schema=models.PayloadSchemaType.KEYWORD,
)
await client.create_payload_index(
    collection_name="page_embeddings",
    field_name="entity_types",
    field_schema=models.PayloadSchemaType.KEYWORD,
)

# summary_embeddings — same three indexes
```

#### 1.3 Filter Building

Add to `QdrantStore.search_similar_pages()` and `SummaryQdrantStore.search_summaries()`:

```python
def _build_tag_filters(
    self,
    tags: list[str] | None = None,
    entity_types: list[str] | None = None,
    tag_match_mode: Literal["any", "all"] = "any",
) -> list[models.Condition]:
    conditions = []

    if tags:
        normalized = [t.lower() for t in tags]
        if tag_match_mode == "any":
            # Match pages that have ANY of these tags
            conditions.append(
                models.FieldCondition(
                    key="tag_normalized",
                    match=models.MatchAny(any=normalized),
                )
            )
        else:
            # Match pages that have ALL of these tags
            for tag in normalized:
                conditions.append(
                    models.FieldCondition(
                        key="tag_normalized",
                        match=models.MatchValue(value=tag),
                    )
                )

    if entity_types:
        conditions.append(
            models.FieldCondition(
                key="entity_types",
                match=models.MatchAny(any=entity_types),
            )
        )

    return conditions
```

#### 1.4 Search Request DTO Updates

```python
# In SearchRequest (embedding_dtos.py)
class SearchRequest(BaseModel):
    query_text: str = Field(min_length=1)
    limit: int = Field(default=10, ge=1, le=100)
    artifact_id: UUID | None = None
    score_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    # NEW
    tags: list[str] | None = None
    entity_types: list[str] | None = None
    tag_match_mode: Literal["any", "all"] = "any"

# Same additions to SummarySearchRequest, HierarchicalSearchRequest
```

#### 1.5 Embedding Use Case Changes

`GeneratePageEmbeddingUseCase.execute()` — fetch tags and pass in metadata:

```python
# After retrieving page aggregate (page already has tag_mentions, compound_mentions)
upsert_metadata = {}
if page.workspace_id:
    upsert_metadata["workspace_id"] = str(page.workspace_id)

# NEW: tag metadata
if page.tag_mentions:
    upsert_metadata["tags"] = [tm.tag for tm in page.tag_mentions]
    upsert_metadata["tag_normalized"] = [tm.tag.lower() for tm in page.tag_mentions]
    entity_types = {tm.entity_type for tm in page.tag_mentions if tm.entity_type}
    upsert_metadata["entity_types"] = list(entity_types)
    tag_by_entity: dict[str, list[str]] = {}
    for tm in page.tag_mentions:
        if tm.entity_type:
            tag_by_entity.setdefault(tm.entity_type, []).append(tm.tag)
    upsert_metadata["tag_by_entity"] = tag_by_entity

if page.compound_mentions:
    upsert_metadata["compound_smiles"] = [
        cm.canonical_smiles for cm in page.compound_mentions
        if cm.canonical_smiles and cm.is_smiles_valid
    ]
```

**Timing concern**: Tags may not be available when embeddings are first generated (NER runs in parallel with embedding). Two options:

1. **Option A — Re-index on tag update**: Subscribe to `Page.TagMentionsUpdated` → update Qdrant payload for all chunk points of that page (no re-embedding needed, just `set_payload`).
2. **Option B — Accept eventual staleness**: Tags are added later; newly indexed pages won't have tags until re-embedded.

**Recommended**: Option A. Use Qdrant's `set_payload` API to patch tag fields onto existing points without re-embedding:

```python
# New use case: UpdatePageVectorMetadataUseCase
# Triggered by Page.TagMentionsUpdated
await client.set_payload(
    collection_name="page_embeddings",
    payload={"tags": [...], "tag_normalized": [...], "entity_types": [...]},
    points=models.FilterSelector(
        filter=models.Filter(
            must=[models.FieldCondition(key="page_id", match=models.MatchValue(value=str(page_id)))]
        )
    ),
)
```

This avoids re-embedding and runs in <10ms.

#### 1.6 Port/Protocol Updates

```python
# vector_store.py — add to search_similar_pages signature
async def search_similar_pages(
    self,
    query_embedding: TextEmbedding,
    limit: int = 10,
    artifact_id_filter: UUID | None = None,
    score_threshold: float | None = None,
    allowed_artifact_ids: list[UUID] | None = None,
    workspace_id: UUID | None = None,
    # NEW
    tags: list[str] | None = None,
    entity_types: list[str] | None = None,
    tag_match_mode: Literal["any", "all"] = "any",
) -> list[PageSearchResult]: ...

# Same pattern for SummaryVectorStore.search_summaries
```

#### 1.7 Files to Modify

| File | Change |
|------|--------|
| `infrastructure/vector_stores/qdrant_store.py` | Add tag payload, tag indexes, tag filter logic |
| `infrastructure/vector_stores/summary_qdrant_store.py` | Same |
| `application/ports/vector_store.py` | Add tag params to `search_similar_pages` |
| `application/ports/summary_vector_store.py` | Add tag params to `search_summaries` |
| `application/use_cases/embedding_use_cases.py` | Include tags in upsert metadata |
| `application/use_cases/summary_embedding_use_cases.py` | Include tags in upsert payload |
| `application/dtos/embedding_dtos.py` | Add tag fields to `SearchRequest` |
| `application/dtos/search_dtos.py` | Add tag fields to `SummarySearchRequest`, `HierarchicalSearchRequest` |
| `application/use_cases/search_use_cases.py` | Pass tag filters to vector store |
| `interfaces/api/routes/search_routes.py` | Forward tag params from request to use case |

**New files**:

| File | Purpose |
|------|---------|
| `application/use_cases/vector_metadata_use_cases.py` | `UpdatePageVectorMetadataUseCase` — patches tags onto existing Qdrant points |

**Pipeline worker addition**: Subscribe to `Page.TagMentionsUpdated` → trigger tag payload update.

---

### Phase 2: Qdrant group_by for Chunk Deduplication

**Objective**: Replace application-level 3x over-fetch + dedup with Qdrant's native `query_groups()`.

#### 2.1 Current Code (to replace)

In `SearchSimilarPagesUseCase.execute()`:
```python
search_results = await self.vector_store.search_similar_pages(
    query_embedding=query_embedding,
    limit=request.limit * 3,  # Over-fetch to handle chunk dedup
    ...
)
best_by_page: dict[UUID, PageSearchResult] = {}
for result in search_results:
    existing = best_by_page.get(result.page_id)
    if existing is None or result.score > existing.score:
        best_by_page[result.page_id] = result
deduplicated_results = sorted(best_by_page.values(), key=lambda r: r.score, reverse=True)[:request.limit]
```

In `HierarchicalSearchUseCase._search_chunks()`:
```python
raw_results = await self.vector_store.search_similar_pages(
    query_embedding=query_embedding,
    limit=request.limit * 3,
    ...
)
best_by_page: dict[UUID, tuple[float, int]] = {}
# ... same dedup pattern
```

#### 2.2 New Qdrant Adapter Method

Add to `QdrantStore`:

```python
async def search_pages_grouped(
    self,
    query_embedding: TextEmbedding,
    limit: int = 10,
    artifact_id_filter: UUID | None = None,
    score_threshold: float | None = None,
    allowed_artifact_ids: list[UUID] | None = None,
    workspace_id: UUID | None = None,
    tags: list[str] | None = None,
    entity_types: list[str] | None = None,
    tag_match_mode: Literal["any", "all"] = "any",
    group_size: int = 1,
) -> list[PageSearchResult]:
    """Search with server-side deduplication by page_id.

    Uses Qdrant's query_groups() to return the best-scoring
    chunk per page, eliminating application-level dedup.
    """
    client = await self._get_client()
    query_filter = self._build_filter(
        artifact_id_filter, allowed_artifact_ids, workspace_id,
        tags, entity_types, tag_match_mode,
    )

    grouped = await client.query_groups(
        collection_name=self.collection_name,
        query=query_embedding.vector,
        group_by="page_id",
        group_size=group_size,   # 1 = best chunk per page
        limit=limit,             # exact number of unique pages
        query_filter=query_filter,
        score_threshold=score_threshold,
        with_payload=True,
    )

    results = []
    for group in grouped.groups:
        best_point = group.hits[0]  # group_size=1 → exactly one hit
        results.append(
            PageSearchResult(
                page_id=UUID(best_point.payload["page_id"]),
                artifact_id=UUID(best_point.payload["artifact_id"]),
                score=best_point.score,
                page_index=best_point.payload["page_index"],
                metadata=best_point.payload,
            )
        )
    return results
```

#### 2.3 Update Port

```python
# vector_store.py — add grouped search method
async def search_pages_grouped(
    self,
    query_embedding: TextEmbedding,
    limit: int = 10,
    group_size: int = 1,
    # ... same filters as search_similar_pages
) -> list[PageSearchResult]: ...
```

#### 2.4 Update Use Cases

Replace the over-fetch+dedup pattern in both `SearchSimilarPagesUseCase` and `HierarchicalSearchUseCase._search_chunks` with a single call to `search_pages_grouped`.

#### 2.5 Files to Modify

| File | Change |
|------|--------|
| `infrastructure/vector_stores/qdrant_store.py` | Add `search_pages_grouped()` |
| `application/ports/vector_store.py` | Add `search_pages_grouped` to protocol |
| `application/use_cases/embedding_use_cases.py` | Use `search_pages_grouped` |
| `application/use_cases/search_use_cases.py` | Use `search_pages_grouped` in `_search_chunks` |

---

### Phase 3: Hybrid Search — Sparse Vectors + RRF Fusion

**Objective**: Add BM25 sparse vectors for exact-term recall. Fuse dense + sparse using Reciprocal Rank Fusion.

#### 3.1 Why Hybrid Matters for Scientific Text

| Query | Dense Result | Sparse (BM25) Result | Hybrid (RRF) |
|-------|-------------|----------------------|---------------|
| `"SACC-111"` | Low similarity (OOV token) | Exact match on token | Best of both |
| `"NadD inhibitor potency"` | Good semantic match | Partial token match | Combined signal |
| `"tuberculosis drug target"` | Strong semantic match | Good keyword match | Reinforced |

#### 3.2 Collection Schema Migration

Migrate from single unnamed vector to named vectors:

```python
# page_embeddings — new config
vectors_config = {
    "dense": models.VectorParams(
        size=384,
        distance=models.Distance.COSINE,
    ),
}
sparse_vectors_config = {
    "sparse": models.SparseVectorParams(
        modifier=models.Modifier.IDF,  # BM25-style IDF weighting
    ),
}
```

Since we're in dev mode: **drop and recreate** the collection with the new schema, then re-index all documents.

Same migration for `summary_embeddings`.

`compound_embeddings` stays dense-only — BM25 on SMILES strings is not meaningful.

#### 3.3 Sparse Embedding Generation

**New port**:

```python
# application/ports/sparse_embedding_generator.py
class SparseEmbeddingGenerator(Protocol):
    async def generate_sparse_embedding(self, text: str) -> SparseEmbedding: ...
    async def generate_batch_sparse_embeddings(self, texts: list[str]) -> list[SparseEmbedding]: ...

@dataclass
class SparseEmbedding:
    indices: list[int]
    values: list[float]
```

**Adapter options** (pick one):

1. **Qdrant FastEmbed BM25** — `fastembed` library, `Qdrant/bm25` model. Zero ML overhead, pure tokenization + IDF.
2. **SPLADE** — learned sparse representations. Better quality but heavier. `naver/splade-cocondenser-ensembledistil`.

**Recommended**: Start with FastEmbed BM25 for simplicity. Can upgrade to SPLADE later.

```python
# infrastructure/embeddings/fastembed_sparse_generator.py
from fastembed import SparseTextEmbedding

class FastEmbedSparseGenerator(SparseEmbeddingGenerator):
    def __init__(self, model_name: str = "Qdrant/bm25"):
        self.model = SparseTextEmbedding(model_name=model_name)

    async def generate_sparse_embedding(self, text: str) -> SparseEmbedding:
        result = list(self.model.embed([text]))[0]
        return SparseEmbedding(
            indices=result.indices.tolist(),
            values=result.values.tolist(),
        )
```

#### 3.4 Indexing Changes

At upsert time, generate both dense and sparse vectors:

```python
# Dense (existing)
dense_embeddings = await self.embedding_generator.generate_batch_embeddings(chunk_texts)

# Sparse (new)
sparse_embeddings = await self.sparse_generator.generate_batch_sparse_embeddings(chunk_texts)

# Upsert with named vectors
point = PointStruct(
    id=point_id,
    vector={
        "dense": dense_embedding.vector,
        "sparse": models.SparseVector(
            indices=sparse_embedding.indices,
            values=sparse_embedding.values,
        ),
    },
    payload=payload,
)
```

#### 3.5 Search with RRF Fusion

```python
async def search_hybrid(
    self,
    dense_query: TextEmbedding,
    sparse_query: SparseEmbedding,
    limit: int = 10,
    prefetch_limit: int = 100,  # candidates per stage
    **filters,
) -> list[PageSearchResult]:
    """Hybrid search: dense + sparse, fused with RRF."""
    client = await self._get_client()
    query_filter = self._build_filter(**filters)

    result = await client.query_points(
        collection_name=self.collection_name,
        prefetch=[
            models.Prefetch(
                query=dense_query.vector,
                using="dense",
                limit=prefetch_limit,
                filter=query_filter,
            ),
            models.Prefetch(
                query=models.SparseVector(
                    indices=sparse_query.indices,
                    values=sparse_query.values,
                ),
                using="sparse",
                limit=prefetch_limit,
                filter=query_filter,
            ),
        ],
        query=models.FusionQuery(fusion=models.Fusion.RRF),
        limit=limit,
        with_payload=True,
    )

    return [
        PageSearchResult(
            page_id=UUID(p.payload["page_id"]),
            artifact_id=UUID(p.payload["artifact_id"]),
            score=p.score,
            page_index=p.payload["page_index"],
            metadata=p.payload,
        )
        for p in result.points
    ]
```

#### 3.6 Hybrid group_by

Combine Phase 2 (group_by) with Phase 3 (hybrid):

```python
# Qdrant v1.16 supports group_by with prefetch+fusion
grouped = await client.query_groups(
    collection_name=self.collection_name,
    prefetch=[
        models.Prefetch(query=dense_vector, using="dense", limit=100),
        models.Prefetch(query=sparse_vector, using="sparse", limit=100),
    ],
    query=models.FusionQuery(fusion=models.Fusion.RRF),
    group_by="page_id",
    group_size=1,
    limit=limit,
    with_payload=True,
)
```

#### 3.7 Files to Create

| File | Purpose |
|------|---------|
| `application/ports/sparse_embedding_generator.py` | `SparseEmbeddingGenerator` protocol + `SparseEmbedding` dataclass |
| `infrastructure/embeddings/fastembed_sparse_generator.py` | FastEmbed BM25 adapter |
| `domain/value_objects/sparse_embedding.py` | `SparseEmbedding` value object (if we want domain purity) |

#### 3.8 Files to Modify

| File | Change |
|------|--------|
| `infrastructure/vector_stores/qdrant_store.py` | Named vectors config, hybrid search method, dual-vector upsert |
| `infrastructure/vector_stores/summary_qdrant_store.py` | Same |
| `application/ports/vector_store.py` | Add hybrid search to protocol |
| `application/use_cases/embedding_use_cases.py` | Generate + store sparse embeddings |
| `application/use_cases/summary_embedding_use_cases.py` | Same |
| `application/use_cases/search_use_cases.py` | Use hybrid search methods |
| `application/use_cases/embedding_use_cases.py` (`SearchSimilarPagesUseCase`) | Use hybrid search |
| `infrastructure/config.py` | Add `sparse_model_name`, `hybrid_search_enabled` |
| `infrastructure/di/container.py` | Wire `SparseEmbeddingGenerator` |

**Dependency**: `pip install fastembed`

---

### Phase 4: Cross-Encoder Reranking (Two-Stage Retrieval)

**Objective**: After initial retrieval (dense or hybrid), rescore top-N candidates with a cross-encoder for dramatically better precision.

#### 4.1 How It Works

```
Stage 1: Qdrant retrieval (hybrid, ~50-100 candidates, ~10ms)
    │
    ▼
Stage 2: Cross-encoder rescoring (~20-50 candidates, ~50-200ms)
    │ For each candidate: score(query, passage_text) → float
    │ Sort by cross-encoder score
    │
    ▼
Return top-K results
```

A cross-encoder scores each (query, document) pair jointly — it sees both texts together, enabling much richer interaction modeling than independent bi-encoder embeddings.

#### 4.2 New Port

```python
# application/ports/reranker.py
from dataclasses import dataclass

class Reranker(Protocol):
    async def rerank(
        self,
        query: str,
        documents: list[RerankDocument],
        top_k: int | None = None,
    ) -> list[RerankResult]: ...

@dataclass
class RerankDocument:
    id: str            # page_id or entity_id — for correlating back
    text: str          # passage text to score against query

@dataclass
class RerankResult:
    id: str
    score: float       # cross-encoder score (typically 0-1 after sigmoid)
    original_rank: int # position before reranking
```

#### 4.3 Cross-Encoder Adapter

```python
# infrastructure/rerankers/cross_encoder_reranker.py
from sentence_transformers import CrossEncoder

class CrossEncoderReranker(Reranker):
    def __init__(
        self,
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        device: str = "cpu",
    ):
        self.model = CrossEncoder(model_name, device=device)

    async def rerank(
        self,
        query: str,
        documents: list[RerankDocument],
        top_k: int | None = None,
    ) -> list[RerankResult]:
        if not documents:
            return []

        # Cross-encoder scores (query, passage) pairs
        pairs = [(query, doc.text) for doc in documents]
        scores = self.model.predict(pairs)

        # Build results with original rank tracking
        results = [
            RerankResult(
                id=doc.id,
                score=float(score),
                original_rank=i,
            )
            for i, (doc, score) in enumerate(zip(documents, scores))
        ]

        # Sort by cross-encoder score (descending)
        results.sort(key=lambda r: r.score, reverse=True)

        if top_k:
            results = results[:top_k]

        return results
```

#### 4.4 Model Options

| Model | Params | Speed | Quality | Notes |
|-------|--------|-------|---------|-------|
| `cross-encoder/ms-marco-MiniLM-L-6-v2` | 22M | ~5ms/pair | Good | Fast, general |
| `BAAI/bge-reranker-base` | 278M | ~15ms/pair | Very good | Better for scientific text |
| `BAAI/bge-reranker-v2-m3` | 568M | ~30ms/pair | Best | Multilingual, heavy |

**Recommended**: Start with `ms-marco-MiniLM-L-6-v2` for speed, upgrade to `bge-reranker-base` if needed.

#### 4.5 Integration into Search Use Cases

The reranker integrates between retrieval and enrichment:

```python
class SearchSimilarPagesUseCase:
    def __init__(self, ..., reranker: Reranker | None = None):
        self.reranker = reranker

    async def execute(self, request, ...):
        # Stage 1: retrieval (hybrid or dense)
        results = await self.vector_store.search_pages_grouped(...)

        # Stage 2: rerank (if reranker configured and results available)
        if self.reranker and results:
            # Fetch passage text for reranking
            rerank_docs = []
            for r in results:
                page = await self.page_read_model.get_page_by_id(r.page_id)
                if page and page.text_mention:
                    rerank_docs.append(RerankDocument(
                        id=str(r.page_id),
                        text=page.text_mention.text[:2000],  # cap length
                    ))

            reranked = await self.reranker.rerank(
                query=request.query_text,
                documents=rerank_docs,
                top_k=request.limit,
            )

            # Reorder results by cross-encoder score
            rerank_map = {r.id: r.score for r in reranked}
            results = sorted(
                [r for r in results if str(r.page_id) in rerank_map],
                key=lambda r: rerank_map[str(r.page_id)],
                reverse=True,
            )

        # Continue with enrichment...
```

**Note**: Reranking fetches page text from read model — this is an extra round-trip but the text is needed anyway for `text_preview` enrichment. We can batch these.

#### 4.6 Config

```python
# infrastructure/config.py
reranker_model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
reranker_device: str = "cpu"
reranker_enabled: bool = True
reranker_top_n: int = 50  # max candidates to rescore
```

#### 4.7 Files to Create

| File | Purpose |
|------|---------|
| `application/ports/reranker.py` | `Reranker` protocol, `RerankDocument`, `RerankResult` |
| `infrastructure/rerankers/cross_encoder_reranker.py` | Cross-encoder adapter |

#### 4.8 Files to Modify

| File | Change |
|------|--------|
| `application/use_cases/embedding_use_cases.py` | Add optional reranking step |
| `application/use_cases/search_use_cases.py` | Add optional reranking step |
| `infrastructure/config.py` | Reranker config |
| `infrastructure/di/container.py` | Wire reranker |

---

### Phase 5: Contextual Chunk Embeddings

**Objective**: Prepend document-level context to chunks before embedding, so each chunk carries its parent document's semantics.

#### 5.1 The Problem

Current chunk:
```
"The IC50 was 2.3 uM against the target, showing potent inhibition."
```

This embeds as a generic IC50 measurement. The embedding doesn't know it's about NadD, compound SACC-111, from a TAMU study.

#### 5.2 The Solution

Contextual chunk (embedded text):
```
"Document: TAMU_NadD_Lead_Optimization_2024.pptx | Tags: NadD, PptT, SACC-111, IC50 | Page 7 summary: IC50 measurements for SACC-111 analogues against NadD\n\nThe IC50 was 2.3 uM against the target, showing potent inhibition."
```

The stored payload `text` is still the raw chunk (for display). Only the embedding input is enriched.

#### 5.3 Context Prefix Template

```python
def build_chunk_context(
    artifact_title: str | None,
    page_index: int,
    tags: list[str] | None,
    page_summary: str | None,
) -> str:
    parts = []
    if artifact_title:
        parts.append(f"Document: {artifact_title}")
    if tags:
        parts.append(f"Tags: {', '.join(tags[:10])}")  # cap at 10 tags
    parts.append(f"Page {page_index + 1}")
    if page_summary:
        parts.append(f"Summary: {page_summary[:200]}")

    return " | ".join(parts) + "\n\n"
```

#### 5.4 Timing Concern

At embedding time (`Page.TextMentionUpdated`), we may not yet have:
- Tags (NER runs in parallel)
- Summary (runs after embedding)

**Resolution**: Embed without context initially (same as today). Then **re-embed with context** when summary is available (`Page.SummaryCandidateUpdated`). This reuses the existing event pipeline:

```
Page.TextMentionUpdated → embed (no context, same as today)
Page.SummaryCandidateUpdated → re-embed with full context (title + tags + summary)
```

The re-embed is triggered by a new flag or use case variant. Tags should be available by the time summary is generated (NER runs before summarization in the pipeline).

#### 5.5 Files to Modify

| File | Change |
|------|--------|
| `application/use_cases/embedding_use_cases.py` | Add context prefix builder, use in `GeneratePageEmbeddingUseCase` |
| `infrastructure/pipeline_worker.py` | Add re-embedding trigger on `SummaryCandidateUpdated` |

---

### Phase 6: Embedding Model Upgrade

**Objective**: Replace all-MiniLM-L6-v2 with a more capable model.

#### 6.1 Candidates

| Model | Dim | Params | MTEB Retrieval | Notes |
|-------|-----|--------|----------------|-------|
| `all-MiniLM-L6-v2` (current) | 384 | 22M | ~0.42 | Fast, lightweight |
| `nomic-ai/nomic-embed-text-v1.5` | 768 | 137M | ~0.55 | Matryoshka, can reduce to 384d |
| `BAAI/bge-base-en-v1.5` | 768 | 109M | ~0.53 | Strong retrieval |
| `intfloat/e5-large-v2` | 1024 | 335M | ~0.50 | Instruction-tuned |
| `Alibaba-NLP/gte-large-en-v1.5` | 1024 | 434M | ~0.57 | Best quality, heavy |
| `jinaai/jina-embeddings-v3` | 1024 | 572M | ~0.59 | Matryoshka, task prefixes |

#### 6.2 Recommendation

**`nomic-ai/nomic-embed-text-v1.5`** — best balance of quality, speed, and flexibility:
- 768d (or 384d via Matryoshka truncation for testing)
- Significantly better retrieval than all-MiniLM-L6-v2
- Supports task prefixes: `search_query:` and `search_document:` for asymmetric retrieval
- Apache 2.0 license

#### 6.3 Migration Steps

1. Update `config.py`: `embedding_model_name`, `embedding_dimensions`
2. Update `SentenceTransformerGenerator` (model name and optional prefix handling)
3. Recreate all three collections with new `vector_size`
4. Re-index all documents (Temporal batch job)
5. Update sparse vector config if dimensions changed

#### 6.4 Re-indexing Strategy

Create a Temporal workflow that iterates all pages and artifacts:

```python
@workflow.defn
class ReindexAllWorkflow:
    async def run(self):
        # 1. Get all page IDs from read model
        page_ids = await workflow.execute_activity(get_all_page_ids, ...)

        # 2. Re-embed each page (reuses existing GeneratePageEmbeddingWorkflow)
        for page_id in page_ids:
            await workflow.execute_activity(
                reindex_page, page_id,
                start_to_close_timeout=timedelta(minutes=5),
            )

        # 3. Re-embed all summaries
        # 4. Re-embed all compounds (if ChemBERTa model also changed)
```

---

### Phase 7: Advanced Qdrant Features

**Objective**: Leverage Qdrant v1.16 capabilities for scale and quality.

#### 7.1 Scalar Quantization

Reduce memory ~4x with <1% quality loss:

```python
# Apply to all collections after migration
await client.update_collection(
    collection_name="page_embeddings",
    quantization_config=models.ScalarQuantization(
        scalar=models.ScalarQuantizationConfig(
            type=models.ScalarType.INT8,
            quantile=0.99,
            always_ram=True,
        ),
    ),
)
```

#### 7.2 Oversampling with Rescoring

Retrieve more candidates with quantized vectors, rescore with full-precision:

```python
search_params = models.SearchParams(
    quantization=models.QuantizationSearchParams(
        rescore=True,
        oversampling=2.0,  # retrieve 2x candidates, rescore with full vectors
    ),
)
```

#### 7.3 Discovery API

"Find more like these, but not like those" — useful for iterative refinement:

```python
results = await client.discover(
    collection_name="page_embeddings",
    target=positive_example_vector,
    context=[
        models.ContextExamplePair(
            positive=good_doc_vector,
            negative=irrelevant_doc_vector,
        ),
    ],
    limit=10,
)
```

#### 7.4 Recommend API

"Find similar to this set of documents" — useful for "more like this" features:

```python
results = await client.recommend(
    collection_name="page_embeddings",
    positive=[point_id_1, point_id_2],  # documents the user liked
    negative=[point_id_3],               # documents to avoid
    limit=10,
)
```

---

## 4. Implementation Order & Dependencies

```
Phase 1: Tag Metadata ──────────────────────────┐
Phase 2: group_by Dedup ─────────────────────────┤
                                                  │
Phase 3: Hybrid Search (depends on nothing) ─────┤──→ Phase 4: Reranking
                                                  │
Phase 5: Contextual Embeddings (needs Phase 1) ──┤
                                                  │
Phase 6: Model Upgrade (combine with Phase 5) ───┤
                                                  │
Phase 7: Quantization + Advanced ────────────────┘
```

**Phases 1 and 2** are independent quick wins — implement first.
**Phase 3** is the highest-impact change — implement after Phases 1-2.
**Phase 4** is best applied after Phase 3 (reranking a hybrid candidate set > reranking dense-only).
**Phase 5 and 6** can be combined into a single re-indexing pass.
**Phase 7** is independent and can be applied at any point.

---

## 5. Full Search Pipeline After All Phases

```
User query: "NadD inhibitors with IC50 below 10uM from TAMU"
  │
  ├─ Query understanding (future: decompose into sub-queries)
  │
  ├─ Embed query
  │   ├─ Dense: nomic-embed-text-v1.5 (768d)
  │   └─ Sparse: FastEmbed BM25 (IDF-weighted tokens)
  │
  ├─ Tag extraction from query (future: NER on query text)
  │   └─ Detected: tags=["NadD", "TAMU"], entity_types=["target", "institution"]
  │
  ├─ Qdrant hybrid search (per collection)
  │   ├─ Prefetch dense candidates (limit=100)
  │   ├─ Prefetch sparse candidates (limit=100)
  │   ├─ RRF fusion
  │   ├─ Filter: workspace_id + tags (if detected)
  │   └─ group_by page_id (best chunk per page)
  │
  ├─ Cross-encoder reranking
  │   ├─ Fetch passage text for top-50 candidates
  │   ├─ Score (query, passage) pairs with bge-reranker-base
  │   └─ Re-sort by cross-encoder score
  │
  ├─ Read-model enrichment
  │   └─ Text preview, artifact title, tags, compound mentions
  │
  └─ Return top-K results with rich metadata
```
