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

  return useQuery({
    queryKey: tableKeys.all(activeConnectionId),
    queryFn: async () => {
      const tables = await fetchTables();
      setTables(tables);
      return tables;
    },
    enabled: isConnected && !!activeConnectionId,
  });
}

export function useColumns(schema: string, table: string) {
  const isConnected = useConnectionStore((s) => s.isConnected);

  return useQuery({
    queryKey: tableKeys.columns(schema, table),
    queryFn: () => fetchColumns(schema, table),
    enabled: isConnected && !!schema && !!table,
  });
}

export function useTableData(schema: string, table: string) {
  const isConnected = useConnectionStore((s) => s.isConnected);
  const currentPage = useQueryStore((s) => s.currentPage);
  const pageSize = useQueryStore((s) => s.pageSize);
  const setTableResult = useQueryStore((s) => s.setTableResult);

  return useQuery({
    queryKey: tableKeys.data(schema, table, currentPage, pageSize),
    queryFn: async () => {
      const result = await fetchTableData(schema, table, currentPage, pageSize);
      setTableResult(result);
      return result;
    },
    enabled: isConnected && !!schema && !!table,
  });
}

