import { useQuery } from "@tanstack/react-query";
import { fetchTables, fetchColumns, fetchTableData } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";

export const tableKeys = {
  all: (connectionId: string | null) => ["tables", connectionId] as const,
  columns: (schema: string, table: string) =>
    ["columns", schema, table] as const,
  data: (schema: string, table: string, page: number, pageSize: number) =>
    ["tableData", schema, table, page, pageSize] as const,
};

export function useTables() {
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const isConnected = useConnectionStore((s) => s.isConnected);
  const setTables = useConnectionStore((s) => s.setTables);

  // Use activeConnectionId as fallback if isConnected is not synced
  const hasConnection = isConnected || !!activeConnectionId;

  return useQuery({
    queryKey: tableKeys.all(activeConnectionId),
    queryFn: async () => {
      const tables = await fetchTables();
      setTables(tables);
      return tables;
    },
    enabled: hasConnection && !!activeConnectionId,
  });
}

export function useColumns(schema: string, table: string) {
  const isConnected = useConnectionStore((s) => s.isConnected);
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);

  // Use activeConnectionId as fallback if isConnected is not synced
  const hasConnection = isConnected || !!activeConnectionId;

  return useQuery({
    queryKey: tableKeys.columns(schema, table),
    queryFn: () => fetchColumns(schema, table),
    enabled: hasConnection && !!schema && !!table,
  });
}

export function useTableData(schema: string, table: string) {
  const isConnected = useConnectionStore((s) => s.isConnected);
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const currentPage = useQueryStore((s) => s.currentPage);
  const pageSize = useQueryStore((s) => s.pageSize);
  const setTableResult = useQueryStore((s) => s.setTableResult);
  const setError = useQueryStore((s) => s.setError);

  // Use activeConnectionId as fallback if isConnected is not synced
  const hasConnection = isConnected || !!activeConnectionId;

  return useQuery({
    queryKey: tableKeys.data(schema, table, currentPage, pageSize),
    queryFn: async () => {
      try {
        setError(null);
        const result = await fetchTableData(schema, table, currentPage, pageSize);
        setTableResult(result);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError(errorMessage);
        throw error;
      }
    },
    enabled: hasConnection && !!schema && !!table,
    // Always refetch on mount to ensure fresh data
    refetchOnMount: true,
    staleTime: 0,
    retry: false, // Don't retry on error, show error immediately
  });
}

