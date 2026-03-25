"use client";

import { useSectionTimer } from "@/hooks/use-section-timer";
import { useWebVitals } from "@/lib/web-vitals";

/**
 * Client component that activates analytics hooks.
 * Mount once inside the workspace layout.
 */
export function AnalyticsProvider() {
  useSectionTimer();
  useWebVitals();
  return null;
}
