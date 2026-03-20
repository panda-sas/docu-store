"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { authFetchJson } from "@/lib/auth-fetch";

// ---------- Response types ----------

interface WorkflowTypeStats {
  workflow_type: string;
  count: number;
  avg_duration_seconds: number;
  min_duration_seconds: number;
  max_duration_seconds: number;
  p95_duration_seconds: number;
}

interface ActiveWorkflow {
  workflow_type: string;
  count: number;
}

interface FailedWorkflow {
  workflow_id: string;
  workflow_type: string;
  started_at: string | null;
  closed_at: string | null;
  failure_message: string | null;
}

interface WorkflowStatsResponse {
  completed: WorkflowTypeStats[];
  active: ActiveWorkflow[];
  recent_failures: FailedWorkflow[];
}

interface PipelineStatsResponse {
  total_artifacts: number;
  total_pages: number;
  pages_with_text: number;
  pages_with_summary: number;
  pages_with_compounds: number;
  pages_with_tags: number;
}

interface CollectionStats {
  collection_name: string;
  points_count: number;
  indexed_vectors_count: number;
  status: string;
}

interface VectorStatsResponse {
  collections: CollectionStats[];
  embedding_model: Record<string, string | number>;
  reranker: Record<string, string | number> | null;
}

// ---------- Hooks ----------

export function useWorkflowStats() {
  return useQuery({
    queryKey: queryKeys.stats.workflows(),
    queryFn: () => authFetchJson<WorkflowStatsResponse>("/stats/workflows"),
    refetchInterval: 30_000,
  });
}

export function usePipelineStats() {
  return useQuery({
    queryKey: queryKeys.stats.pipeline(),
    queryFn: () => authFetchJson<PipelineStatsResponse>("/stats/pipeline"),
    refetchInterval: 30_000,
  });
}

export function useVectorStats() {
  return useQuery({
    queryKey: queryKeys.stats.vectors(),
    queryFn: () => authFetchJson<VectorStatsResponse>("/stats/vectors"),
    refetchInterval: 60_000,
  });
}

// ---------- Re-exports for page consumption ----------

export type {
  WorkflowTypeStats,
  ActiveWorkflow,
  FailedWorkflow,
  WorkflowStatsResponse,
  PipelineStatsResponse,
  CollectionStats,
  VectorStatsResponse,
};
