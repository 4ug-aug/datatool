use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::postgres::{PgPool, PgPoolOptions, PgRow};
use sqlx::{Column, Row, TypeInfo};
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;

#[derive(Error, Debug)]
pub enum PostgresError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),
    #[error("Query execution failed: {0}")]
    QueryFailed(String),
    #[error("No active connection")]
    NoActiveConnection,
    #[error("SQLx error: {0}")]
    Sqlx(#[from] sqlx::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub schema: String,
    pub name: String,
    pub table_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub column_default: Option<String>,
    pub is_primary_key: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<ColumnMeta>,
    pub rows: Vec<Vec<JsonValue>>,
    pub row_count: usize,
    pub affected_rows: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnMeta {
    pub name: String,
    pub data_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResult {
    pub columns: Vec<ColumnMeta>,
    pub rows: Vec<Vec<JsonValue>>,
    pub total_count: i64,
    pub page: i32,
    pub page_size: i32,
}

/// Global PostgreSQL connection pool
pub struct PostgresManager {
    pool: RwLock<Option<PgPool>>,
    connection_id: RwLock<Option<String>>,
}

impl PostgresManager {
    pub fn new() -> Self {
        Self {
            pool: RwLock::new(None),
            connection_id: RwLock::new(None),
        }
    }

    /// Connects to a PostgreSQL database
    pub async fn connect(
        &self,
        connection_id: &str,
        host: &str,
        port: u16,
        database: &str,
        user: &str,
        password: &str,
    ) -> Result<(), PostgresError> {
        // Disconnect existing pool if any
        self.disconnect().await;

        let connection_string = format!(
            "postgres://{}:{}@{}:{}/{}",
            user, password, host, port, database
        );

        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(&connection_string)
            .await
            .map_err(|e| PostgresError::ConnectionFailed(e.to_string()))?;

        *self.pool.write().await = Some(pool);
        *self.connection_id.write().await = Some(connection_id.to_string());

        Ok(())
    }

    /// Disconnects from the current database
    pub async fn disconnect(&self) {
        if let Some(pool) = self.pool.write().await.take() {
            pool.close().await;
        }
        *self.connection_id.write().await = None;
    }

    /// Gets the current connection ID
    pub async fn get_connection_id(&self) -> Option<String> {
        self.connection_id.read().await.clone()
    }

    /// Tests if the connection is still valid
    pub async fn test_connection(&self) -> Result<bool, PostgresError> {
        let pool = self.pool.read().await;
        let pool = pool.as_ref().ok_or(PostgresError::NoActiveConnection)?;

        sqlx::query("SELECT 1")
            .fetch_one(pool)
            .await
            .map(|_| true)
            .map_err(|e| PostgresError::QueryFailed(e.to_string()))
    }

    /// Executes a raw SQL query and returns results as JSON
    pub async fn execute_query(&self, sql: &str) -> Result<QueryResult, PostgresError> {
        let pool = self.pool.read().await;
        let pool = pool.as_ref().ok_or(PostgresError::NoActiveConnection)?;

        let rows: Vec<PgRow> = sqlx::query(sql)
            .fetch_all(pool)
            .await
            .map_err(|e| PostgresError::QueryFailed(e.to_string()))?;

        if rows.is_empty() {
            return Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                row_count: 0,
                affected_rows: None,
            });
        }

        // Extract column metadata from the first row
        let columns: Vec<ColumnMeta> = rows[0]
            .columns()
            .iter()
            .map(|col| ColumnMeta {
                name: col.name().to_string(),
                data_type: col.type_info().name().to_string(),
            })
            .collect();

        // Convert rows to JSON values
        let json_rows: Vec<Vec<JsonValue>> = rows
            .iter()
            .map(|row| row_to_json_values(row))
            .collect();

        let row_count = json_rows.len();

        Ok(QueryResult {
            columns,
            rows: json_rows,
            row_count,
            affected_rows: None,
        })
    }

    /// Fetches all tables in the database
    pub async fn fetch_tables(&self) -> Result<Vec<TableInfo>, PostgresError> {
        let pool = self.pool.read().await;
        let pool = pool.as_ref().ok_or(PostgresError::NoActiveConnection)?;

        let tables: Vec<TableInfo> = sqlx::query_as::<_, (String, String, String)>(
            r#"
            SELECT table_schema, table_name, table_type
            FROM information_schema.tables
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY table_schema, table_name
            "#,
        )
        .fetch_all(pool)
        .await
        .map_err(|e| PostgresError::QueryFailed(e.to_string()))?
        .into_iter()
        .map(|(schema, name, table_type)| TableInfo {
            schema,
            name,
            table_type,
        })
        .collect();

        Ok(tables)
    }

    /// Fetches columns for a specific table
    pub async fn fetch_columns(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<Vec<ColumnInfo>, PostgresError> {
        let pool = self.pool.read().await;
        let pool = pool.as_ref().ok_or(PostgresError::NoActiveConnection)?;

        let columns: Vec<ColumnInfo> = sqlx::query_as::<_, (String, String, String, Option<String>)>(
            r#"
            SELECT 
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default
            FROM information_schema.columns c
            WHERE c.table_schema = $1 AND c.table_name = $2
            ORDER BY c.ordinal_position
            "#,
        )
        .bind(schema)
        .bind(table)
        .fetch_all(pool)
        .await
        .map_err(|e| PostgresError::QueryFailed(e.to_string()))?
        .into_iter()
        .map(|(name, data_type, is_nullable, column_default)| ColumnInfo {
            name,
            data_type,
            is_nullable: is_nullable == "YES",
            column_default,
            is_primary_key: false, // Will be updated below
        })
        .collect();

        // Fetch primary key columns
        let pk_columns: Vec<String> = sqlx::query_as::<_, (String,)>(
            r#"
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = $1
                AND tc.table_name = $2
            "#,
        )
        .bind(schema)
        .bind(table)
        .fetch_all(pool)
        .await
        .map_err(|e| PostgresError::QueryFailed(e.to_string()))?
        .into_iter()
        .map(|(name,)| name)
        .collect();

        // Update is_primary_key field
        let columns: Vec<ColumnInfo> = columns
            .into_iter()
            .map(|mut col| {
                col.is_primary_key = pk_columns.contains(&col.name);
                col
            })
            .collect();

        Ok(columns)
    }

    /// Fetches paginated table data
    pub async fn fetch_table_data(
        &self,
        schema: &str,
        table: &str,
        page: i32,
        page_size: i32,
    ) -> Result<PaginatedResult, PostgresError> {
        let pool = self.pool.read().await;
        let pool = pool.as_ref().ok_or(PostgresError::NoActiveConnection)?;

        let offset = (page - 1) * page_size;

        // Get total count
        let count_sql = format!(
            r#"SELECT COUNT(*) FROM "{}"."{}" "#,
            schema, table
        );
        let total_count: (i64,) = sqlx::query_as(&count_sql)
            .fetch_one(pool)
            .await
            .map_err(|e| PostgresError::QueryFailed(e.to_string()))?;

        // Fetch paginated data
        let data_sql = format!(
            r#"SELECT * FROM "{}"."{}" LIMIT {} OFFSET {}"#,
            schema, table, page_size, offset
        );

        let rows: Vec<PgRow> = sqlx::query(&data_sql)
            .fetch_all(pool)
            .await
            .map_err(|e| PostgresError::QueryFailed(e.to_string()))?;

        if rows.is_empty() {
            return Ok(PaginatedResult {
                columns: vec![],
                rows: vec![],
                total_count: total_count.0,
                page,
                page_size,
            });
        }

        let columns: Vec<ColumnMeta> = rows[0]
            .columns()
            .iter()
            .map(|col| ColumnMeta {
                name: col.name().to_string(),
                data_type: col.type_info().name().to_string(),
            })
            .collect();

        let json_rows: Vec<Vec<JsonValue>> = rows
            .iter()
            .map(|row| row_to_json_values(row))
            .collect();

        Ok(PaginatedResult {
            columns,
            rows: json_rows,
            total_count: total_count.0,
            page,
            page_size,
        })
    }

    /// Runs EXPLAIN ANALYZE on a query and returns the JSON plan
    pub async fn explain_query(&self, sql: &str) -> Result<JsonValue, PostgresError> {
        let pool = self.pool.read().await;
        let pool = pool.as_ref().ok_or(PostgresError::NoActiveConnection)?;

        let explain_sql = format!(
            "EXPLAIN (ANALYZE, FORMAT JSON, VERBOSE, BUFFERS) {}",
            sql
        );

        let row: (JsonValue,) = sqlx::query_as(&explain_sql)
            .fetch_one(pool)
            .await
            .map_err(|e| PostgresError::QueryFailed(e.to_string()))?;

        Ok(row.0)
    }
}

impl Default for PostgresManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Converts a PgRow to a vector of JSON values
fn row_to_json_values(row: &PgRow) -> Vec<JsonValue> {
    row.columns()
        .iter()
        .enumerate()
        .map(|(i, col)| {
            let type_name = col.type_info().name();
            
            // Handle different PostgreSQL types
            match type_name {
                "BOOL" => row
                    .try_get::<bool, _>(i)
                    .map(JsonValue::Bool)
                    .unwrap_or(JsonValue::Null),
                "INT2" | "INT4" => row
                    .try_get::<i32, _>(i)
                    .map(|v| JsonValue::Number(v.into()))
                    .unwrap_or(JsonValue::Null),
                "INT8" => row
                    .try_get::<i64, _>(i)
                    .map(|v| JsonValue::Number(v.into()))
                    .unwrap_or(JsonValue::Null),
                "FLOAT4" | "FLOAT8" => row
                    .try_get::<f64, _>(i)
                    .map(|v| {
                        serde_json::Number::from_f64(v)
                            .map(JsonValue::Number)
                            .unwrap_or(JsonValue::Null)
                    })
                    .unwrap_or(JsonValue::Null),
                "JSON" | "JSONB" => row
                    .try_get::<JsonValue, _>(i)
                    .unwrap_or(JsonValue::Null),
                "UUID" => row
                    .try_get::<uuid::Uuid, _>(i)
                    .map(|v| JsonValue::String(v.to_string()))
                    .unwrap_or(JsonValue::Null),
                _ => {
                    // Default to string representation
                    row.try_get::<String, _>(i)
                        .map(JsonValue::String)
                        .unwrap_or(JsonValue::Null)
                }
            }
        })
        .collect()
}

/// Thread-safe wrapper for use with Tauri state
pub type PostgresState = Arc<PostgresManager>;

pub fn create_postgres_state() -> PostgresState {
    Arc::new(PostgresManager::new())
}

