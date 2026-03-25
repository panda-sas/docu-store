"use client";

import { Tag } from "primereact/tag";

const STATUS_CONFIG: Record<
  string,
  { severity: "info" | "success" | "danger" | "warning" | "secondary"; icon: string }
> = {
  RUNNING: { severity: "info", icon: "pi pi-spin pi-spinner" },
  COMPLETED: { severity: "success", icon: "pi pi-check-circle" },
  FAILED: { severity: "danger", icon: "pi pi-times-circle" },
  TIMED_OUT: { severity: "warning", icon: "pi pi-clock" },
  NOT_FOUND: { severity: "secondary", icon: "pi pi-minus-circle" },
};

export function WorkflowStatusBadge({ status, fromCache }: { status: string; fromCache?: boolean }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.NOT_FOUND;

  return (
    <span className="inline-flex items-center gap-1">
      <Tag
        value={status}
        severity={config.severity}
        icon={config.icon}
      />
      {fromCache && (
        <i
          className="pi pi-history text-xs text-text-muted"
          title="Cached — workflow history expired in Temporal"
        />
      )}
    </span>
  );
}
