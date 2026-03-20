"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  BrowseCategoriesResponse,
  BrowseFoldersResponse,
  ArtifactBrowseItemDTO,
  PopularTagDTO,
} from "@docu-store/types";
import { queryKeys } from "@/lib/query-keys";
import { authFetchJson } from "@/lib/auth-fetch";

export function useTagCategories() {
  return useQuery({
    queryKey: queryKeys.browse.categories(),
    queryFn: () => authFetchJson<BrowseCategoriesResponse>("/browse/categories?limit=10"),
    staleTime: 120_000,
  });
}

export function useTagFolders(entityType: string | null, parent?: string) {
  const params = parent ? `?parent=${encodeURIComponent(parent)}` : "";
  return useQuery({
    queryKey: queryKeys.browse.folders(entityType ?? "", parent),
    queryFn: () =>
      authFetchJson<BrowseFoldersResponse>(
        `/browse/categories/${encodeURIComponent(entityType!)}/folders${params}`,
      ),
    enabled: !!entityType,
    staleTime: 60_000,
  });
}

export function usePopularTags(entityType?: string, limit = 15) {
  const params = new URLSearchParams();
  if (entityType) params.set("entity_type", entityType);
  params.set("limit", String(limit));

  return useQuery({
    queryKey: queryKeys.browse.popularTags(entityType),
    queryFn: () =>
      authFetchJson<PopularTagDTO[]>(`/browse/tags/popular?${params.toString()}`),
    staleTime: 120_000,
  });
}

export function useFolderArtifacts(
  entityType: string | null,
  tagValue: string | null,
) {
  return useQuery({
    queryKey: queryKeys.browse.artifacts(entityType ?? "", tagValue ?? ""),
    queryFn: () =>
      authFetchJson<ArtifactBrowseItemDTO[]>(
        `/browse/categories/${encodeURIComponent(entityType!)}/folders/${encodeURIComponent(tagValue!)}/artifacts`,
      ),
    enabled: !!entityType && !!tagValue,
  });
}
