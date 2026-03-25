"use client";

import { usePathname } from "next/navigation";

function extractWorkspace(pathname: string): string {
  // pathname: /[workspace]/documents/... → workspace slug is segment[1]
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] ?? "unknown";
}

export function useAnalytics() {
  const pathname = usePathname();
  const workspace = extractWorkspace(pathname);

  const trackEvent = (name: string, data?: Record<string, string | number>) => {
    if (typeof window !== "undefined" && window.umami) {
      window.umami.track(name, { workspace, ...data });
    }
  };
  return { trackEvent };
}
