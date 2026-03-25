"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAnalytics } from "./use-analytics";

/**
 * Tracks active time spent on each workspace section.
 * Fires a `section_active_time` event on route change with the section name
 * and active seconds (pauses when tab is hidden).
 */
export function useSectionTimer() {
  const pathname = usePathname();
  const { trackEvent } = useAnalytics();

  const activeMs = useRef(0);
  const lastTick = useRef(Date.now());
  const sectionRef = useRef(pathname);

  useEffect(() => {
    // Flush previous section on route change
    if (sectionRef.current !== pathname) {
      const seconds = Math.round(activeMs.current / 1000);
      if (seconds > 0) {
        const section = extractSection(sectionRef.current);
        trackEvent("section_active_time", { section, active_seconds: seconds });
      }
      activeMs.current = 0;
      lastTick.current = Date.now();
      sectionRef.current = pathname;
    }
  }, [pathname, trackEvent]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        activeMs.current += Date.now() - lastTick.current;
      }
      lastTick.current = Date.now();
    };

    const onVisibilityChange = () => {
      tick();
    };

    const onBeforeUnload = () => {
      tick();
      const seconds = Math.round(activeMs.current / 1000);
      if (seconds > 0) {
        const section = extractSection(sectionRef.current);
        trackEvent("section_active_time", { section, active_seconds: seconds });
      }
    };

    const interval = setInterval(tick, 5000);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [trackEvent]);
}

/** Extract section name from pathname, e.g. "/acme/documents/123" → "documents" */
function extractSection(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  // parts[0] = workspace slug, parts[1] = section
  return parts[1] || "dashboard";
}
