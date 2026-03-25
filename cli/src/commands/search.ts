import { loadConfig } from "../utils/config.js";
import { getAuthCredentials, authHeaders } from "../api/client.js";
import * as log from "../utils/logger.js";
import pc from "picocolors";

interface SearchOptions {
  limit: string;
  type: string;
  json?: boolean;
  apiUrl?: string;
}

interface SummaryHit {
  entity_type: "page" | "artifact";
  entity_id: string;
  artifact_id: string;
  score: number;
  summary_text: string | null;
  artifact_title: string | null;
  page_index: number | null;
  authors: string[];
  presentation_date: string | null;
}

interface ChunkHit {
  page_id: string;
  artifact_id: string;
  page_index: number;
  score: number;
  text_preview: string | null;
  artifact_name: string | null;
  rerank_score: number | null;
}

interface HierarchicalResponse {
  query: string;
  summary_hits: SummaryHit[];
  chunk_hits: ChunkHit[];
  total_summary_hits: number;
  total_chunk_hits: number;
}

export async function searchCommand(
  query: string,
  opts: SearchOptions,
): Promise<void> {
  const config = loadConfig();
  const apiUrl = (opts.apiUrl || config.api_url).replace(/\/$/, "");
  const limit = parseInt(opts.limit, 10);
  const creds = await getAuthCredentials();

  // Use hierarchical search for the richest results
  const body: Record<string, unknown> = {
    query_text: query,
    limit,
    include_chunks: opts.type !== "summary",
  };

  const resp = await fetch(`${apiUrl}/search/hierarchical`, {
    method: "POST",
    headers: {
      ...authHeaders(creds),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    let detail: string;
    try {
      const err = await resp.json();
      detail = (err as { detail?: string }).detail || resp.statusText;
    } catch {
      detail = resp.statusText;
    }
    log.error(`Search failed: ${detail}`);
    process.exit(1);
  }

  const result = (await resp.json()) as HierarchicalResponse;

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const hasSummaries = result.summary_hits.length > 0;
  const hasChunks = result.chunk_hits.length > 0;

  if (!hasSummaries && !hasChunks) {
    log.info("No results found.");
    return;
  }

  // Show summary hits
  if (hasSummaries) {
    console.log(`\n${pc.bold("Summary matches")} (${result.total_summary_hits})`);
    console.log("─".repeat(70));

    for (const hit of result.summary_hits) {
      const label =
        hit.entity_type === "artifact"
          ? pc.cyan(`[doc] ${hit.artifact_title || hit.artifact_id}`)
          : pc.blue(`[p${hit.page_index}] ${hit.artifact_title || hit.artifact_id}`);
      const score = pc.dim(`(${(hit.score * 100).toFixed(0)}%)`);

      console.log(`  ${label} ${score}`);

      if (hit.summary_text) {
        const preview = truncate(hit.summary_text.replace(/\n/g, " "), 120);
        console.log(`    ${pc.dim(preview)}`);
      }

      if (hit.authors.length > 0) {
        console.log(`    ${pc.dim("Authors: " + hit.authors.join(", "))}`);
      }
      console.log("");
    }
  }

  // Show chunk hits
  if (hasChunks) {
    console.log(`${pc.bold("Text matches")} (${result.total_chunk_hits})`);
    console.log("─".repeat(70));

    for (const hit of result.chunk_hits) {
      const name = hit.artifact_name || hit.artifact_id;
      const label = pc.green(`[p${hit.page_index}] ${name}`);
      const score = pc.dim(`(${(hit.score * 100).toFixed(0)}%)`);

      console.log(`  ${label} ${score}`);

      if (hit.text_preview) {
        const preview = truncate(hit.text_preview.replace(/\n/g, " "), 120);
        console.log(`    ${pc.dim(preview)}`);
      }
      console.log("");
    }
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
