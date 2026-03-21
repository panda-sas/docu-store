import Link from "next/link";
import { useMemo, useState } from "react";
import { Column, type ColumnFilterElementTemplateOptions } from "primereact/column";
import { DataTable, type DataTableFilterMeta } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { FilterMatchMode } from "primereact/api";

import type { ArtifactResponse } from "@docu-store/types";
import { ARTIFACT_TYPE_LABELS } from "@/lib/constants";
import { TableThumbnail } from "@/components/ui/TableThumbnail";

type ArtifactWithSearch = ArtifactResponse & { _search: string };

const typeOptions = Object.entries(ARTIFACT_TYPE_LABELS).map(([value, label]) => ({
  label,
  value,
}));

const defaultFilters: DataTableFilterMeta = {
  _search: { value: null, matchMode: FilterMatchMode.CONTAINS },
  artifact_type: { value: null, matchMode: FilterMatchMode.EQUALS },
};

interface DocumentsTableViewProps {
  artifacts: ArtifactResponse[];
  workspace: string;
  isLoading: boolean;
}

export function DocumentsTableView({
  artifacts,
  workspace,
  isLoading,
}: DocumentsTableViewProps) {
  const [filters] = useState<DataTableFilterMeta>(defaultFilters);

  const enriched = useMemo<ArtifactWithSearch[]>(
    () =>
      artifacts.map((a) => ({
        ...a,
        _search: [
          a.title_mention?.title,
          a.source_filename,
          ...(a.author_mentions?.map((am: { name: string }) => am.name) ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      })),
    [artifacts],
  );

  /* ── Composite "Document" column: thumbnail + title + authors ─────── */
  const documentTemplate = (row: ArtifactResponse) => {
    const title = row.title_mention?.title ?? row.source_filename ?? "Untitled";
    const href = `/${workspace}/documents/${row.artifact_id}`;
    const authors = row.author_mentions;
    return (
      <div className="flex items-center gap-3">
        <TableThumbnail artifactId={row.artifact_id} href={href} size="md" />
        <div className="min-w-0">
          <Link
            href={href}
            className="text-sm font-medium text-accent-text hover:underline line-clamp-2"
          >
            {title}
          </Link>
          {authors?.length > 0 && (
            <p className="mt-0.5 text-xs text-text-muted line-clamp-1">
              {authors.map((a: { name: string }) => a.name).join(", ")}
            </p>
          )}
        </div>
      </div>
    );
  };

  const typeTemplate = (row: ArtifactResponse) => {
    const label = ARTIFACT_TYPE_LABELS[row.artifact_type] ?? row.artifact_type;
    return <Tag value={label} severity="info" rounded />;
  };

  const dateTemplate = (row: ArtifactResponse) => {
    const pd = row.presentation_date;
    if (!pd) return <span className="text-xs text-text-muted">—</span>;
    return (
      <span className="text-xs tabular-nums text-text-secondary">
        {new Date(pd.date).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
    );
  };

  const pagesTemplate = (row: ArtifactResponse) => (
    <span className="text-xs tabular-nums text-text-secondary">
      {row.pages?.length ?? 0}
    </span>
  );

  const tagsTemplate = (row: ArtifactResponse) => {
    const tms = row.tag_mentions;
    if (!tms?.length) return <span className="text-xs text-text-muted">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {tms.slice(0, 3).map(
          (tm: { tag: string; page_count?: number | null }, i: number) => (
            <span
              key={`${tm.tag}-${i}`}
              className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-[11px] text-text-secondary"
            >
              {tm.tag}
              {tm.page_count ? ` (${tm.page_count})` : ""}
            </span>
          ),
        )}
        {tms.length > 3 && (
          <span className="text-[11px] text-text-muted">+{tms.length - 3}</span>
        )}
      </div>
    );
  };

  /* ── Filter elements ─────────────────────────────────────────────── */
  const typeFilterTemplate = (options: ColumnFilterElementTemplateOptions) => (
    <Dropdown
      value={options.value}
      options={typeOptions}
      onChange={(e) => options.filterApplyCallback(e.value)}
      placeholder="All"
      className="p-column-filter p-inputtext-sm"
      showClear
      style={{ minWidth: "8rem" }}
    />
  );

  const textFilterTemplate = (options: ColumnFilterElementTemplateOptions) => (
    <InputText
      value={options.value ?? ""}
      onChange={(e) => options.filterApplyCallback(e.target.value)}
      placeholder="Search..."
      className="p-column-filter p-inputtext-sm"
    />
  );

  return (
    <DataTable
      value={enriched}
      loading={isLoading}
      paginator
      rows={20}
      rowsPerPageOptions={[10, 20, 50]}
      emptyMessage="No documents found."
      className="overflow-hidden rounded-xl border border-border-default [&_.p-datatable-thead>tr>th]:bg-surface-secondary [&_.p-datatable-thead>tr>th]:text-xs [&_.p-datatable-thead>tr>th]:font-semibold [&_.p-datatable-thead>tr>th]:uppercase [&_.p-datatable-thead>tr>th]:tracking-wider [&_.p-datatable-thead>tr>th]:text-text-muted"
      rowHover
      stripedRows
      size="small"
      sortField="source_filename"
      sortOrder={1}
      filters={filters}
      filterDisplay="row"
    >
      <Column
        header="Document"
        body={documentTemplate}
        sortable
        sortField="source_filename"
        field="_search"
        filter
        filterField="_search"
        showFilterMenu={false}
        filterElement={textFilterTemplate}
      />
      <Column
        header="Type"
        body={typeTemplate}
        sortable
        sortField="artifact_type"
        field="artifact_type"
        filter
        filterField="artifact_type"
        showFilterMenu={false}
        filterElement={typeFilterTemplate}
        style={{ width: "160px" }}
      />
      <Column
        header="Date"
        body={dateTemplate}
        sortable
        sortField="presentation_date.date"
        field="presentation_date"
        style={{ width: "110px" }}
      />
      <Column
        header="Pages"
        body={pagesTemplate}
        sortable
        field="pages"
        sortFunction={(e) => {
          const data = [...(e.data as ArtifactResponse[])];
          return data.sort((a, b) => {
            const aLen = a.pages?.length ?? 0;
            const bLen = b.pages?.length ?? 0;
            return e.order! * (aLen - bLen);
          });
        }}
        style={{ width: "70px" }}
      />
      <Column
        header="Tags"
        body={tagsTemplate}
        style={{ width: "180px" }}
      />
    </DataTable>
  );
}
