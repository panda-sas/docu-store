import { Skeleton } from "primereact/skeleton";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  loading?: boolean;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  loading,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-elevated p-5">
        <div className="flex items-center gap-3">
          <Skeleton width="2.25rem" height="2.25rem" borderRadius="0.5rem" />
          <Skeleton width="5rem" height="1rem" />
        </div>
        <div className="mt-3">
          <Skeleton width="4rem" height="2rem" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-default bg-surface-elevated p-5 shadow-ds-sm transition-shadow hover:shadow-ds">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light">
          <Icon className="h-[18px] w-[18px] text-accent-text" />
        </div>
        <span className="text-sm font-medium text-text-secondary">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-text-primary">
          {value}
        </span>
        {trend && (
          <span className="text-xs font-medium text-ds-success">{trend}</span>
        )}
      </div>
    </div>
  );
}
