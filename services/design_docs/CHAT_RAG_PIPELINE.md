# Chat RAG Pipeline Architecture

> Last updated: 2026-03-25 | Branch: `rag`

## Overview

The chat system is an agentic RAG (Retrieval-Augmented Generation) pipeline with three operating modes:
- **Quick** — lightweight, single-shot retrieval
- **Thinking** (v2) — agentic iterative retrieval with LLM tool-calling loop
- **Deep Thinking** — same as Thinking + page image analysis

All modes share the same SSE event schema and formatting/verification stages.

---

## Mode Dispatch

```
POST /chat/{conversation_id}/messages
Body: { message, mode: "quick"|"thinking"|"deep_thinking"|null }
         │
         ▼
  SendMessageUseCase
  ├─ verify conversation exists (MongoDB)
  ├─ save user message
  ├─ load last 10 messages as history
  ├─ extract previous_citations from last grounded assistant turn
  │
  └──► ChatAgentRouter
       effective_mode = mode ?? CHAT_DEFAULT_MODE
       │
       ├─ "quick"         → ChatAgent (agent.py)
       ├─ "thinking"      → ThinkingAgent (thinking_agent.py)
       └─ "deep_thinking" → ThinkingAgent (include_images=True, blob_store)
```

---

## Token Streaming Architecture

**Tokens reach the client ONLY during the Answer Formatting stage.** This is a key architectural decision:

```
  Synthesis (internal)               Formatting (client-facing)
  ┌────────────────────┐             ┌────────────────────────┐
  │ Generates draft    │             │ Reformats for coherence│
  │ Does NOT stream    │  ────►      │ Streams tokens as SSE  │
  │ to client          │  draft      │ AgentEvent(type="token")│
  │                    │             │                        │
  │ Emits thinking     │             │ User sees ONLY this    │
  │ events internally  │             │ polished stream        │
  └────────────────────┘             └────────────────────────┘
```

Both Quick and Thinking v2 follow this pattern. The old v1 (preserved in `thinking_agent_v1.py`) streamed tokens during synthesis directly.

Both agents wrap the entire pipeline in a `TokenCounter` context manager that captures prompt/completion counts from LLM API responses.

---

