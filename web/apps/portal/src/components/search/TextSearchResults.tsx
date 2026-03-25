import { SearchResultCard } from "./SearchResultCard";
import { highlightMatches } from "./highlight-matches";
import { useDevModeStore } from "@/lib/stores/dev-mode-store";
import { API_URL } from "@/lib/constants";

interface TextResult {
  page_id: string;
  artifact_id: string;
  page_index: number;
  similarity_score: number;
  rerank_score?: number | null;
  original_rank?: number | null;
  text_preview?: string | null;
  artifact_name?: string | null;
  artifact_details?: {
    title?: string | null;
    authors?: string[];
    presentation_date?: string | null;
  } | null;
}

interface RerankInfo {
  reranker_model: string;
  candidates_before: number;
  results_after: number;
  top_promotion?: number | null;
}

interface TextSearchResultsProps {
  data: {
    query: string;
    results: TextResult[];
    total_results: number;
    model_used: string;
    rerank_info?: RerankInfo | null;
  };
  workspace: string;
}

export function TextSearchResults({ data, workspace }: TextSearchResultsProps) {
  const devMode = useDevModeStore((s) => s.enabled);
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {data.total_results} result{data.total_results !== 1 ? "s" : ""} for{" "}
          <span className="font-medium text-text-primary">
            &ldquo;{data.query}&rdquo;
          </span>
        </p>
        <span className="text-xs text-text-muted">
          Model: {data.model_used}
        </span>
      </div>

      {devMode && data.rerank_info && void console.log("[rerank]", data.rerank_info)}

      <div className="space-y-3">
        {data.results.map((r, index) => {
          const displacement =
            r.original_rank != null ? r.original_rank - index : null;
          return (
            <SearchResultCard
              key={`${r.page_id}-${r.similarity_score}`}
              title={`${r.artifact_details?.title ?? r.artifact_name ?? "Untitled"} — Page ${r.page_index + 1}`}
              href={`/${workspace}/documents/${r.artifact_id}/pages/${r.page_id}`}
              score={r.similarity_score}
              preview={r.text_preview ? highlightMatches(r.text_preview, data.query) : undefined}
              thumbnailSrc={`${API_URL}/artifacts/${r.artifact_id}/pages/${r.page_index}/image?size=thumb`}
              secondaryLink={{
                label: "View document",
                href: `/${workspace}/documents/${r.artifact_id}`,
              }}
              rank={index}
              searchType="pages"
              artifactId={r.artifact_id}
            >
              {(r.artifact_details?.authors?.length || r.artifact_details?.presentation_date) && (
                <div className="mt-1 text-xs text-text-muted">
                  {r.artifact_details.authors?.length
                    ? r.artifact_details.authors.join(", ")
                    : null}
                  {r.artifact_details.authors?.length && r.artifact_details.presentation_date
                    ? " · "
                    : null}
                  {r.artifact_details.presentation_date
                    ? new Date(r.artifact_details.presentation_date).getFullYear()
                    : null}
                </div>
              )}
              {devMode && r.rerank_score != null && (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-text-muted">
                  <span>vector: {r.similarity_score.toFixed(3)}</span>
                  <span>→ rerank: {r.rerank_score.toFixed(3)}</span>
                  {displacement != null && (
                    <span className={
                      displacement > 0
                        ? "text-green-600 dark:text-green-400"
                        : displacement < 0
                          ? "text-red-500 dark:text-red-400"
                          : "text-text-muted"
                    }>
                      {displacement > 0
                        ? `↑${displacement}`
                        : displacement < 0
                          ? `↓${Math.abs(displacement)}`
                          : "—"}
                    </span>
                  )}
                </div>
              )}
            </SearchResultCard>
          );
        })}
      </div>
    </div>
  );
}
