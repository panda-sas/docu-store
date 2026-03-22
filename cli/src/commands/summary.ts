import { loadConfig } from "../utils/config.js";
import { getAuthCredentials, authHeaders } from "../api/client.js";
import * as log from "../utils/logger.js";
import pc from "picocolors";

interface SummaryOptions {
  id?: string;
  json?: boolean;
  apiUrl?: string;
}

interface SummaryDetailResponse {
  entity_id: string;
  summary: string | null;
  model_name: string | null;
  date_extracted: string | null;
  is_locked: boolean;
  hil_correction: string | null;
}

export async function summaryCommand(
  filename: string,
  opts: SummaryOptions,
): Promise<void> {
  const config = loadConfig();
  const apiUrl = (opts.apiUrl || config.api_url).replace(/\/$/, "");
  const creds = await getAuthCredentials();

  const artifactId = opts.id || (await findArtifactByFilename(apiUrl, creds, filename));
  if (!artifactId) {
    log.error(`No artifact found for "${filename}"`);
    process.exit(1);
  }

  const resp = await fetch(`${apiUrl}/artifacts/${artifactId}/summary`, {
    headers: authHeaders(creds),
  });

  if (resp.status === 404) {
    log.info("No summary available yet. The document may still be processing.");
    return;
  }

  if (!resp.ok) {
    log.error(`Failed to get summary: ${resp.status}`);
    process.exit(1);
  }

  const data = (await resp.json()) as SummaryDetailResponse;

  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Also fetch artifact details for title
  const detailResp = await fetch(`${apiUrl}/artifacts/${artifactId}`, {
    headers: authHeaders(creds),
  });
  let title = filename;
  if (detailResp.ok) {
    const detail = (await detailResp.json()) as {
      source_filename: string | null;
      title_mention: { title: string } | null;
    };
    title = detail.title_mention?.title || detail.source_filename || filename;
  }

  console.log(`\n${pc.bold(title)}`);
  console.log("─".repeat(70));

  const summary = data.hil_correction || data.summary;
  if (!summary) {
    log.info("Summary is empty.");
    return;
  }

  console.log(`\n${summary}\n`);

  const meta: string[] = [];
  if (data.model_name) meta.push(`Model: ${data.model_name}`);
  if (data.date_extracted) meta.push(`Date: ${data.date_extracted.split("T")[0]}`);
  if (data.is_locked) meta.push("Locked (user-edited)");
  if (meta.length > 0) {
    console.log(pc.dim(meta.join(" | ")));
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
