"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRDKit } from "./useRDKit";

export interface MoleculeStructureProps {
  /** SMILES string to render */
  smiles: string;
  /** Width of the SVG in pixels */
  width?: number;
  /** Height of the SVG in pixels */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Renders a 2D chemical structure from a SMILES string using RDKit.js.
 *
 * Shows a skeleton placeholder while WASM loads, and falls back to raw
 * SMILES text if the string is invalid or RDKit fails to parse it.
 */
export function MoleculeStructure({
  smiles,
  width = 200,
  height = 150,
  className,
}: MoleculeStructureProps) {
  const { rdkit, loading, error: rdkitError } = useRDKit();
  const containerRef = useRef<HTMLDivElement>(null);

  const svgHtml = useMemo(() => {
    if (!rdkit || !smiles) return null;
    try {
      const mol = rdkit.get_mol(smiles);
      if (!mol) return null;
      const svg = mol.get_svg(width, height);
      mol.delete();
      return svg;
    } catch {
      return null;
    }
  }, [rdkit, smiles, width, height]);

  useEffect(() => {
    if (containerRef.current && svgHtml) {
      containerRef.current.innerHTML = svgHtml;
    }
  }, [svgHtml]);

  if (loading) {
    return (
      <div
        className={className}
        style={{ width, height }}
      >
        <div
          className="animate-pulse rounded bg-gray-100"
          style={{ width, height }}
        />
      </div>
    );
  }

  if (rdkitError || !svgHtml) {
    // Fallback: show raw SMILES text
    return (
      <div
        className={`flex items-center ${className ?? ""}`}
        style={{ width, height }}
      >
        <span className="font-mono text-xs text-gray-500 break-all">
          {smiles}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width, height }}
    />
  );
}
