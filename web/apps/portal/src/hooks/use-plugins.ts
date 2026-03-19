"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { authFetch } from "@/lib/auth-fetch";

interface PluginManifest {
  name: string;
  version: string;
  description: string;
}

export function usePlugins() {
  const { data: plugins = [], isLoading } = useQuery<PluginManifest[]>({
    queryKey: queryKeys.plugins.all,
    queryFn: async () => {
      const res = await authFetch("/plugins");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: Infinity,
  });

  const isPluginEnabled = (name: string) =>
    plugins.some((p) => p.name === name);

  return { plugins, isPluginEnabled, isLoading };
}