## Thinking Mode v2 Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                        THINKING MODE v2                           │
│                    (6 stages + retry loop)                        │
│                  infrastructure/chat/thinking_agent.py            │
└──────────────────────────────────────────────────────────────────┘

 STAGE 1: Query Planning ─────────────────────────────────────────
 nodes/query_planning.py

   asyncio.gather() — 3 parallel tracks:
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │ A) StructfloNER   │  │ B) GLiNER2       │  │ C) LLM Planning  │
   │   → compound_name │  │   → author names │  │   → query_type   │
   │   → target        │  │   (threshold 0.4)│  │   → reformulated │
   │   → gene_name     │  │                  │  │   → sub_queries  │
   └────────┬─────────┘  └────────┬─────────┘  │   → strategy     │
            │                     │             │   → hyde          │
            └──────────┬──────────┘             │   → confidence   │
                       ▼                        └────────┬─────────┘
             NER Merge (from history)                    │
             + Author Expand (tag dict)                  │
                       └─────────────┬───────────────────┘
                                     ▼
                                QueryPlan
                ──── emits: query_context SSE event ────

   NER Merge rules (_merge_ner_context):
   - follow_up + no new NER   → INHERIT all from last grounded turns
   - follow_up + new NER      → UNION (new wins on conflict)
   - not follow_up + overlap  → UNION (topic continuation)
   - not follow_up + no overlap → NEW ONLY (topic switch)


 STAGE 2: Agentic Retrieval ──────────────────────────────────────
 nodes/agentic_retrieval.py + tools/retrieval_tools.py

   ┌─── Step 0: Seed carried-forward citations ──────────────┐
   │  accumulator.seed_carried_forward(previous_citations)    │
   │  score = 0.5, source = "carried_forward"                 │
   │  Detect [N] refs in question → get_page_content          │
   └──────────────────────────────────────────────────────────┘
                         │
   ┌─── Step 1a: Auto-seed vector search ────────────────────┐
   │  search_documents(query, NER entity_types, tags)         │
   │  + search_documents(query, no filters)                   │
   │    (skipped in factual mode: CHAT_FACTUAL_SKIP_UNFILTERED)│
   └──────────────────────────────────────────────────────────┘
                         │
   ┌─── Step 1b: Bioactivity pre-fetch ──────────────────────┐
   │  For each compound_name in NER:                          │
   │    search_structured_bioactivity(compound, target?)      │
   │  Direct MongoDB lookup — bypasses vector similarity      │
   └──────────────────────────────────────────────────────────┘
                         │
   ┌─── Step 2: LLM Tool-Calling Loop ──────────────────────┐
   │                                                          │
   │  while iterations < 5:                                   │
   │    LLM evaluates accumulated results                     │
   │    LLM decides → call tool or finish_retrieval           │
   │                                                          │
   │    Available Tools:                                      │
   │    ├─ search_documents (chunks + summaries via Qdrant)   │
   │    ├─ search_summaries (summary collection via Qdrant)   │
   │    ├─ get_page_content (full page text via MongoDB)      │
   │    ├─ search_structured_bioactivity (MongoDB direct)     │
   │    └─ finish_retrieval (signal done)                     │
   │                                                          │
   │    Guardrails:                                           │
   │    ├─ iteration_timeout: 30s per LLM call                │
   │    ├─ total_timeout: 120s for entire loop                │
   │    ├─ context budget: max chars in accumulator           │
   │    └─ factual force-inject: NER filters forced into      │
   │       search_documents AND search_summaries calls        │
   │                                                          │
   │    RetrievalAccumulator:                                 │
   │    ├─ Cross-iteration deduplication                      │
   │    ├─ Budget tracking (chars)                            │
   │    └─ Query tracking (prevent repeats)                   │
   └──────────────────────────────────────────────────────────┘
                         │
                yields: list[RetrievalResult]


 STAGE 3: Context Assembly ───────────────────────────────────────
 nodes/context_assembly.py (pure computation, no LLM)

   Cross-source dedup: chunk > summary for same page
   Tier by relevance:
     carried_forward → forced MEDIUM
     HIGH: rerank > 0.7 or similarity > 0.85
     MEDIUM: rerank > 0.4 or similarity > 0.6
     LOW: below thresholds

   Budget allocation:
     HIGH → full text
     MEDIUM → 1000 chars
     LOW → 200 chars

   Groups by artifact → hierarchical format with [N] citation indices
   ──── emits: retrieval_results SSE event ────
   Returns: (citations, sources_text, ContextMetadata)


 STAGE 3.5: Image Loading (deep_thinking only) ──────────────────

   Loads page PNGs from blob store → base64
   Dedup by (artifact_id, page_index)
   Top N by relevance (CHAT_DEEP_THINKING_MAX_IMAGES)


 STAGE 4: Adaptive Synthesis ─────────────────────────────────────
 nodes/adaptive_synthesis.py

   System prompt selected by query_type:
     factual → chat_system_factual
     comparative → chat_system_comparative
     exploratory → chat_system_exploratory
     compound → chat_system_compound
     follow_up → chat_system_followup

   Planning step → generate draft answer with [N] citations
   Does NOT stream to client — accumulates draft internally
   Forwards thinking events (plan reasoning) as SSE events


 STAGE 5: Inline Verification ────────────────────────────────────
 nodes/inline_verification.py

   1. Algorithmic citation coverage check
   2. Selective LLM verification when coverage low + factual

   ┌─ grounded? ─────────────────────── YES → continue to Stage 6
   │
   └─ NOT grounded + retries remain?
        ├─ Strategy A: broaden
        │  (set skip_unfiltered_seed=False, re-run with unfiltered)
        └─ Strategy B: augment
           (add unsupported claims to reformulated_query)
        → loop back to STAGE 2

   ──── emits: grounding_result SSE event ────


 STAGE 6: Answer Formatting ──────────────────────────────────────
 nodes/answer_formatting.py

   Reformats draft for coherence, preserves all [N] citations
   ★ THIS is where tokens stream to the client ★
     yield AgentEvent(type="token", delta=token)

   Re-extracts cited indices → final used_citations
   ──── emits: done SSE event ────
