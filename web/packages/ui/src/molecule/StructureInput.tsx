"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MoleculeStructure } from "./MoleculeStructure";

const LazyStructureEditor = dynamic(
  () =>
    import("./StructureEditor").then((m) => ({
      default: m.StructureEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <span className="text-sm text-gray-400">Loading editor...</span>
      </div>
    ),
  },
);

export interface StructureInputProps {
  /** Current SMILES value */
  value: string;
  /** Called when the SMILES value changes (from text input or editor) */
  onChange: (smiles: string) => void;
  /** Placeholder for text input */
  placeholder?: string;
}

type InputMode = "text" | "draw";

/**
 * Compound search input that toggles between:
 * - **Text mode**: SMILES text input with live structure preview
 * - **Draw mode**: Ketcher structure editor
 *
 * Both modes output a SMILES string via `onChange`.
 */
export function StructureInput({
  value,
  onChange,
  placeholder = "Enter SMILES string, e.g. CC(=O)Oc1ccccc1C(=O)O",
}: StructureInputProps) {
  const [mode, setMode] = useState<InputMode>("text");

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "text"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-500 hover:bg-gray-100"
          }`}
          onClick={() => setMode("text")}
        >
          <i className="pi pi-pencil mr-1.5" />
          SMILES Text
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "draw"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-500 hover:bg-gray-100"
          }`}
          onClick={() => setMode("draw")}
        >
          <i className="pi pi-image mr-1.5" />
          Draw Structure
        </button>
      </div>

      {/* Text mode */}
      {mode === "text" && (
        <div className="space-y-3">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          {/* Live structure preview */}
          {value.trim() && (
            <div className="flex justify-center rounded-lg border border-gray-100 bg-gray-50 p-3">
              <MoleculeStructure
                smiles={value.trim()}
                width={250}
                height={180}
              />
            </div>
          )}
        </div>
      )}

      {/* Draw mode */}
      {mode === "draw" && (
        <LazyStructureEditor
          value={value || undefined}
          onChange={(smiles) => {
            onChange(smiles);
            setMode("text"); // Switch back to text to show the result
          }}
          height={450}
        />
      )}
    </div>
  );
}
