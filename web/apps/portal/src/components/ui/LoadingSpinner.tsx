"use client";

import { ProgressSpinner } from "primereact/progressspinner";

const SIZES = {
  sm: { width: "1.5rem", height: "1.5rem" },
  md: { width: "2rem", height: "2rem" },
  lg: { width: "3rem", height: "3rem" },
} as const;

interface LoadingSpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <div className={className ?? "flex items-center justify-center py-20"}>
      <ProgressSpinner style={SIZES[size]} strokeWidth="3" />
    </div>
  );
}
