import { create } from "zustand";
import type { QueryResult, PaginatedResult, ExplainResult } from "@/types";

type ResultMode = "table" | "query" | "explain";

interface QueryState {
  // SQL Editor content
  sql: string;
  setSql: (sql: string) => void;

  // Result mode
  resultMode: ResultMode;
  setResultMode: (mode: ResultMode) => void;

  // Query results (from running SQL)
  queryResult: QueryResult | null;
  setQueryResult: (result: QueryResult | null) => void;

  // Table data (from clicking on a table)
  tableResult: PaginatedResult | null;
  setTableResult: (result: PaginatedResult | null) => void;

  // Pagination for table view
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;

  // Explain results
  explainResult: ExplainResult | null;
  setExplainResult: (result: ExplainResult | null) => void;

  // Loading states
  isExecuting: boolean;
  setIsExecuting: (executing: boolean) => void;
  isExplaining: boolean;
  setIsExplaining: (explaining: boolean) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // Right sidebar collapsed state
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: (open: boolean) => void;

  // Left sidebar collapsed state
  isLeftSidebarOpen: boolean;
  setIsLeftSidebarOpen: (open: boolean) => void;
}

export const useQueryStore = create<QueryState>((set) => ({
  // SQL Editor
  sql: "SELECT * FROM ",
  setSql: (sql) => set({ sql }),

  // Result mode
  resultMode: "table",
  setResultMode: (mode) => set({ resultMode: mode }),

  // Query results
  queryResult: null,
  setQueryResult: (result) => set({ queryResult: result, resultMode: "query" }),

  // Table data
  tableResult: null,
  setTableResult: (result) => set({ tableResult: result, resultMode: "table" }),

  // Pagination
  currentPage: 1,
  setCurrentPage: (page) => set({ currentPage: page }),
  pageSize: 50,
  setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),

  // Explain
  explainResult: null,
  setExplainResult: (result) =>
    set({ explainResult: result, resultMode: "explain" }),

  // Loading
  isExecuting: false,
  setIsExecuting: (executing) => set({ isExecuting: executing }),
  isExplaining: false,
  setIsExplaining: (explaining) => set({ isExplaining: explaining }),

  // Error
  error: null,
  setError: (error) => set({ error }),

  // Sidebar states
  isRightSidebarOpen: true,
  setIsRightSidebarOpen: (open) => set({ isRightSidebarOpen: open }),
  isLeftSidebarOpen: true,
  setIsLeftSidebarOpen: (open) => set({ isLeftSidebarOpen: open }),
}));

