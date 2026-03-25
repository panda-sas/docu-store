"use client";

import { useState, useCallback, useRef } from "react";
import { AutoComplete, type AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { Chip } from "primereact/chip";
import { SelectButton } from "primereact/selectbutton";
import { Tag, Filter } from "lucide-react";
import { authFetchJson } from "@/lib/auth-fetch";

const MATCH_MODES = [
  { label: "Any", value: "any" as const },
  { label: "All", value: "all" as const },
];

interface TagSuggestion {
  tag: string;
  entity_type: string;
}

interface TagFilterProps {
  tags: string[];
  matchMode: "any" | "all";
  onTagsChange: (tags: string[]) => void;
  onMatchModeChange: (mode: "any" | "all") => void;
}

export function TagFilter({
  tags,
  matchMode,
  onTagsChange,
  onMatchModeChange,
}: TagFilterProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.trim();
      if (!tag || tags.some((t) => t.toLowerCase() === tag.toLowerCase()))
        return;
      onTagsChange([...tags, tag]);
      setInputValue("");
    },
    [tags, onTagsChange],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onTagsChange(tags.filter((t) => t !== tag));
    },
    [tags, onTagsChange],
  );

  const searchTags = useCallback(async (event: AutoCompleteCompleteEvent) => {
    const q = event.query.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }

    // Debounce: cancel previous request
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await authFetchJson<TagSuggestion[]>(
          `/browse/tags/suggest?q=${encodeURIComponent(q)}&limit=10`,
        );
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 200);
  }, []);

  const handleSelect = useCallback(
    (e: { value: TagSuggestion | string }) => {
      const val = typeof e.value === "string" ? e.value : e.value.tag;
      addTag(val);
    },
    [addTag],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  };

  const ENTITY_TYPE_LABELS: Record<string, string> = {
    target: "Target",
    compound_name: "Compound",
    gene_name: "Gene",
    disease: "Disease",
    assay: "Assay",
    author: "Author",
    bioactivity: "Bioactivity",
    mechanism_of_action: "MoA",
    accession_number: "Accession",
    screening_method: "Screen",
    protein_name: "Protein",
  };

  const itemTemplate = (item: TagSuggestion) => (
    <div className="flex items-center justify-between gap-3 px-1 py-0.5">
      <span className="text-sm">{item.tag}</span>
      <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
        {ENTITY_TYPE_LABELS[item.entity_type] ?? item.entity_type}
      </span>
    </div>
  );

  return (
    <div className="rounded-lg border border-border-default bg-surface-raised p-3">
      <div className="mb-2 flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-text-muted" />
        <span className="text-xs font-medium text-text-secondary">
          Tag Filters
        </span>
        {tags.length > 1 && (
          <SelectButton
            value={matchMode}
            options={MATCH_MODES}
            onChange={(e) => {
              if (e.value) onMatchModeChange(e.value);
            }}
            className="ml-auto [&_.p-button]:!px-2 [&_.p-button]:!py-0.5 [&_.p-button]:!text-xs"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            removable
            onRemove={() => {
              removeTag(tag);
              return true;
            }}
            icon={<Tag className="mr-1 h-3 w-3" />}
            className="!bg-accent-subtle !text-xs !text-accent-text"
          />
        ))}
        <AutoComplete
          value={inputValue}
          suggestions={suggestions}
          completeMethod={searchTags}
          onChange={(e) => {
            const v = e.value;
            setInputValue(typeof v === "string" ? v : (v?.tag ?? ""));
          }}
          onSelect={handleSelect}
          onKeyDown={handleKeyDown}
          field="tag"
          itemTemplate={itemTemplate}
          placeholder={tags.length === 0 ? "Type to search tags..." : "Add tag..."}
          className="min-w-[180px] flex-1 [&_.p-autocomplete-input]:!border-0 [&_.p-autocomplete-input]:!bg-transparent [&_.p-autocomplete-input]:!p-1 [&_.p-autocomplete-input]:!text-sm [&_.p-autocomplete-input]:!shadow-none"
          inputClassName="!ring-0"
          delay={0}
          minLength={1}
        />
      </div>

      {tags.length > 0 && (
        <button
          type="button"
          onClick={() => onTagsChange([])}
          className="mt-1.5 text-xs text-text-muted hover:text-text-secondary"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
