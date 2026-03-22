import Link from "next/link";
import { useMemo, useState } from "react";
import { Column, type ColumnFilterElementTemplateOptions } from "primereact/column";
import { DataTable, type DataTableFilterMeta } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { FilterMatchMode } from "primereact/api";
import type { ArtifactBrowseItemDTO } from "@docu-store/types";
import { ARTIFACT_TYPE_LABELS } from "@/lib/constants";
import { AuthThumbnail } from "@/components/ui/TableThumbnail";

type BrowseItemWithSearch = ArtifactBrowseItemDTO & { _search: string };

interface FolderArtifactListProps {
  artifacts: ArtifactBrowseItemDTO[] | undefined;
  workspace: string;
  isLoading?: boolean;
}

const typeOptions = Object.entries(ARTIFACT_TYPE_LABELS).map(([value, label]) => ({
  label,
  value,
}));

const defaultFilters: DataTableFilterMeta = {
  _search: { value: null, matchMode: FilterMatchMode.CONTAINS },
  artifact_type: { value: null, matchMode: FilterMatchMode.EQUALS },
};

export function FolderArtifactList({
  artifacts,
  workspace,
  isLoading,
}: FolderArtifactListProps) {
  const [filters] = useState<DataTableFilterMeta>(defaultFilters);

  const enriched = useMemo<BrowseItemWithSearch[]>(
    () =>
      (artifacts ?? []).map((a) => ({
        ...a,
        _search: [a.title, a.source_filename, ...(a.author_names ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      })),
    [artifacts],
  );

  /* ── Composite "Document" column: thumbnail + title + authors ─────── */
  const documentTemplate = (row: ArtifactBrowseItemDTO) => {
    const title = row.title ?? row.source_filename ?? "Untitled";
    const href = `/${workspace}/documents/${row.artifact_id}`;
    return (
      <div className="flex items-center gap-3">
        <AuthThumbnail artifactId={row.artifact_id} href={href} size="md" />
        <div className="min-w-0">
          <Link
            href={href}
            className="text-sm font-medium text-accent-text hover:underline line-clamp-2"
          >
            {title}
          </Link>
          {row.author_names?.length > 0 && (
            <p className="mt-0.5 text-xs text-text-muted line-clamp-1">
              {row.author_names.join(", ")}
            </p>
          )}
        </div>
      </div>
    );
  };

  const typeTemplate = (row: ArtifactBrowseItemDTO) => {
    const label = ARTIFACT_TYPE_LABELS[row.artifact_type] ?? row.artifact_type;
    return <Tag value={label} severity="info" rounded />;
  };

  const dateTemplate = (row: ArtifactBrowseItemDTO) => {
    if (!row.presentation_date)
      return <span className="text-xs text-text-muted">—</span>;
    return (
      <span className="text-xs tabular-nums text-text-secondary">
        {new Date(row.presentation_date).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
    );
  };

  const pagesTemplate = (row: ArtifactBrowseItemDTO) => (
    <span className="text-xs tabular-nums text-text-secondary">{row.page_count}</span>
  );

  const foundOnTemplate = (row: ArtifactBrowseItemDTO) => {
    const sources = row.tag_page_sources;
    if (!sources?.length) return <span className="text-xs text-text-muted">—</span>;

    const sorted = [...sources].sort((a, b) => a.page_index - b.page_index);
    return (
      <div className="flex flex-wrap gap-1">
        {sorted.map((src) => (
          <Link
            key={src.page_id}
            href={`/${workspace}/documents/${row.artifact_id}/pages/${src.page_id}`}
            className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-[11px] tabular-nums text-accent-text hover:bg-accent-text/10"
          >
            p.{src.page_index + 1}
          </Link>
        ))}
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
      emptyMessage="No documents in this folder."
      className="overflow-hidden rounded-xl border border-border-default [&_.p-datatable-thead>tr>th]:bg-surface-secondary [&_.p-datatable-thead>tr>th]:text-xs [&_.p-datatable-thead>tr>th]:font-semibold [&_.p-datatable-thead>tr>th]:uppercase [&_.p-datatable-thead>tr>th]:tracking-wider [&_.p-datatable-thead>tr>th]:text-text-muted"
      rowHover
      stripedRows
      size="small"
      sortField="title"
      sortOrder={1}
      filters={filters}
      filterDisplay="row"
    >
      <Column
        header="Document"
        body={documentTemplate}
        sortable
        sortField="title"
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
        sortField="presentation_date"
        field="presentation_date"
        style={{ width: "110px" }}
      />
      <Column
        header="Pages"
        body={pagesTemplate}
        sortable
        sortField="page_count"
        field="page_count"
        style={{ width: "70px" }}
      />
      <Column
        header="Found on"
        body={foundOnTemplate}
        style={{ width: "130px" }}
      />
    </DataTable>
  );
}
