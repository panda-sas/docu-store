"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Column, type ColumnFilterElementTemplateOptions } from "primereact/column";
import { DataTable, type DataTableFilterMeta } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import type { components } from "@docu-store/api-client";
import { API_URL } from "@/lib/constants";
import { useAuthBlobUrl } from "@/hooks/use-auth-blob-url";

type PageResponse = components["schemas"]["PageResponse"];

interface PagesTabProps {
  pages: PageResponse[] | string[];
  workspace: string;
  artifactId: string;
}

type PageWithSearch = PageResponse & { _search: string };

const defaultFilters: DataTableFilterMeta = {
  _search: { value: null, matchMode: FilterMatchMode.CONTAINS },
};

/* ── Small inline thumbnail for page rows ─────────────────────────── */
function PageThumbnail({ artifactId, pageIndex, href }: {
  artifactId: string;
  pageIndex: number;
  href: string;
}) {
  const src = `${API_URL}/artifacts/${artifactId}/pages/${pageIndex}/image?size=thumb`;
  const { blobUrl, error } = useAuthBlobUrl(src);

  if (error) return null;

  return (
    <Link href={href} className="block h-20 w-20 shrink-0">
      {blobUrl && (
        <img
          src={blobUrl}
          alt=""
          className="h-20 w-20 rounded-md border border-border-subtle object-cover object-top"
        />
      )}
    </Link>
  );
}

export function PagesTab({ pages, workspace, artifactId }: PagesTabProps) {
  const isPageObjects = pages.length > 0 && typeof pages[0] === "object";
  const [filters] = useState<DataTableFilterMeta>(defaultFilters);

  /* ── Rich page table (full PageResponse objects) ─────────────────── */
  if (isPageObjects) {
    const pageData = pages as PageResponse[];

    const enriched = useMemo<PageWithSearch[]>(
      () =>
        pageData.map((p) => ({
          ...p,
          _search: [
            p.name,
            `page ${p.index}`,
            p.summary_candidate?.summary,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        })),
      [pageData],
    );

    const pageTemplate = (row: PageResponse) => {
      const href = `/${workspace}/documents/${artifactId}/pages/${row.page_id}`;
      return (
        <div className="flex items-center gap-3">
          <PageThumbnail
            artifactId={artifactId}
            pageIndex={row.index}
            href={href}
          />
          <div className="min-w-0">
            <Link
              href={href}
              className="text-sm font-medium text-accent-text hover:underline"
            >
              {row.name ?? `Page ${row.index + 1}`}
            </Link>
            {row.summary_candidate?.summary && (
              <p className="mt-0.5 text-xs leading-relaxed text-text-muted line-clamp-3">
                {row.summary_candidate.summary}
              </p>
            )}
          </div>
        </div>
      );
    };

    const compoundsTemplate = (row: PageResponse) => {
      const count = row.compound_mentions?.length ?? 0;
      if (!count) return <span className="text-xs text-text-muted">—</span>;
      return (
        <span className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-[11px] tabular-nums text-text-secondary">
          {count}
        </span>
      );
    };

    const textFilterTemplate = (options: ColumnFilterElementTemplateOptions) => (
      <InputText
        value={options.value ?? ""}
        onChange={(e) => options.filterApplyCallback(e.target.value)}
        placeholder="Search pages..."
        className="p-column-filter p-inputtext-sm"
      />
    );

    return (
      <DataTable
          value={enriched}
          className="overflow-hidden rounded-xl border border-border-default [&_.p-datatable-thead>tr>th]:bg-surface-secondary [&_.p-datatable-thead>tr>th]:text-xs [&_.p-datatable-thead>tr>th]:font-semibold [&_.p-datatable-thead>tr>th]:uppercase [&_.p-datatable-thead>tr>th]:tracking-wider [&_.p-datatable-thead>tr>th]:text-text-muted"
          emptyMessage="No pages."
          rowHover
          stripedRows
          size="small"
          paginator={pageData.length > 20}
          rows={20}
          sortField="index"
          sortOrder={1}
          filters={filters}
          filterDisplay="row"
        >
          <Column
            header="Page"
            body={pageTemplate}
            sortable
            sortField="index"
            field="_search"
            filter
            filterField="_search"
            showFilterMenu={false}
            filterElement={textFilterTemplate}
          />
          <Column
            header="#"
            field="index"
            sortable
            body={(row: PageResponse) => (
              <span className="text-xs tabular-nums text-text-secondary">{row.index + 1}</span>
            )}
            style={{ width: "60px" }}
          />
          <Column
            header="Compounds"
            body={compoundsTemplate}
            sortable
            sortField="compound_mentions"
            sortFunction={(e) => {
              const data = [...(e.data as PageResponse[])];
              return data.sort((a, b) => {
                const aLen = a.compound_mentions?.length ?? 0;
                const bLen = b.compound_mentions?.length ?? 0;
                return e.order! * (aLen - bLen);
              });
            }}
            style={{ width: "100px" }}
          />
        </DataTable>
    );
  }

  /* ── Fallback: string page IDs only ──────────────────────────────── */
  return (
      <DataTable
        value={(pages as string[]).map((pageId, idx) => ({
          page_id: pageId,
          index: idx,
        }))}
        className="overflow-hidden rounded-xl border border-border-default [&_.p-datatable-thead>tr>th]:bg-surface-secondary [&_.p-datatable-thead>tr>th]:text-xs [&_.p-datatable-thead>tr>th]:font-semibold [&_.p-datatable-thead>tr>th]:uppercase [&_.p-datatable-thead>tr>th]:tracking-wider [&_.p-datatable-thead>tr>th]:text-text-muted"
        emptyMessage="No pages."
        rowHover
        stripedRows
        size="small"
      >
        <Column
          header="Page"
          body={(row: { page_id: string; index: number }) => (
            <Link
              href={`/${workspace}/documents/${artifactId}/pages/${row.page_id}`}
              className="text-sm font-medium text-accent-text hover:underline"
            >
              Page {row.index + 1}
            </Link>
          )}
        />
        <Column
          field="index"
          header="#"
          body={(row: { index: number }) => (
            <span className="text-xs tabular-nums text-text-secondary">{row.index + 1}</span>
          )}
          style={{ width: "60px" }}
        />
      </DataTable>
  );
}
