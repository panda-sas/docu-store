"use client";

import { useQuery } from "@tanstack/react-query";
import type { ArtifactResponse } from "@docu-store/types";
import { useArtifacts } from "./use-artifacts";
import { queryKeys } from "@/lib/query-keys";
import { API_URL } from "@/lib/constants";
import { getAuthzClient } from "@/lib/authz-client";

export interface DashboardStats {
  totalArtifacts: number;
  totalPages: number;
  totalCompounds: number;
  withSummary: number;
}

function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async (): Promise<DashboardStats> => {
      const authHeaders = getAuthzClient().getHeaders();
      const res = await fetch(`${API_URL}/dashboard/stats`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      const data = await res.json();
      return {
        totalArtifacts: data.total_artifacts,
        totalPages: data.total_pages,
        totalCompounds: data.total_compounds,
        withSummary: data.with_summary,
      };
    },
  });
}

export function useDashboard() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useDashboardStats();

  const {
    data: artifactsData,
    isLoading: artifactsLoading,
    error: artifactsError,
  } = useArtifacts(0, 10);

  const recentArtifacts =
    (artifactsData as ArtifactResponse[] | undefined) ?? [];

  return {
    stats: stats ?? {
      totalArtifacts: 0,
      totalPages: 0,
      totalCompounds: 0,
      withSummary: 0,
    },
    recentArtifacts,
    isLoading: statsLoading || artifactsLoading,
    error: statsError ?? artifactsError,
  };
}
