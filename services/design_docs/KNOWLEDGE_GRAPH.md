# Cross-Document Knowledge Graph

## Status: Design / Future

This document describes the long-term knowledge graph vision.
**Prerequisite:** [NER Pipeline](NER_PIPELINE.md) must be implemented first.
The knowledge graph is built entirely from NER output + CSER compound data already
flowing through the pipeline.

---

## Motivation

Vector search answers "find documents similar to this query."
It cannot answer:

- *"What do we know about SACC-123 across all time?"*
- *"Which compounds target NadD and what is their current development status?"*
- *"Show me all bioactivity data for compounds tested in the last 3 years."*
- *"Which ligands from 2019 were never followed up on?"*

These are **relational, temporal, entity-centric** queries. A graph is the natural structure.

---

## Core Concept: PageIndex-Inspired, but Cross-Document

[PageIndex](https://github.com/VectifyAI/PageIndex) builds a hierarchical tree index
*per document* and uses LLM reasoning to navigate it instead of vector similarity.

We adapt this principle at the **corpus level**:

- **PageIndex** asks: *"Where in this document is the answer?"*
- **Our graph** asks: *"Across all documents, what do we know about this entity?"*

Instead of a per-document tree, we build a **global entity registry** where nodes are
scientific entities (compounds, targets, diseases) and edges are evidenced facts extracted
from specific pages of specific documents at specific points in time.

The graph is a *living record of accumulated scientific knowledge* from the corpus.

---

## Graph Model

### Nodes

| Node Type   | Identity Key                        | Example                        |
|-------------|-------------------------------------|--------------------------------|
| `Compound`  | Canonical SMILES (from CSER)        | SACC-123 (SMILES: `C1CC...`)   |
| `Target`    | Normalised name (lowercase + alias) | NadD, InhA, KasA               |
| `Disease`   | Normalised name                     | tuberculosis, MDR-TB           |
| `Gene`      | Normalised symbol                   | Rv3138, nadD                   |
| `Protein`   | Normalised name or accession        | P0A7D9, NaMN adenylyltransferase|
| `Assay`     | Normalised name                     | MABA, MIC, enzymatic inhibition|

Each node stores:
- `canonical_id` — the deduplication key (SMILES for compounds, normalised name otherwise)
- `names[]` — all variant spellings observed across documents
- `first_seen` — timestamp of first appearance
- `last_seen` — timestamp of most recent appearance

### Edges

Every edge is an **evidenced fact** grounded in a specific page of a specific artifact.
There are two edge categories:

#### 1. Appearance edges (entity → document provenance)

```
Compound(SACC-123) --[APPEARS_IN]--> Page(Artifact-A, page 3, 2021)
Target(NadD)       --[APPEARS_IN]--> Page(Artifact-A, page 3, 2021)
```

These are created automatically from `Page.TagMentionsUpdated`. No relationship inference
needed. Every entity mention becomes an appearance edge.

#### 2. Relationship edges (entity → entity, inferred from co-occurrence)

```
Compound(SACC-123) --[IS_LIGAND_FOR]--> Target(NadD)
  payload: { IC50: "2.3µM", assay: "enzymatic", source_page_id, source_artifact_id, date: 2021 }

Compound(SACC-123) --[HAS_CYTOTOXICITY]--> Disease("HeLa")
  payload: { CC50: "18µM", source_page_id, source_artifact_id, date: 2024 }

Target(NadD)       --[IMPLICATED_IN]--> Disease(tuberculosis)
  payload: { source_page_id, source_artifact_id, date: 2022 }
```

**Phase 1 — co-occurrence inference:** if compound X and target Y and a bioactivity
value all appear on the same page → create `IS_LIGAND_FOR` edge with the bioactivity
as payload. This is ~80% accurate for well-structured scientific presentations.

**Phase 2 — LLM relationship extraction:** an optional activity runs an LLM over the
page text to extract explicit triples `(subject, relation, object, value)`. Higher
accuracy but slower and more expensive. Produces the same edge structure.

---

## Temporal Dimension

The same entity pair can have **multiple edges from different documents at different times**:

```
SACC-123 --[IS_LIGAND_FOR { IC50: 2.3µM, date: 2021, source: Artifact-A }]--> NadD
SACC-123 --[IS_LIGAND_FOR { IC50: 1.8µM, date: 2023, source: Artifact-D }]--> NadD
SACC-123 --[HAS_CYTOTOXICITY { CC50: 18µM, date: 2024, source: Artifact-B }]--> NadD
```

Edges are **never overwritten** — each new evidence becomes an additional edge with its
own source and date. The graph accumulates. Queries can sort/filter by date to reconstruct
the state of knowledge at any point in time.

---

## How It Builds on Existing Pipeline

The knowledge graph is a **read model** — a pure projection of events already produced
by the pipeline. No changes to domain aggregates.

### Data sources

| Data | Source | Entity created |
|------|--------|----------------|
| Compound labels + SMILES | CSER → `Page.CompoundMentionsUpdated` | `Compound` nodes (SMILES = dedup key) |
| Typed text entities | NER → `Page.TagMentionsUpdated` | `Target`, `Disease`, `Gene`, `Protein`, `Assay` nodes |
| Bioactivity values | NER entity_type="bioactivity" | Edge payloads (IC50, CC50, MIC) |
| Artifact metadata | `Artifact.Created` | Document provenance on edges |
| Timestamps | Event timestamps in EventStoreDB | `date` on every node + edge |

### Pipeline integration (Phase 1)

```
Page.TagMentionsUpdated
  └── (future) TriggerGraphProjectionUseCase
        → GraphProjectionWorkflow
            → GraphProjectionActivity
                1. Load page tag_mentions + compound_mentions
                2. Upsert entity nodes (create or merge by canonical_id)
                3. Create APPEARS_IN edges (entity → page provenance)
                4. Co-occurrence linking:
                   - if compound + target + bioactivity on same page → IS_LIGAND_FOR edge
                   - if compound + disease on same page → TESTED_AGAINST edge
                5. Store in graph database
```

---

## Storage

### Phase 1: MongoDB adjacency model

No new infrastructure. Uses the MongoDB instance already running.

**`kg_entities` collection:**
```json
{
  "_id": "compound:C1CC...SMILES...",
  "type": "compound",
  "canonical_id": "C1CC...SMILES...",
  "names": ["SACC-123", "sacc123"],
  "first_seen": "2021-03-01T00:00:00Z",
  "last_seen": "2024-06-15T00:00:00Z",
  "smiles": "C1CC...SMILES...",           // compound only
  "artifact_ids": ["uuid-A", "uuid-B"],   // denormalised for fast lookup
  "page_ids": ["uuid-p1", "uuid-p3"]
}
```

**`kg_edges` collection:**
```json
{
  "_id": "uuid",
  "from_entity": "compound:C1CC...",
  "to_entity": "target:nadd",
  "relation": "IS_LIGAND_FOR",
  "payload": { "IC50": "2.3µM", "assay": "enzymatic" },
  "source_artifact_id": "uuid-A",
  "source_page_id": "uuid-p3",
  "date": "2021-03-01T00:00:00Z"
}
```

Indexes: `from_entity`, `to_entity`, `relation`, `date`, `source_artifact_id`.

Multi-hop queries (compound → target → disease) require two sequential lookups in MongoDB.
This is acceptable for Phase 1 query patterns.

### Phase 2: Neo4j

When query complexity grows (3+ hop traversals, graph algorithms like shortest path,
compound similarity networks), migrate to Neo4j. The event-sourced foundation means
the graph can be **fully rebuilt from events** at any time — migration is safe.

Cypher equivalent of the Phase 1 MongoDB queries:
```cypher
MATCH (c:Compound {canonical_id: $smiles})-[r:IS_LIGAND_FOR]->(t:Target)
RETURN t.name, r.IC50, r.date, r.source_artifact_id
ORDER BY r.date DESC
```

---

## Query Patterns & API

### Entity timeline
*"What do we know about SACC-123 across all documents?"*

```
GET /knowledge-graph/entities/compound:{smiles}
→ {
    entity: { type, canonical_id, names, first_seen, last_seen },
    appearances: [ { artifact_id, artifact_title, page_id, page_index, date } ],
    relationships: [ { relation, to_entity, payload, source_artifact_id, date } ]
  }
```

### Entity search
*"Find all compounds that target NadD."*

```
GET /knowledge-graph/entities?type=compound&related_to=target:nadd&relation=IS_LIGAND_FOR
→ list of Compound nodes + their IS_LIGAND_FOR edges to NadD
```

### Cross-document entity map
*"Show all entities mentioned in Artifact-A and their connections."*

```
GET /knowledge-graph/artifacts/{artifact_id}/entities
→ { compounds: [...], targets: [...], diseases: [...], relationships: [...] }
```

### Compound network
*"All NadD ligands with IC50 data, sorted by date."*

```
POST /knowledge-graph/query
body: { from_type: "compound", relation: "IS_LIGAND_FOR", to: "target:nadd",
        payload_filter: { "IC50": { exists: true } }, sort: "date:desc" }
```

---

## Compound Deduplication (Key Advantage)

CSER already produces canonical SMILES for every compound extracted from images.
Canonical SMILES is the **definitive identity key** for compounds:

- "SACC-123" in a 2021 paper and "SACC123" in a 2024 paper → same canonical SMILES → same node
- Two different compounds with similar names → different SMILES → separate nodes

This solves the hardest entity disambiguation problem in biomedical knowledge graphs
without any NLP heuristics. Non-compound entities (targets, diseases) require
normalisation (lowercase, alias matching) — less reliable but sufficient for Phase 1.

---

## Phase 1 vs Phase 2 Summary

| Concern | Phase 1 | Phase 2 |
|---------|---------|---------|
| Storage | MongoDB adjacency model | Neo4j |
| Relationship extraction | Co-occurrence heuristics | LLM triple extraction |
| Compound deduplication | Canonical SMILES (exact) | Same |
| Text entity deduplication | Normalised name (fuzzy Phase 2) | Alias + embedding lookup |
| Query complexity | 1-2 hop (two MongoDB queries) | N-hop Cypher traversal |
| Graph algorithms | None | Shortest path, centrality, clustering |

---

## Relationship to Vector Search

The knowledge graph and vector search are **complementary**, not competing:

| Capability | Vector Search | Knowledge Graph |
|------------|---------------|-----------------|
| "Find documents about NadD" | Yes (semantic) | Yes (entity lookup) |
| "What compounds target NadD?" | No | Yes |
| "IC50 values for SACC-123 over time?" | No | Yes |
| "Documents semantically similar to this abstract?" | Yes | No |
| "Which compounds have both IC50 and cytotoxicity data?" | No | Yes |

Ultimately both live side by side. A compound card UI would show:
- Vector search hits (similar documents, at the top)
- Knowledge graph panel (all known bioactivity data, all documents mentioning this compound)

---

## Files to create (when implementing)

| File | Role |
|------|------|
| `application/ports/knowledge_graph_store.py` | `KnowledgeGraphStore` Protocol |
| `application/dtos/knowledge_graph_dtos.py` | `EntityNode`, `KGEdge`, `EntityTimeline` DTOs |
| `application/use_cases/graph_projection_use_case.py` | `GraphProjectionUseCase` |
| `application/workflow_use_cases/trigger_graph_projection_use_case.py` | Trigger workflow |
| `infrastructure/knowledge_graph/mongo_kg_store.py` | MongoDB adjacency adapter (Phase 1) |
| `infrastructure/knowledge_graph/neo4j_kg_store.py` | Neo4j adapter (Phase 2) |
| `infrastructure/temporal/workflows/graph_projection_workflow.py` | `GraphProjectionWorkflow` |
| `infrastructure/temporal/activities/graph_projection_activities.py` | Activity factory |
| `interfaces/api/routes/knowledge_graph_routes.py` | `/knowledge-graph/*` endpoints |

## Files to modify (when implementing)

| File | Change |
|------|--------|
| `infrastructure/pipeline_worker.py` | Subscribe to `Page.TagMentionsUpdated` → trigger graph projection |
| `infrastructure/di/container.py` | Wire `KnowledgeGraphStore` + new use cases |
| `infrastructure/config.py` | Add `kg_store_type`, `kg_mongo_collection_prefix` (Phase 1) or `neo4j_uri` (Phase 2) |

---

## Key design invariants

- **Read model only** — the graph is a projection of domain events. No domain aggregate
  changes required. It can be dropped and rebuilt from EventStoreDB at any time.
- **Edges are immutable evidence** — new evidence adds new edges, never overwrites old ones.
  The graph accumulates knowledge; it never revises history.
- **Compound identity is exact** — canonical SMILES, not fuzzy name matching. Other entity
  types use normalised-name keys in Phase 1, with disambiguation improving in Phase 2.
- **Provenance on every edge** — every fact in the graph traces back to
  `(artifact_id, page_id, timestamp)`. No assertion without a source.
- **Prerequisite: NER Pipeline** — the graph depends entirely on `Page.TagMentionsUpdated`
  carrying typed entities. Implement [NER_PIPELINE.md](NER_PIPELINE.md) first.
