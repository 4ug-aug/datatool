import { invoke } from "@tauri-apps/api/core";
import type {
  ConnectionInfo,
  CreateConnectionInput,
  UpdateConnectionInput,
  TableInfo,
  ColumnInfo,
  QueryResult,
  PaginatedResult,
  SavedQueryInfo,
  ExplainResult,
} from "@/types";

// ============ Connection Commands ============

export async function listConnections(): Promise<ConnectionInfo[]> {
  return invoke("list_connections");
}

export async function createConnection(
  input: CreateConnectionInput
): Promise<ConnectionInfo> {
  return invoke("create_connection", { input });
}

export async function updateConnection(
  input: UpdateConnectionInput
): Promise<ConnectionInfo> {
  return invoke("update_connection", { input });
}

export async function deleteConnection(id: string): Promise<void> {
  return invoke("delete_connection", { id });
}

export async function testConnectionById(id: string): Promise<boolean> {
  return invoke("test_connection_by_id", { id });
}

export async function connectToDatabase(id: string): Promise<void> {
  return invoke("connect_to_database", { id });
}

export async function disconnectDatabase(): Promise<void> {
  return invoke("disconnect_database");
}

export async function getActiveConnection(): Promise<string | null> {
  return invoke("get_active_connection");
}

export async function getLastConnectionId(): Promise<string | null> {
  return invoke("get_last_connection_id");
}

// ============ Query Commands ============

export async function executeQuery(sql: string): Promise<QueryResult> {
  return invoke("execute_query", { sql });
}

export async function fetchTables(): Promise<TableInfo[]> {
  return invoke("fetch_tables");
}

export async function fetchColumns(
  schema: string,
  table: string
): Promise<ColumnInfo[]> {
  return invoke("fetch_columns", { schema, table });
}

export async function fetchTableData(
  schema: string,
  table: string,
  page: number,
  pageSize: number
): Promise<PaginatedResult> {
  return invoke("fetch_table_data", {
    schema,
    table,
    page,
    page_size: pageSize,
  });
}

// ============ Saved Queries Commands ============

export async function saveQuery(
  connectionId: string | null,
  name: string,
  sql: string
): Promise<SavedQueryInfo> {
  return invoke("save_query", {
    connection_id: connectionId,
    name,
    sql,
  });
}

export async function listSavedQueries(): Promise<SavedQueryInfo[]> {
  return invoke("list_saved_queries");
}

export async function deleteSavedQuery(id: string): Promise<void> {
  return invoke("delete_saved_query", { id });
}

// ============ Editor State Commands ============

export async function saveEditorContent(content: string): Promise<void> {
  return invoke("save_editor_content", { content });
}

export async function getEditorContent(): Promise<string | null> {
  return invoke("get_editor_content");
}

// ============ Explain Commands ============

export async function explainQuery(sql: string): Promise<ExplainResult> {
  return invoke("explain_query", { sql });
}

export async function explainQueryNoAnalyze(sql: string): Promise<unknown> {
  return invoke("explain_query_no_analyze", { sql });
}

