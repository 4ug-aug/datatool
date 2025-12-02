// Connection types
export interface ConnectionInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  user: string;
  created_at: string;
}

export interface CreateConnectionInput {
  name: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface UpdateConnectionInput {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
}

// Table types
export interface TableInfo {
  schema: string;
  name: string;
  table_type: string;
}

export interface ColumnInfo {
  name: string;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
  is_primary_key: boolean;
}

export interface ColumnMeta {
  name: string;
  data_type: string;
}

// Query result types
export interface QueryResult {
  columns: ColumnMeta[];
  rows: unknown[][];
  row_count: number;
  affected_rows: number | null;
}

export interface PaginatedResult {
  columns: ColumnMeta[];
  rows: unknown[][];
  total_count: number;
  page: number;
  page_size: number;
}

// Saved query types
export interface SavedQueryInfo {
  id: string;
  connection_id: string | null;
  name: string;
  sql: string;
  created_at: string;
}

// Explain types
export interface ExplainResult {
  plan: unknown;
  planning_time: number | null;
  execution_time: number | null;
  total_cost: number | null;
}

// UI State types
export interface SelectedTable {
  schema: string;
  name: string;
}

