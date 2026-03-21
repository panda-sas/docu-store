"use client";

import { FileText, ExternalLink } from "lucide-react";
import type { SourceCitation } from "@docu-store/types";
import { useDevModeStore } from "@/lib/stores/dev-mode-store";

interface CitationListProps {
  sources: SourceCitation[];
  workspace: string;
}

export function CitationList({ sources, workspace }: CitationListProps) {
  const devMode = useDevModeStore((s) => s.enabled);
  if (!sources.length) return null;

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-text-muted mb-2">
        Sources ({sources.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {sources.map((source) => (
          <SourceCard key={source.citation_index} source={source} workspace={workspace} devMode={devMode} />
        ))}
      </div>
    </div>
  );
}

function SourceCard({
  source,
  workspace,
  devMode,
}: {
  source: SourceCitation;
  workspace: string;
  devMode: boolean;
}) {
  const title = source.artifact_title || "Unknown Document";
  const page = source.page_index != null ? `Page ${source.page_index + 1}` : null;
  const href = source.page_id
    ? `/${workspace}/documents/${source.artifact_id}/pages/${source.page_id}`
    : `/${workspace}/documents/${source.artifact_id}`;

  return (
    <div className="inline-flex flex-col">
      <a
        href={href}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-default bg-surface-elevated hover:bg-surface-hover transition-colors text-xs group"
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-accent-light text-accent-text font-semibold text-[10px]">
          {source.citation_index}
        </span>
        <FileText className="w-3 h-3 text-text-muted" />
        <span className="text-text-primary truncate max-w-[140px]">
          {title}
        </span>
        {page && (
          <span className="text-text-muted">{"\u00B7"} {page}</span>
        )}
        <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
      {/* Dev-mode: score + excerpt length */}
      {devMode && (
        <div className="flex gap-2 px-1 mt-0.5 text-[10px] font-mono text-text-muted">
          {source.similarity_score != null && (
            <span>score: <span className="text-blue-500">{source.similarity_score.toFixed(3)}</span></span>
          )}
          {source.text_excerpt && (
            <span>excerpt: <span className="text-purple-500">{source.text_excerpt.length}ch</span></span>
          )}
        </div>
      )}
    </div>
  );
}
