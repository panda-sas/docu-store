"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch, authFetchJson } from "@/lib/auth-fetch";
import { queryKeys } from "@/lib/query-keys";

export interface SearchHistoryEntry {
  query_text: string;
  search_mode: string;
  result_count: number | null;
  created_at: string;
}

export interface RecentDocumentEntry {
  artifact_id: string;
  artifact_title: string | null;
  created_at: string;
}

export function useRecentSearches(limit = 10) {
  return useQuery({
    queryKey: queryKeys.user.activity.searches(),
    queryFn: () =>
      authFetchJson<SearchHistoryEntry[]>(`/user/activity/searches?limit=${limit}`),
    staleTime: 30_000,
  });
}

export function useRecentDocuments(limit = 10) {
  return useQuery({
    queryKey: queryKeys.user.activity.documents(),
    queryFn: () =>
      authFetchJson<RecentDocumentEntry[]>(`/user/activity/documents?limit=${limit}`),
    staleTime: 30_000,
  });
}

export function useDeleteSearchEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (queryText: string) => {
      const res = await authFetch(
        `/user/activity/searches/${encodeURIComponent(queryText)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete search entry");
    },
    onMutate: async (queryText) => {
      // Optimistic: remove from cache immediately
      await queryClient.cancelQueries({ queryKey: queryKeys.user.activity.searches() });
      const prev = queryClient.getQueryData<SearchHistoryEntry[]>(queryKeys.user.activity.searches());
      if (prev) {
        queryClient.setQueryData(
          queryKeys.user.activity.searches(),
          prev.filter((e) => e.query_text !== queryText),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(queryKeys.user.activity.searches(), context.prev);
      }
    },
  });
}

export function useClearSearchHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await authFetch("/user/activity/searches", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear search history");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.user.activity.searches() });
      const prev = queryClient.getQueryData<SearchHistoryEntry[]>(queryKeys.user.activity.searches());
      queryClient.setQueryData(queryKeys.user.activity.searches(), []);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(queryKeys.user.activity.searches(), context.prev);
      }
    },
  });
}