```

---

## Thinking Mode v1 Pipeline (Preserved)

`infrastructure/chat/thinking_agent_v1.py` — kept as reference for the old design.

```
  Stage 1: Query Planning
      │  (same 3-track parallel: NER + GLiNER + LLM)
      │  NO author expansion, NO query_context event
      ▼
  Stage 2: Intelligent Retrieval (intelligent_retrieval.py)
      │  ONE-SHOT parallel multi-query search
      │  primary + sub_queries + hyde → asyncio.gather()
      │  Filters: NER entity_types + tags
      │  Fallback: < 3 results → re-run unfiltered
      │  NO LLM loop, NO tool calling
      │  NO bioactivity, NO carried-forward
      ▼
  Stage 3: Context Assembly (same)
      ▼
  Stage 4: Adaptive Synthesis
      │  ★ Tokens stream DIRECTLY to client here ★
      ▼
  Stage 5: Inline Verification
      │  Single retry strategy: augment query only
      ▼
  done (NO formatting step)
```

Key differences from v2:
| Feature | v1 | v2 |
|---------|----|----|
| Retrieval | One-shot parallel (IntelligentRetrievalNode) | LLM tool-calling loop (AgenticRetrievalNode) |
| Bioactivity | None | Deterministic pre-fetch for compound NER |
| Citation continuity | None | Carried-forward + explicit [N] refs |
| NER across turns | None | Merge/inherit from grounded history |
| Author expansion | None | Tag dictionary prefix search |
| Token streaming | During synthesis | During formatting only |
| Formatting stage | None | Separate stage 6 |
| Retry strategies | Augment only | Broaden then augment |
| Image loading | None | deep_thinking mode |
| Token tracking | Streamed count | TokenCounter (API-level) |

---

## Quick Mode Pipeline

```
  infrastructure/chat/agent.py

  Step 1: Question Analysis (question_analysis.py)
      │  Single LLM call (no NER, no GLiNER, no sub-queries)
      │  Uses build_follow_up_context(history)
      │  ──── emits: query_context (entities=[]) ────
      ▼
  Step 2: Retrieval (retrieval.py)
      │  Single-shot search (not agentic)
      │  Returns: (citations, sources_text)
      │  ──── emits: retrieval_results ────
      ▼
  Step 3: Answer Synthesis (answer_synthesis.py)
      │  Accumulates draft internally
      │  Does NOT stream tokens to client
      │  Emits draft as thinking_content on step_completed
      ▼
  Step 4: Grounding Verification (grounding_verification.py)
      │  ★ Verifies against CITED sources only ★
      │  _build_cited_sources_text() filters source text
      │  to only sections matching cited [N] indices
      │  ──── emits: grounding_result ────
      │
      │  NOT grounded + retries?
      │    → augment query → loop to Step 2
      ▼
  Step 5: Answer Formatting (answer_formatting.py)
      │  ★ Tokens stream to client HERE ★
      │  yield AgentEvent(type="token", delta=token)
      │  Re-extracts cited indices → final used_citations
      │  ──── emits: done ────
      ▼
```

---

## SSE Event Schema

| SSE Event | Internal Type | Content |
|-----------|--------------|---------|
| `agent_step` | `step_started` / `step_completed` | Step progress + optional `thinking_content` + `thinking_label` |
| `retrieval_results` | `retrieval_results` | Citation sources for frontend sidebar |
| `token` | `token` | Streaming answer delta (only during formatting) |
| `structured_block` | `structured_block` | Rich content (table, molecule) |
| `grounding_result` | `grounding_result` | `is_grounded` + `confidence` |
| `query_context` | `query_context` | entities, authors, query_type, reformulated_query |
| `done` | `done` | message_id, total_tokens, prompt_tokens, completion_tokens, duration_ms, sources |
| `error` | `error` | Error message |

### SSE Timeline (Thinking v2)

```
time ──────────────────────────────────────────────────────────────►

 step_started(planning)
 step_completed(planning) + thinking_content (label: "Query Analysis")
 query_context(entities, authors, type)
 │
 step_started(retrieval)
 │  step_completed(retrieval) "Bioactivity pre-fetch: X → N results"
 │  step_completed(retrieval) "Initial search: 8 filtered + 3 unfiltered"
 │  step_completed(retrieval) + thinking_content (label: "Search Iteration 1")
 │  step_completed(retrieval) "Model finished retrieval (15 sources)"
 │
 step_started(assembly)
 step_completed(assembly) "15 sources from 5 documents"
 retrieval_results(citations[])
 │
 step_started(synthesis)
 step_completed(synthesis)
 │
 step_started(verification)
 step_completed(verification) + thinking_content (label: "Citation Verification")
 grounding_result(is_grounded, confidence)
 │
 step_started(formatting)
 │  token token token token ... (★ streamed to client ★)
 step_completed(formatting)
 │
 done(message_id, tokens, sources)
