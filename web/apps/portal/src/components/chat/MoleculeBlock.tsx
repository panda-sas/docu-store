"use client";

import { MoleculeStructure } from "@docu-store/ui";

interface MoleculeBlockProps {
  smiles: string;
  label?: string;
}

export function MoleculeBlock({ smiles, label }: MoleculeBlockProps) {
  return (
    <div className="my-3 p-3 rounded-lg border border-border-default bg-surface-elevated inline-block">
      <MoleculeStructure smiles={smiles} width={250} height={200} />
      {label && (
        <p className="text-xs text-text-muted mt-1 text-center">
          {label}
        </p>
      )}
      <p className="text-xs font-mono text-text-muted mt-1 text-center break-all">
        {smiles}
      </p>
    </div>
  );
}
