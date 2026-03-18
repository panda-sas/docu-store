"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Atom,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { useDashboard } from "@/hooks/use-dashboard";

export default function DashboardPage() {
  const { workspace } = useParams<{ workspace: string }>();
  const { stats, recentArtifacts, isLoading } = useDashboard();

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle="Overview of your document intelligence pipeline"
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Documents"
          value={stats.totalArtifacts}
          loading={isLoading}
        />
        <StatCard
          icon={BookOpen}
          label="Pages"
          value={stats.totalPages}
          loading={isLoading}
        />
        <StatCard
          icon={Atom}
          label="Compounds"
          value={stats.totalCompounds}
          loading={isLoading}
        />
        <StatCard
          icon={Activity}
          label="Summarized"
          value={stats.withSummary}
          loading={isLoading}
        />
      </div>

      {/* Two-column layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Documents — 2/3 width */}
        <Card className="lg:col-span-2" padding={false}>
          <div className="p-5">
            <CardHeader
              title="Recent Documents"
              action={
                <Link
                  href={`/${workspace}/documents`}
                  className="flex items-center gap-1 text-xs font-medium text-accent-text hover:underline"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
          </div>
          <div className="border-t border-border-default">
            {isLoading ? (
              <div className="divide-y divide-border-subtle">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <Skeleton width="1rem" height="1rem" />
                    <Skeleton width="100%" height="1rem" />
                    <Skeleton width="3rem" height="1rem" />
                  </div>
                ))}
              </div>
            ) : recentArtifacts.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-text-muted">
                No documents yet. Upload your first document to get started.
              </p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {recentArtifacts.map((artifact) => (
                  <Link
                    key={artifact.artifact_id}
                    href={`/${workspace}/documents/${artifact.artifact_id}`}
                    className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-accent-light"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                    <span className="flex-1 truncate text-text-primary">
                      {artifact.source_filename ||
                        artifact.title_mention?.title ||
                        artifact.artifact_id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-text-muted">
                      {Array.isArray(artifact.pages)
                        ? `${artifact.pages.length} pg`
                        : ""}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions — 1/3 width */}
        <Card>
          <CardHeader title="Quick Actions" />
          <div className="space-y-2">
            <Link href={`/${workspace}/documents/upload`}>
              <Button
                label="Upload Document"
                icon="pi pi-upload"
                outlined
                severity="secondary"
                className="w-full !justify-start"
              />
            </Link>
            <Link href={`/${workspace}/search`}>
              <Button
                label="Search Documents"
                icon="pi pi-search"
                outlined
                severity="secondary"
                className="w-full !justify-start"
              />
            </Link>
            <Link href={`/${workspace}/compounds`}>
              <Button
                label="Browse Compounds"
                icon="pi pi-sitemap"
                outlined
                severity="secondary"
                className="w-full !justify-start"
              />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
