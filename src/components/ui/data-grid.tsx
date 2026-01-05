"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Filter, Search } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card";
import { Skeleton } from "./skeleton";
import { Checkbox } from "./checkbox";
import { cn } from "@/lib/utils";

type BivariantCallback<Args extends unknown[], Return> = {
  bivarianceHack(...args: Args): Return;
}["bivarianceHack"];

export type GridColumn<T> = {
  id: string;
  header: string;
  accessor: BivariantCallback<[row: T], React.ReactNode>;
  sortValue?: BivariantCallback<[row: T], string | number | null | undefined>;
  exportValue?: BivariantCallback<[row: T], string | number | null | undefined>;
  align?: "left" | "center" | "right";
  minWidth?: string;
};

export type GridFilter<T> = {
  id: string;
  label: string;
  options: { label: string; value: string }[];
  predicate: BivariantCallback<[row: T, value: string], boolean>;
  placeholder?: string;
};

export type BulkAction<T> = {
  label: string;
  onClick: BivariantCallback<[rows: T[]], void | Promise<void>>;
  disabledLabel?: string;
  icon?: React.ReactNode;
};

export type DataGridProps<T extends object = object> = {
  title?: string;
  description?: string;
  data: T[];
  columns: GridColumn<T>[];
  keyField: keyof T;
  searchKeys?: (keyof T | string)[];
  isLoading?: boolean;
  error?: string | null;
  emptyText?: string;
  selectable?: boolean;
  bulkActions?: BulkAction<T>[];
  filters?: GridFilter<T>[];
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  onAdd?: () => void;
  addLabel?: string;
  enableCsvExport?: boolean;
  csvFileName?: string;
  toolbarExtra?: React.ReactNode;
  renderRowActions?: BivariantCallback<[row: T], React.ReactNode>;
  actionsLabel?: string;
};

const DEFAULT_PAGE_SIZES = [10, 25, 50];

