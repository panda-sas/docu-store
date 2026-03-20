import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { Skeleton } from "primereact/skeleton";

import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { highlightMatches } from "./highlight-matches";
import { getAuthzClient } from "@/lib/authz-client";
import { API_URL } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SummaryHit {
  entity_type: "page" | "artifact";
  entity_id: string;
  artifact_id: string;
  score: number;
  summary_text?: string | null;
  artifact_title?: string | null;
  page_index?: number | null;
  authors?: string[];
  presentation_date?: string | null;
}

interface ChunkHit {
  page_id: string;
  artifact_id: string;
  page_index: number;
  score: number;
  text_preview?: string | null;
  artifact_name?: string | null;
  page_name?: string | null;
  rerank_score?: number | null;
  original_rank?: number | null;
}

interface RerankInfo {
  reranker_model: string;
  candidates_before: number;
  results_after: number;
  top_promotion?: number | null;
}

interface HierarchicalSearchResultsProps {
  data: {
    query: string;
    summary_hits: SummaryHit[];
    chunk_hits: ChunkHit[];
    total_summary_hits: number;
    total_chunk_hits: number;
    model_used: string;
    chunk_rerank_info?: RerankInfo | null;
  };
  workspace: string;
}

// ---------------------------------------------------------------------------
// Grouped data structures
// ---------------------------------------------------------------------------

interface PageGroup {
  pageId: string | null;
  pageIndex: number;
  pageName: string | null;
  summary: SummaryHit | null;
  chunk: ChunkHit | null;
  bestScore: number;
  /** Position in the reranked chunk list (0-indexed), for computing displacement */
  chunkRerankPosition: number | null;
}

interface DocumentGroup {
  artifactId: string;
  artifactTitle: string;
  artifactSummary: SummaryHit | null;
  pages: PageGroup[];
  bestScore: number;
  /** Lowest (best) position in the reranked chunk_hits array. null = summary-only group. */
  bestChunkPosition: number | null;
  authors: string[];
  presentationDate: string | null;
}

