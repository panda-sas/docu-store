"use client";

import { useState, useCallback } from "react";
import { InputText } from "primereact/inputtext";
import { Chip } from "primereact/chip";
import { SelectButton } from "primereact/selectbutton";
import { Tag, Filter } from "lucide-react";

const MATCH_MODES = [
  { label: "Any", value: "any" as const },
  { label: "All", value: "all" as const },
];

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  };

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
        <InputText
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(inputValue)}
          placeholder={tags.length === 0 ? "Type a tag and press Enter..." : "Add tag..."}
          className="min-w-[120px] flex-1 !border-0 !bg-transparent !p-1 !text-sm !shadow-none focus:!ring-0"
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