export function DataGrid<T extends object = object>({
  title,
  description,
  data,
  columns,
  keyField,
  searchKeys,
  isLoading,
  error,
  emptyText = "No records found.",
  selectable = false,
  bulkActions = [],
  filters = [],
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  defaultPageSize = 10,
  onAdd,
  addLabel = "Add",
  enableCsvExport = true,
  csvFileName = "export.csv",
  toolbarExtra,
  renderRowActions,
  actionsLabel = "Actions",
}: DataGridProps<T>) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<{ columnId: string; direction: "asc" | "desc" } | null>(null);
  const [filterState, setFilterState] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [data]);

  const toggleSort = (column: GridColumn<T>) => {
    if (!column.sortValue) return;
    setSortState((prev) => {
      if (prev?.columnId === column.id) {
        const nextDir = prev.direction === "asc" ? "desc" : "asc";
        return { columnId: column.id, direction: nextDir };
      }
      return { columnId: column.id, direction: "asc" };
    });
  };

  const applySearch = useCallback((rows: T[]) => {
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter((row) => {
      if (searchKeys?.length) {
        return searchKeys.some((key) => {
          const value = getValue(row, key);
          return value && value.toLowerCase().includes(term);
        });
      }
      return Object.values(row).some((value) =>
        typeof value === "string" && value.toLowerCase().includes(term)
      );
    });
  }, [search, searchKeys]);

  const applyFilters = useCallback((rows: T[]) => {
    if (!filters.length) return rows;
    return rows.filter((row) =>
      filters.every((filter) => {
        const value = filterState[filter.id];
        if (!value) return true;
        return filter.predicate(row, value);
      })
    );
  }, [filters, filterState]);

  const sortedData = useMemo(() => {
    let rows = applyFilters(applySearch(data));
    if (sortState) {
      const sortColumn = columns.find((c) => c.id === sortState.columnId);
      if (sortColumn?.sortValue) {
        rows = [...rows].sort((a, b) => {
          const aVal = sortColumn.sortValue?.(a);
          const bVal = sortColumn.sortValue?.(b);
          if (aVal === bVal) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          if (aVal > bVal) return sortState.direction === "asc" ? 1 : -1;
          return sortState.direction === "asc" ? -1 : 1;
        });
      }
    }
    return rows;
  }, [data, columns, sortState, applyFilters, applySearch]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pagedRows = sortedData.slice(start, start + pageSize);

  const allVisibleSelected = selectable && pagedRows.every((row) => selectedIds.has(rowId(row)));
  const anySelected = selectedIds.size > 0;

  const handleSelectAll = (checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      pagedRows.forEach((row) => next.add(rowId(row)));
    } else {
      pagedRows.forEach((row) => next.delete(rowId(row)));
    }
    setSelectedIds(next);
  };

  const handleRowSelect = (row: T, checked: boolean) => {
    const next = new Set(selectedIds);
    const id = rowId(row);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const selectedRows = data.filter((row) => selectedIds.has(rowId(row)));

  const exportCsv = () => {
    const header = columns.map((c) => c.header);
    const lines = sortedData.map((row) =>
      columns
        .map((c) => {
          const value = c.exportValue?.(row) ?? fallbackExport(c.accessor(row));
          const normalized = value == null ? "" : String(value).replace(/"/g, '""');
          return `"${normalized}"`;
        })
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = csvFileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  const showLoadingSkeleton = isLoading && !data.length;
  const hasActions = Boolean(renderRowActions);

  return (
    <Card className="border-border bg-card/95 shadow-sm">
      {(title ||
        description ||
        onAdd ||
        filters.length ||
        searchKeys?.length ||
        toolbarExtra ||
        enableCsvExport ||
        bulkActions.length) && (
        <CardHeader className="gap-3">
          {(title || description) && (
            <div className="space-y-1">
              {title ? <CardTitle className="text-lg font-semibold">{title}</CardTitle> : null}
              {description ? <CardDescription>{description}</CardDescription> : null}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {searchKeys?.length ? (
                <div className="relative w-full min-w-60 sm:w-64">
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search"
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              ) : null}
              {filters.map((filter) => (
                <div key={filter.id} className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={filterState[filter.id] || ""}
                    onChange={(e) => {
                      setFilterState((prev) => ({ ...prev, [filter.id]: e.target.value }));
                      setPage(1);
                    }}
                    className="h-10 rounded-lg border border-border bg-background/60 px-3 text-sm"
                  >
                    <option value="">{filter.placeholder || "All"}</option>
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {toolbarExtra}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {bulkActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  disabled={!anySelected}
                  onClick={() => action.onClick(selectedRows)}
                >
                  {action.icon}
                  <span className="ml-2">
                    {anySelected ? action.label : action.disabledLabel || action.label}
                  </span>
                </Button>
              ))}
              {enableCsvExport ? (
                <Button variant="ghost" size="sm" onClick={exportCsv}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              ) : null}
              {onAdd ? (
                <Button variant="primary" size="sm" onClick={onAdd}>
                  {addLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr className="text-left text-xs uppercase tracking-wide">
                {selectable ? (
                  <th className="px-4 py-3 w-12">
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={!allVisibleSelected && selectedIds.size > 0}
                      onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                      aria-label="Select all visible rows"
                    />
                  </th>
                ) : null}
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className={cn("px-4 py-3", column.align === "right" && "text-right", column.align === "center" && "text-center")}
                    style={{ minWidth: column.minWidth }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className={cn(
                        "group inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                        column.sortValue ? "hover:text-foreground" : "cursor-default"
                      )}
                      disabled={!column.sortValue}
                    >
                      <span>{column.header}</span>
                      {column.sortValue ? (
                        <span className="text-[11px] text-muted-foreground">
                          {sortState?.columnId === column.id ? (sortState.direction === "asc" ? "^" : "v") : ""}
                        </span>
                      ) : null}
                    </button>
                  </th>
                ))}
                {hasActions ? (
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-muted-foreground">
                    {actionsLabel}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {showLoadingSkeleton
                ? Array.from({ length: Math.min(pageSize, 5) }).map((_, idx) => (
                    <tr key={`sk-${idx}`} className="border-t border-border">
                      {selectable ? (
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-4" />
                        </td>
                      ) : null}
                      {columns.map((column) => (
                        <td key={column.id} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                      {hasActions ? (
                        <td className="px-4 py-3 text-right">
                          <Skeleton className="h-4 w-6" />
                        </td>
                      ) : null}
                    </tr>
                  ))
                : null}

              {!showLoadingSkeleton && error ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0)}
                    className="px-4 py-6 text-center text-rose-600"
                  >
                    {error}
                  </td>
                </tr>
              ) : null}

              {!showLoadingSkeleton && !error && !pagedRows.length ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0)}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : null}

              {!showLoadingSkeleton && !error
                ? pagedRows.map((row) => {
                    const selected = selectedIds.has(rowId(row));
                    return (
                      <tr
                        key={rowId(row)}
                        className={cn(
                          "border-t border-border transition-colors",
                          selected ? "bg-muted/60" : "hover:bg-muted/40"
                        )}
                      >
                        {selectable ? (
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={selected}
                              onCheckedChange={(checked) => handleRowSelect(row, Boolean(checked))}
                              aria-label="Select row"
                            />
                          </td>
                        ) : null}
                        {columns.map((column) => (
                          <td
                            key={column.id}
                            className={cn(
                              "px-4 py-3",
                              column.align === "right" && "text-right",
                              column.align === "center" && "text-center"
                            )}
                          >
                            {column.accessor(row)}
                          </td>
                        ))}
                        {hasActions ? (
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {renderRowActions?.(row)}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="h-9 rounded-lg border border-border bg-background/60 px-2 text-sm"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-foreground">
              {(start + 1).toLocaleString()}-{Math.min(start + pageSize, sortedData.length).toLocaleString()} of{" "}
              {sortedData.length.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  function rowId(row: T) {
    return String(row[keyField] ?? "");
  }
}

function getValue<T extends object>(row: T, key: string | keyof T) {
  const path = String(key).split(".");
  let current: unknown = row;
  for (const part of path) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return "";
    }
  }
  return typeof current === "string" ? current : String(current ?? "");
}

function fallbackExport(value: React.ReactNode) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return "";
}
