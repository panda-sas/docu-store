import { loadConfig } from "../utils/config.js";
import { getAuthCredentials, authHeaders } from "../api/client.js";
import * as log from "../utils/logger.js";

interface ListOptions {
  limit: string;
  sort: string;
  json?: boolean;
  apiUrl?: string;
}

interface ArtifactResponse {
  artifact_id: string;
  source_filename: string | null;
  artifact_type: string;
  title_mention: { title: string } | null;
  pages: unknown[] | null;
  tag_mentions: Array<{ tag: string; entity_type: string | null }>;
  author_mentions: Array<{ name: string }>;
  presentation_date: { date: string } | null;
  summary_candidate: { summary: string } | null;
}

export async function listCommand(opts: ListOptions): Promise<void> {
  const config = loadConfig();
  const apiUrl = (opts.apiUrl || config.api_url).replace(/\/$/, "");
  const limit = parseInt(opts.limit, 10);
  const creds = await getAuthCredentials();

  const sortBy = opts.sort === "name" ? "source_filename" : "updated_at";
  const params = new URLSearchParams({
    skip: "0",
    limit: String(limit),
    sort_by: sortBy,
    sort_order: "-1",
  });

  const resp = await fetch(`${apiUrl}/artifacts?${params}`, {
    headers: authHeaders(creds),
  });

  if (!resp.ok) {
    log.error(`Failed to list artifacts: ${resp.status}`);
    process.exit(1);
  }

  const artifacts = (await resp.json()) as ArtifactResponse[];

  if (artifacts.length === 0) {
    log.info("No documents found in this workspace.");
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify(artifacts, null, 2));
    return;
  }

  // Table output
  console.log("");
  const header = padRow("Filename", "Title", "Pages", "Type");
  console.log(header);
  console.log("─".repeat(header.length));

  for (const a of artifacts) {
    const filename = a.source_filename || "(unknown)";
    const title = a.title_mention?.title
      ? truncate(a.title_mention.title, 40)
      : "—";
    const pages = a.pages ? String(a.pages.length) : "—";
    const type = a.artifact_type || "—";

    console.log(padRow(truncate(filename, 35), title, pages, type));
  }

  console.log(`\n${artifacts.length} document(s) shown.`);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function padRow(
  filename: string,
  title: string,
  pages: string,
  type: string,
): string {
  return (
    filename.padEnd(37) +
    title.padEnd(42) +
    pages.padEnd(7) +
    type
  );
}
