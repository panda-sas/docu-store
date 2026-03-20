"use client";

import { Chip } from "primereact/chip";
import { Skeleton } from "primereact/skeleton";
import { TrendingUp } from "lucide-react";

import { usePopularTags } from "@/hooks/use-browse";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  target: "Target",
  compound_name: "Compound",
  gene_name: "Gene",
  disease: "Disease",
  author: "Author",
  screening_method: "Screen",
  accession_number: "Accession",
  date: "Date",
};

interface PopularTagsProps {
  onTagClick: (tag: string) => void;
}

export function PopularTags({ onTagClick }: PopularTagsProps) {
  const { data: tags, isLoading } = usePopularTags(undefined, 15);

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width="5rem" height="1.75rem" borderRadius="9999px" />
        ))}
      </div>
    );
  }

  if (!tags?.length) return null;

  return (
    <div className="rounded-lg border border-border-default bg-surface-raised p-3">
      <div className="mb-2 flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5 text-text-muted" />
        <span className="text-xs font-medium text-text-secondary">
          Popular Tags
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Chip
            key={`${t.entity_type}-${t.tag}`}
            label={`${t.tag} (${t.artifact_count})`}
            className="cursor-pointer !bg-surface-sunken !text-xs hover:!bg-accent-subtle hover:!text-accent-text"
            onClick={() => onTagClick(t.tag)}
            pt={{
              label: {
                title: ENTITY_TYPE_LABELS[t.entity_type] ?? t.entity_type,
              },
            }}
          />
        ))}
      </div>
    </div>
  );
}