function buildDocumentGroups(
  summaryHits: SummaryHit[],
  chunkHits: ChunkHit[],
): DocumentGroup[] {
  const groups = new Map<string, DocumentGroup>();

  const getOrCreate = (artifactId: string, title: string): DocumentGroup => {
    let g = groups.get(artifactId);
    if (!g) {
      g = {
        artifactId,
        artifactTitle: title,
        artifactSummary: null,
        pages: [],
        bestScore: 0,
        bestChunkPosition: null,
        authors: [],
        presentationDate: null,
      };
      groups.set(artifactId, g);
    }
    if (title && (!g.artifactTitle || g.artifactTitle === artifactId.slice(0, 8))) {
      g.artifactTitle = title;
    }
    return g;
  };

  // Index page-level summaries by entity_id for correlation
  const pageSummaryMap = new Map<string, SummaryHit>();

  for (const sh of summaryHits) {
    const g = getOrCreate(sh.artifact_id, sh.artifact_title ?? "");
    if (sh.entity_type === "artifact") {
      g.artifactSummary = sh;
      g.bestScore = Math.max(g.bestScore, sh.score);
      if (sh.authors?.length) g.authors = sh.authors;
      if (sh.presentation_date) g.presentationDate = sh.presentation_date;
    } else {
      // Fallback: use page-level summary metadata if no artifact-level yet
      if (!g.authors.length && sh.authors?.length) g.authors = sh.authors;
      if (!g.presentationDate && sh.presentation_date) g.presentationDate = sh.presentation_date;
      pageSummaryMap.set(sh.entity_id, sh);
    }
  }

  // Build page groups from chunks, correlating with summaries
  const usedSummaryIds = new Set<string>();

  for (let i = 0; i < chunkHits.length; i++) {
    const ch = chunkHits[i];
    const g = getOrCreate(ch.artifact_id, ch.artifact_name ?? "");
    const matchedSummary = pageSummaryMap.get(ch.page_id) ?? null;
    if (matchedSummary) usedSummaryIds.add(matchedSummary.entity_id);

    const bestScore = Math.max(
      ch.score,
      matchedSummary?.score ?? 0,
    );

    g.pages.push({
      pageId: ch.page_id,
      pageIndex: ch.page_index,
      pageName: ch.page_name ?? null,
      summary: matchedSummary,
      chunk: ch,
      bestScore,
      chunkRerankPosition: ch.original_rank != null ? i : null,
    });
    g.bestScore = Math.max(g.bestScore, bestScore);
    if (g.bestChunkPosition === null || i < g.bestChunkPosition) {
      g.bestChunkPosition = i;
    }
  }

  // Add page-level summaries that had no matching chunk
  for (const sh of summaryHits) {
    if (sh.entity_type === "page" && !usedSummaryIds.has(sh.entity_id)) {
      const g = getOrCreate(sh.artifact_id, sh.artifact_title ?? "");
      g.pages.push({
        pageId: sh.entity_id,
        pageIndex: sh.page_index ?? 0,
        pageName: null,
        summary: sh,
        chunk: null,
        bestScore: sh.score,
        chunkRerankPosition: null,
      });
      g.bestScore = Math.max(g.bestScore, sh.score);
    }
  }

  // Sort pages within each group, then groups by best score
  for (const g of groups.values()) {
    g.pages.sort((a, b) => {
      // Pages with reranked chunks first, ordered by chunk position (lower = better)
      if (a.chunkRerankPosition !== null && b.chunkRerankPosition !== null) {
        return a.chunkRerankPosition - b.chunkRerankPosition;
      }
      if (a.chunkRerankPosition !== null) return -1;
      if (b.chunkRerankPosition !== null) return 1;
      // Summary-only pages: rank by score
      return b.bestScore - a.bestScore;
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    // Documents with reranked chunks first, ordered by best chunk position (lower = better)
    if (a.bestChunkPosition !== null && b.bestChunkPosition !== null) {
      return a.bestChunkPosition - b.bestChunkPosition;
    }
    // Documents with chunks rank above summary-only documents
    if (a.bestChunkPosition !== null) return -1;
    if (b.bestChunkPosition !== null) return 1;
    // Summary-only documents: rank by score
    return b.bestScore - a.bestScore;
  });
}

// ---------------------------------------------------------------------------
// Authenticated thumbnail (reused from SearchResultCard pattern)
// ---------------------------------------------------------------------------

function AuthThumbnail({ src, href }: { src: string; href: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let revoke: string | null = null;
    const headers = getAuthzClient().getHeaders();

    fetch(src, { headers, signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        revoke = URL.createObjectURL(blob);
        setBlobUrl(revoke);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
      });

    return () => {
      controller.abort();
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [src]);

  if (error) return null;

  return (
    <Link href={href} className="relative h-28 w-20 shrink-0 block">
      {!blobUrl && (
        <Skeleton width="5rem" height="7rem" borderRadius="0.375rem" />
      )}
      {blobUrl && (
        <img
          src={blobUrl}
          alt=""
          className="h-28 w-20 rounded-md border border-border-subtle object-cover object-top"
        />
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page row within a document group
// ---------------------------------------------------------------------------

function PageHitRow({
  page,
  artifactId,
  workspace,
  query,
  rank,
}: {
  page: PageGroup;
  artifactId: string;
  query: string;
  workspace: string;
  rank: number;
}) {
  const pageHref = page.pageId
    ? `/${workspace}/documents/${artifactId}/pages/${page.pageId}`
    : `/${workspace}/documents/${artifactId}`;

  const rankClass =
    rank === 0
      ? "border-l-[3px] border-l-accent-text bg-accent-text/[0.04]"
      : "";

  return (
    <div className={`flex items-start gap-3 rounded-lg border border-border-default bg-surface-primary p-3 ${rankClass}`}>
      <div className="relative hidden shrink-0 sm:block">
        <AuthThumbnail
          src={`${API_URL}/artifacts/${artifactId}/pages/${page.pageIndex}/image`}
          href={pageHref}
        />
        <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-text-secondary bg-surface-elevated text-[10px] font-bold text-text-secondary">
          {rank + 1}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={pageHref}
            className="text-sm font-medium text-accent-text hover:underline"
          >
            {page.pageName ?? `Page ${page.pageIndex + 1}`}
          </Link>
          <ScoreBadge score={page.bestScore} />
        </div>

        {/* Overview (summary match) */}
        {page.summary?.summary_text && (
          <p className="mt-1.5 text-sm italic leading-relaxed text-text-secondary line-clamp-2">
            {highlightMatches(page.summary.summary_text, query)}
          </p>
        )}

        {/* Passage (chunk match) */}
        {page.chunk?.text_preview && (
          <p className="mt-1.5 text-sm leading-relaxed text-text-secondary line-clamp-3">
            {highlightMatches(page.chunk.text_preview, query)}
          </p>
        )}

        {/* Rerank scores */}
        {page.chunk?.rerank_score != null && (() => {
          const displacement =
            page.chunk.original_rank != null && page.chunkRerankPosition != null
              ? page.chunk.original_rank - page.chunkRerankPosition
              : null;
          return (
            <div className="mt-1.5 flex items-center gap-2 text-xs text-text-muted">
              <span>vector: {page.chunk.score.toFixed(3)}</span>
              <span>→ rerank: {page.chunk.rerank_score.toFixed(3)}</span>
              {displacement != null && (
                <span
                  className={
                    displacement > 0
                      ? "text-green-600 dark:text-green-400"
                      : displacement < 0
                        ? "text-red-500 dark:text-red-400"
                        : "text-text-muted"
                  }
                >
                  {displacement > 0
                    ? `↑${displacement}`
                    : displacement < 0
                      ? `↓${Math.abs(displacement)}`
                      : "—"}
                </span>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document group card
// ---------------------------------------------------------------------------

function DocumentGroupCard({
  group,
  workspace,
  query,
  rank,
}: {
  group: DocumentGroup;
  workspace: string;
  query: string;
  rank: number;
}) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-elevated p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/${workspace}/documents/${group.artifactId}`}
          className="text-sm font-semibold text-accent-text hover:underline"
        >
          {group.artifactTitle || "Untitled Document"}
        </Link>
        <ScoreBadge score={group.bestScore} />
      </div>

      {/* Authors & date */}
      {(group.authors.length > 0 || group.presentationDate) && (
        <div className="mt-1 text-xs text-text-muted">
          {group.authors.length > 0 ? group.authors.join(", ") : null}
          {group.authors.length > 0 && group.presentationDate ? " · " : null}
          {group.presentationDate
            ? new Date(group.presentationDate).getFullYear()
            : null}
        </div>
      )}

      {/* Artifact-level summary */}
      {group.artifactSummary?.summary_text && (
        <p className="mt-2 text-sm leading-relaxed text-text-secondary line-clamp-3">
          {highlightMatches(group.artifactSummary.summary_text, query)}
        </p>
      )}

      {/* Page rows */}
      {group.pages.length > 0 && (
        <div className="mt-3 space-y-2">
          {group.pages.map((p, i) => (
            <PageHitRow
              key={p.pageId ?? `page-${p.pageIndex}-${i}`}
              page={p}
              artifactId={group.artifactId}
              workspace={workspace}
              query={query}
              rank={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HierarchicalSearchResults({
  data,
  workspace,
}: HierarchicalSearchResultsProps) {
  const groups = useMemo(
    () => buildDocumentGroups(data.summary_hits, data.chunk_hits),
    [data.summary_hits, data.chunk_hits],
  );

  const totalPages = groups.reduce((sum, g) => sum + g.pages.length, 0);

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {groups.length} document{groups.length !== 1 ? "s" : ""},{" "}
          {totalPages} page{totalPages !== 1 ? "s" : ""} for{" "}
          <span className="font-medium text-text-primary">
            &ldquo;{data.query}&rdquo;
          </span>
        </p>
        <span className="text-xs text-text-muted">
          Model: {data.model_used}
        </span>
      </div>

      {data.chunk_rerank_info && console.log("[rerank:hierarchical]", data.chunk_rerank_info)}

      <div className="space-y-4">
        {groups.map((g, i) => (
          <DocumentGroupCard
            key={g.artifactId}
            group={g}
            workspace={workspace}
            query={data.query}
            rank={i}
          />
        ))}
      </div>
    </div>
  );
}