```

---

## Follow-up Query Behavior

1. **History**: last 10 messages loaded from MongoDB
2. **Context window**: `build_follow_up_context()` — 4000-char budget
   - User messages: full text
   - Assistant messages: 600 chars + citation summary + query_context summary
   - Most recent pair gets 2x budget share
3. **Classification**: LLM classifies as `follow_up` → uses `chat_system_followup` prompt
4. **NER Accumulation**: inherits entities from prior grounded turns via `_merge_ner_context`
5. **Citation Continuity**: `previous_citations` seeded into accumulator at score 0.5
6. **Explicit refs**: `[N]` in question triggers full page fetch for that citation
7. **Bioactivity**: `search_structured_bioactivity` leverages pre-extracted data

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CHAT_DEBUG` | `false` | Verbose debug logging |
| `CHAT_DEFAULT_MODE` | `thinking` | Default agent mode |
| `CHAT_MAX_RETRIES` | `1` | Grounding verification retries |
| `CHAT_FOLLOW_UP_CONTEXT_BUDGET` | `4000` | Char budget for follow-up context |
| `CHAT_FACTUAL_SKIP_UNFILTERED` | `true` | Skip unfiltered seed in factual mode |
| `CHAT_AGENT_MAX_ITERATIONS` | `5` | Max LLM tool-calling iterations |
| `CHAT_AGENT_ITERATION_TIMEOUT_S` | `30` | Per-iteration timeout |
| `CHAT_AGENT_TOTAL_TIMEOUT_S` | `120` | Total retrieval loop timeout |
| `CHAT_CONTEXT_BUDGET_CHARS` | — | Max chars for retrieval accumulator |
| `CHAT_DEEP_THINKING_MAX_IMAGES` | — | Max page images for deep thinking |

---

## File Map

| File | Purpose |
|------|---------|
| `infrastructure/chat/thinking_agent.py` | v2 ThinkingAgent (agentic, current) |
| `infrastructure/chat/thinking_agent_v1.py` | v1 ThinkingAgent (one-shot, preserved) |
| `infrastructure/chat/agent.py` | Quick mode ChatAgent |
| `application/services/chat_agent_router.py` | Mode dispatch router |
| `infrastructure/chat/nodes/query_planning.py` | Stage 1: NER + GLiNER + LLM planning |
| `infrastructure/chat/nodes/agentic_retrieval.py` | Stage 2 (v2): LLM tool loop |
| `infrastructure/chat/nodes/intelligent_retrieval.py` | Stage 2 (v1): parallel multi-query |
| `infrastructure/chat/nodes/context_assembly.py` | Stage 3: tiering + dedup |
| `infrastructure/chat/nodes/adaptive_synthesis.py` | Stage 4: query-type prompts |
| `infrastructure/chat/nodes/inline_verification.py` | Stage 5: grounding check |
| `infrastructure/chat/nodes/answer_formatting.py` | Stage 6 / Step 5: stream to client |
| `infrastructure/chat/nodes/question_analysis.py` | Quick Step 1: single LLM analysis |
| `infrastructure/chat/nodes/answer_synthesis.py` | Quick Step 3: draft generation |
| `infrastructure/chat/nodes/grounding_verification.py` | Quick Step 4: full LLM verification |
| `infrastructure/chat/nodes/retrieval.py` | Quick Step 2: single-shot search |
| `infrastructure/chat/tools/retrieval_tools.py` | Tool definitions + ToolRegistry |
| `infrastructure/chat/retrieval_accumulator.py` | Cross-iteration dedup/budget |
| `infrastructure/chat/models.py` | QueryPlan, RetrievalResult, etc. |
| `infrastructure/chat/utils.py` | build_follow_up_context, extract_cited_indices |
| `infrastructure/chat/context_builder.py` | Context formatting utilities |
| `infrastructure/chat/mongo_chat_repository.py` | MongoDB conversation persistence |
| `application/dtos/chat_dtos.py` | AgentEvent, ChatMessageDTO, QueryContextDTO |
