use crate::db::metadata;
use crate::db::postgres::{ColumnInfo, PaginatedResult, PostgresState, QueryResult, TableInfo};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct SavedQueryInfo {
    pub id: String,
    pub connection_id: Option<String>,
    pub name: String,
    pub sql: String,
    pub created_at: String,
}

impl From<metadata::SavedQuery> for SavedQueryInfo {
    fn from(q: metadata::SavedQuery) -> Self {
        Self {
            id: q.id,
            connection_id: q.connection_id,
            name: q.name,
            sql: q.sql,
            created_at: q.created_at,
        }
    }
}

/// Executes a SQL query against the active connection
#[tauri::command]
pub async fn execute_query(
    sql: String,
    postgres: State<'_, PostgresState>,
) -> Result<QueryResult, String> {
    postgres
        .execute_query(&sql)
        .await
        .map_err(|e| e.to_string())
}

/// Fetches all tables from the active connection
#[tauri::command]
pub async fn fetch_tables(postgres: State<'_, PostgresState>) -> Result<Vec<TableInfo>, String> {
    postgres.fetch_tables().await.map_err(|e| e.to_string())
}

/// Fetches columns for a specific table
#[tauri::command]
pub async fn fetch_columns(
    schema: String,
    table: String,
    postgres: State<'_, PostgresState>,
) -> Result<Vec<ColumnInfo>, String> {
    postgres
        .fetch_columns(&schema, &table)
        .await
        .map_err(|e| e.to_string())
}

/// Fetches paginated data from a table
#[tauri::command]
pub async fn fetch_table_data(
    schema: String,
    table: String,
    page: i32,
    page_size: i32,
    postgres: State<'_, PostgresState>,
) -> Result<PaginatedResult, String> {
    postgres
        .fetch_table_data(&schema, &table, page, page_size)
        .await
        .map_err(|e| e.to_string())
}

// ============ Saved Queries ============

/// Saves a query for later use
#[tauri::command]
pub fn save_query(
    connection_id: Option<String>,
    name: String,
    sql: String,
) -> Result<SavedQueryInfo, String> {
    metadata::create_saved_query(connection_id.as_deref(), &name, &sql)
        .map(SavedQueryInfo::from)
        .map_err(|e| e.to_string())
}

/// Lists all saved queries
#[tauri::command]
pub fn list_saved_queries() -> Result<Vec<SavedQueryInfo>, String> {
    metadata::list_saved_queries()
        .map(|queries| queries.into_iter().map(SavedQueryInfo::from).collect())
        .map_err(|e| e.to_string())
}

/// Deletes a saved query
#[tauri::command]
pub fn delete_saved_query(id: String) -> Result<(), String> {
    metadata::delete_saved_query(&id).map_err(|e| e.to_string())
}

// ============ App State for Editor ============

/// Saves the current editor content to persist across sessions
#[tauri::command]
pub fn save_editor_content(content: String) -> Result<(), String> {
    metadata::set_app_state("editor_content", &content).map_err(|e| e.to_string())
}

/// Gets the last saved editor content
#[tauri::command]
pub fn get_editor_content() -> Result<Option<String>, String> {
    metadata::get_app_state("editor_content").map_err(|e| e.to_string())
}

