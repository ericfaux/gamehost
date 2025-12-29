"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDensity } from "../AppShell";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
};

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  filters?: React.ReactNode;
}

export function DataTable<T>({ data, columns, pageSize = 6, filters }: DataTableProps<T>) {
  const { density } = useDensity();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const sortedData = [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") return aVal - bVal;
      return String(aVal ?? "").localeCompare(String(bVal ?? ""));
    });
    return sortDir === "asc" ? sortedData : sortedData.reverse();
  }, [data, sortDir, sortKey]);

  const paged = sorted.slice(page * pageSize, page * pageSize + pageSize);
  const totalPages = Math.ceil(data.length / pageSize);

  return (
    <div className="panel-surface">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[color:var(--color-structure)]">
        <div className="text-sm font-semibold text-[color:var(--color-ink-primary)]">{data.length} items</div>
        {filters}
      </div>
      <div className="overflow-x-auto">
        <table className={cn("min-w-full", density === "cozy" ? "density-cozy" : "density-compact")}> 
          <thead className="text-left text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)]">
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} className="px-4 border-b border-[color:var(--color-structure)]">
                  <button
                    type="button"
                    className="flex items-center gap-1 py-1 font-semibold"
                    onClick={() => {
                      if (!col.sortable) return;
                      if (sortKey === col.key) {
                        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
                      } else {
                        setSortKey(String(col.key));
                        setSortDir("asc");
                      }
                    }}
                  >
                    {col.header}
                    {col.sortable && sortKey === col.key && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm text-[color:var(--color-ink-primary)]">
            {paged.map((row, idx) => (
              <tr key={idx} className="border-b border-[color:var(--color-structure)]/80 hover:bg-[color:var(--color-muted)]/60">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 text-[color:var(--color-ink-primary)]">
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key as string] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-sm text-[color:var(--color-ink-secondary)]">
        <span>
          Page {page + 1} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 rounded focus-ring disabled:opacity-40"
            disabled={page === 0}
            onClick={() => setPage(0)}
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded focus-ring disabled:opacity-40"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded focus-ring disabled:opacity-40"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded focus-ring disabled:opacity-40"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(totalPages - 1)}
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
