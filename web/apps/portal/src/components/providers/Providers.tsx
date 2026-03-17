"use client";

import { AuthzProvider } from "@sentinel-auth/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { PrimeReactProvider } from "primereact/api";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SentinelAuthz } from "@sentinel-auth/js";

import { getAuthzClient } from "@/lib/authz-client";
import { apiClient } from "@docu-store/api-client";
import { authMiddleware } from "@/lib/api-auth-middleware";
import { getQueryClient } from "@/lib/query-client";

import { ThemeProvider } from "./ThemeProvider";

// ripple: true enables PrimeReact's touch-feedback ripple animation on buttons
const primeReactConfig = {
  ripple: true,
};

/**
 * Root client-side provider tree.
 *
 * Order matters:
 *  1. AuthzProvider      — Sentinel auth context (outermost, no deps on others)
 *  2. QueryClientProvider — TanStack Query must wrap everything that uses useQuery/useMutation
 *  3. PrimeReactProvider  — PrimeReact context (ripple, locale, etc.)
 *  4. ThemeProvider       — Injects the PrimeReact theme CSS link and sets data-theme on <html>
 */
export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  const clientRef = useRef<SentinelAuthz | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    clientRef.current = getAuthzClient();
    apiClient.use(authMiddleware);
    setMounted(true);
    return () => {
      apiClient.eject(authMiddleware);
    };
  }, []);

  if (!mounted) return null;

  return (
    <AuthzProvider client={clientRef.current!}>
      <QueryClientProvider client={queryClient}>
        <PrimeReactProvider value={primeReactConfig}>
          <ThemeProvider>{children}</ThemeProvider>
        </PrimeReactProvider>
      </QueryClientProvider>
    </AuthzProvider>
  );
}
