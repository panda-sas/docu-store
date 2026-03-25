import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { loadConfig } from "../utils/config.js";
import { getAuthCredentials, authHeaders } from "../api/client.js";
import * as log from "../utils/logger.js";

interface DeleteOptions {
  id?: string;
  force?: boolean;
  apiUrl?: string;
}

export async function deleteCommand(
  filename: string,
  opts: DeleteOptions,
): Promise<void> {
  const config = loadConfig();
  const apiUrl = (opts.apiUrl || config.api_url).replace(/\/$/, "");
  const creds = await getAuthCredentials();

  const artifactId = opts.id || (await findArtifactByFilename(apiUrl, creds, filename));
  if (!artifactId) {
    log.error(`No artifact found for "${filename}"`);
    process.exit(1);
  }

  // Confirm unless --force
  if (!opts.force) {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      const answer = await rl.question(
        `Delete "${filename}"? This cannot be undone. [y/N]: `,
      );
      if (answer.trim().toLowerCase() !== "y") {
        log.info("Cancelled.");
        return;
      }
    } finally {
      rl.close();
    }
  }

  const resp = await fetch(`${apiUrl}/artifacts/${artifactId}`, {
    method: "DELETE",
    headers: authHeaders(creds),
  });

  if (resp.status === 204 || resp.ok) {
    log.success(`Deleted "${filename}"`);
  } else if (resp.status === 404) {
    log.error("Artifact not found.");
  } else {
    log.error(`Delete failed: ${resp.status}`);
  }
}

async function findArtifactByFilename(
  apiUrl: string,
  creds: { idp_token: string; authz_token: string },
  filename: string,
): Promise<string | null> {
  let skip = 0;
  const limit = 100;

  while (true) {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
      sort_by: "updated_at",
      sort_order: "-1",
    });

    const resp = await fetch(`${apiUrl}/artifacts?${params}`, {
      headers: authHeaders(creds),
    });

    if (!resp.ok) return null;

    const artifacts = (await resp.json()) as Array<{
      artifact_id: string;
      source_filename: string | null;
    }>;
    if (!artifacts.length) return null;

    const match = artifacts.find(
      (a) =>
        a.source_filename === filename ||
        a.source_filename?.toLowerCase() === filename.toLowerCase(),
    );

    if (match) return match.artifact_id;
    if (artifacts.length < limit) return null;
    skip += limit;
  }
}
