"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@docu-store/api-client";
import { throwApiError } from "@/lib/api-error";

export interface SearchParams {
  query_text: string;
  tags?: string[];
  entity_types?: string[];
  tag_match_mode?: "any" | "all";
}

// ── Query-based hooks (URL-driven, cacheable, back-button friendly) ─────────

export function useTextSearchQuery(params: SearchParams | null) {
  return useQuery({
    queryKey: ["search", "text", params?.query_text, params?.tags, params?.tag_match_mode],
    queryFn: async () => {
      const { data, error, response } = await apiClient.POST("/search/pages", {
        body: {
          query_text: params!.query_text,
          limit: 10,
          tags: params!.tags,
          entity_types: params!.entity_types,
          tag_match_mode: params!.tag_match_mode,
        },
      });
      if (error) throwApiError("Failed to search pages", error, response.status);
      return data;
    },
    enabled: !!params?.query_text,
    staleTime: 5 * 60 * 1000, // 5 min — back navigation serves from cache
  });
}

export function useSummarySearchQuery(params: SearchParams | null) {
  return useQuery({
    queryKey: ["search", "summary", params?.query_text, params?.tags, params?.tag_match_mode],
    queryFn: async () => {
      const { data, error, response } = await apiClient.POST("/search/summaries", {
        body: {
          query_text: params!.query_text,
          limit: 10,
          tags: params!.tags,
          entity_types_filter: params!.entity_types,
          tag_match_mode: params!.tag_match_mode,
        },
      });
      if (error) throwApiError("Failed to search summaries", error, response.status);
      return data;
    },
    enabled: !!params?.query_text,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHierarchicalSearchQuery(params: (SearchParams & { include_chunks?: boolean }) | null) {
  return useQuery({
    queryKey: ["search", "hierarchical", params?.query_text, params?.tags, params?.tag_match_mode],
    queryFn: async () => {
      const { data, error, response } = await apiClient.POST("/search/hierarchical", {
        body: {
          query_text: params!.query_text,
          limit: 10,
          include_chunks: params!.include_chunks ?? true,
          tags: params!.tags,
          entity_types_filter: params!.entity_types,
          tag_match_mode: params!.tag_match_mode,
        },
      });
      if (error) throwApiError("Failed to perform hierarchical search", error, response.status);
      return data;
    },
    enabled: !!params?.query_text,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mutation-based hooks (for SearchCommand inline preview & compounds) ──────

export function useHierarchicalSearchMutation() {
  return useMutation({
    mutationFn: async (params: {
      query_text: string;
      limit?: number;
      include_chunks?: boolean;
    }) => {
      const { data, error, response } = await apiClient.POST("/search/hierarchical", {
        body: {
          query_text: params.query_text,
          limit: params.limit ?? 6,
          include_chunks: params.include_chunks ?? true,
        },
      });
      if (error) throwApiError("Failed to perform hierarchical search", error, response.status);
      return data;
    },
  });
}

export function useSearchCompounds() {
  return useMutation({
    mutationFn: async (params: {
      query_smiles: string;
      limit?: number;
      artifact_id?: string;
      score_threshold?: number;
    }) => {
      const { data, error, response } = await apiClient.POST("/search/compounds", {
        body: {
          query_smiles: params.query_smiles,
          limit: params.limit ?? 10,
          artifact_id: params.artifact_id,
          score_threshold: params.score_threshold,
        },
      });
      if (error) throwApiError("Failed to search compounds", error, response.status);
      return data;
    },
  });
}
