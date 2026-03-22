import {
  isExpired,
  loadCredentials,
  saveCredentials,
  type Credentials,
} from "../auth/credentials.js";
import { resolve, SentinelError } from "../auth/sentinel.js";
import { loadConfig } from "../utils/config.js";
import * as log from "../utils/logger.js";

/**
 * Get a valid set of credentials, auto-refreshing the authz token if expired.
 * Exits on auth failure.
 */
export async function getAuthCredentials(): Promise<Credentials> {
  const creds = loadCredentials();
  if (!creds) {
    log.error("Not logged in. Run: docu login");
    process.exit(1);
  }

  if (!isExpired(creds)) {
    return creds;
  }

  // Try to refresh
  if (!creds.idp_token) {
    log.error("Token expired and no IdP token for refresh. Run: docu login");
    process.exit(1);
  }

  log.info("Refreshing authorization token...");
  const config = loadConfig();

  try {
    const result = await resolve(
      config.sentinel_url,
      creds.idp_token,
      creds.provider,
      creds.workspace_id,
    );

    if (!result.authz_token || !result.expires_in) {
      log.error("Token refresh failed. Run: docu login");
      process.exit(1);
    }

    creds.authz_token = result.authz_token;
    creds.expires_at = Date.now() / 1000 + result.expires_in;
    saveCredentials(creds);
    return creds;
  } catch (err) {
    if (err instanceof SentinelError) {
      log.error(`Token refresh failed: ${err.message}. Run: docu login`);
    } else {
      log.error(`Token refresh failed. Run: docu login`);
    }
    process.exit(1);
  }
}

/** Build the dual-token auth headers matching @sentinel-auth/js getHeaders(). */
export function authHeaders(creds: Credentials): Record<string, string> {
  return {
    Authorization: `Bearer ${creds.idp_token}`,
    "X-Authz-Token": creds.authz_token,
  };
}

/** Upload a file via multipart POST to /artifacts/upload. */
export async function uploadFile(
  apiUrl: string,
  creds: Credentials,
  filePath: string,
  fileName: string,
  fileData: Uint8Array,
  artifactType: string,
  visibility: string,
): Promise<{ artifact_id: string; pages: unknown[] }> {
  const formData = new FormData();
  formData.append("file", new Blob([fileData]), fileName);
  formData.append("artifact_type", artifactType);
  formData.append("visibility", visibility);

  const resp = await fetch(`${apiUrl}/artifacts/upload`, {
    method: "POST",
    headers: authHeaders(creds),
    body: formData,
  });

  if (resp.status === 401) {
    throw new Error("AUTH_EXPIRED");
  }

  if (!resp.ok) {
    let detail: string;
    try {
      const body = await resp.json();
      detail = (body as { detail?: string }).detail || resp.statusText;
    } catch {
      detail = resp.statusText;
    }
    throw new Error(`Upload failed (${resp.status}): ${detail}`);
  }

  return (await resp.json()) as { artifact_id: string; pages: unknown[] };
}

/** Fetch all existing artifact filenames for --resume support. */
export async function listArtifactFilenames(
  apiUrl: string,
  creds: Credentials,
): Promise<Set<string>> {
  const filenames = new Set<string>();
  let skip = 0;
  const limit = 100;

  while (true) {
    const resp = await fetch(
      `${apiUrl}/artifacts?skip=${skip}&limit=${limit}`,
      { headers: authHeaders(creds) },
    );

    if (!resp.ok) {
      throw new Error(`Failed to list artifacts: ${resp.status}`);
    }

    const artifacts = (await resp.json()) as Array<{ source_filename?: string }>;
    if (!artifacts.length) break;

    for (const a of artifacts) {
      if (a.source_filename) {
        filenames.add(a.source_filename);
      }
    }

    if (artifacts.length < limit) break;
    skip += limit;
  }

  return filenames;
}
