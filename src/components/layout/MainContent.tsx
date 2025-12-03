import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Rows3,
  AlertCircle,
} from "lucide-react";
import { useQueryStore } from "@/stores/queryStore";
import { useConnectionStore } from "@/stores/connectionStore";
import { useTableData } from "@/hooks/queries/useTables";
import { ExplainVisualizer } from "@/components/editor/ExplainVisualizer";

export function MainContent() {
  const resultMode = useQueryStore((s) => s.resultMode);
  const queryResult = useQueryStore((s) => s.queryResult);
  const tableResult = useQueryStore((s) => s.tableResult);
  const explainResult = useQueryStore((s) => s.explainResult);
  const currentPage = useQueryStore((s) => s.currentPage);
  const setCurrentPage = useQueryStore((s) => s.setCurrentPage);
  const pageSize = useQueryStore((s) => s.pageSize);
  const setPageSize = useQueryStore((s) => s.setPageSize);
  const isExecuting = useQueryStore((s) => s.isExecuting);
  const error = useQueryStore((s) => s.error);

  const selectedTable = useConnectionStore((s) => s.selectedTable);
  const isConnected = useConnectionStore((s) => s.isConnected);
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);

  // Use activeConnectionId as fallback if isConnected is not synced
  const hasConnection = isConnected || !!activeConnectionId;

  // Fetch table data when a table is selected
  const {
    isLoading: isLoadingTable,
    error: tableDataError,
    isError: isTableDataError,
  } = useTableData(selectedTable?.schema || "", selectedTable?.name || "");

  // Determine which data to display
  const displayData = useMemo(() => {
    if (resultMode === "query" && queryResult) {
      return {
        columns: queryResult.columns,
        rows: queryResult.rows,
        rowCount: queryResult.row_count,
        totalCount: queryResult.row_count,
        isPaginated: false,
      };
    }

    if (resultMode === "table" && tableResult) {
      return {
        columns: tableResult.columns,
        rows: tableResult.rows,
        rowCount: tableResult.rows.length,
        totalCount: tableResult.total_count,
        isPaginated: true,
      };
    }

    return null;
  }, [resultMode, queryResult, tableResult]);

  const totalPages = displayData?.isPaginated
    ? Math.ceil(displayData.totalCount / pageSize)
    : 1;

  const formatCellValue = (value: unknown): string => {
    if (value === null) return "NULL";
    if (value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const getCellClassName = (value: unknown): string => {
    if (value === null) return "text-muted-foreground italic";
    if (typeof value === "number") return "text-blue-400 font-mono";
    if (typeof value === "boolean")
      return value ? "text-green-400" : "text-red-400";
    return "";
  };

  // Show explain visualizer
  if (resultMode === "explain" && explainResult) {
    return <ExplainVisualizer result={explainResult} />;
  }

  // Empty state
  if (!hasConnection) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background p-8">
        <Database className="size-16 text-muted-foreground/30" />
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground">
            No Database Connected
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a connection from the sidebar to get started
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isExecuting || isLoadingTable) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="border-b border-border p-3">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state - show errors from both query execution and table data fetching
  const displayError = error || (isTableDataError && tableDataError ? String(tableDataError) : null);
  if (displayError && (resultMode === "query" || resultMode === "table")) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background p-8">
        <AlertCircle className="size-16 text-destructive/50" />
        <div className="max-w-md text-center">
          <h3 className="text-lg font-medium text-foreground">
            {resultMode === "query" ? "Query Error" : "Table Data Error"}
          </h3>
          <p className="mt-2 rounded-md bg-destructive/10 p-4 font-mono text-sm text-destructive">
            {displayError}
          </p>
          {selectedTable && resultMode === "table" && (
            <p className="mt-2 text-sm text-muted-foreground">
              Failed to load data from {selectedTable.schema}.{selectedTable.name}
            </p>
          )}
        </div>
      </div>
    );
  }

  // No data state
  if (!displayData || displayData.rows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background p-8">
        <Rows3 className="size-16 text-muted-foreground/30" />
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground">No Data</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedTable
              ? `The table "${selectedTable.schema}.${selectedTable.name}" is empty`
              : "Run a query or select a table to view data"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header with info */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-4">
          {selectedTable && resultMode === "table" && (
            <span className="text-sm font-medium text-foreground">
              {selectedTable.schema}.{selectedTable.name}
            </span>
          )}
          {resultMode === "query" && (
            <span className="text-sm font-medium text-foreground">
              Query Results
            </span>
          )}
          <Badge variant="secondary" className="font-mono">
            <Rows3 className="mr-1 size-3" />
            {displayData.totalCount.toLocaleString()} rows
          </Badge>
        </div>

        {/* Pagination controls */}
        {displayData.isPaginated && (
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="250">250</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2 text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Data table */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {displayData.columns.map((col, i) => (
                <TableHead
                  key={i}
                  className="sticky top-0 z-10 whitespace-nowrap bg-muted/50 font-mono text-xs backdrop-blur"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">{col.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {col.data_type}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {(row as unknown[]).map((cell, cellIndex) => (
                  <TableCell
                    key={cellIndex}
                    className={`whitespace-nowrap font-mono text-xs ${getCellClassName(cell)}`}
                  >
                    {formatCellValue(cell)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

