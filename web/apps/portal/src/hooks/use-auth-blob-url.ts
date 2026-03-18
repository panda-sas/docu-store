import { useEffect, useState } from "react";
import { getAuthzClient } from "@/lib/authz-client";

/**
 * Fetches a URL with auth headers and returns an object URL for use in
 * <iframe src> / <img src> where the browser can't attach custom headers.
 */
export function useAuthBlobUrl(url: string) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let revoke: string | null = null;
    const headers = getAuthzClient().getHeaders();

    fetch(url, { headers })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.blob();
      })
      .then((blob) => {
        revoke = URL.createObjectURL(blob);
        setBlobUrl(revoke);
      })
      .catch(() => setError(true));

    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [url]);

  return { blobUrl, error };
}
