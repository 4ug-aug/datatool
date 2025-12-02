use directories::ProjectDirs;
use once_cell::sync::OnceCell;
use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use thiserror::Error;
use uuid::Uuid;

static DB_CONNECTION: OnceCell<Mutex<Connection>> = OnceCell::new();

#[derive(Error, Debug)]
pub enum MetadataError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Failed to get app data directory")]
    NoAppDataDir,
    #[error("Database not initialized")]
    NotInitialized,
    #[error("Connection not found")]
    ConnectionNotFound,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub user: String,
    pub encrypted_password: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedQuery {
    pub id: String,
    pub connection_id: Option<String>,
    pub name: String,
    pub sql: String,
    pub created_at: String,
}

/// Gets the path to the SQLite database file
fn get_db_path() -> Result<PathBuf, MetadataError> {
    let proj_dirs = ProjectDirs::from("com", "datatool", "DataTool")
        .ok_or(MetadataError::NoAppDataDir)?;
    
    let data_dir = proj_dirs.data_dir();
    std::fs::create_dir_all(data_dir).map_err(|_| MetadataError::NoAppDataDir)?;
    
    Ok(data_dir.join("metadata.db"))
}

/// Initializes the SQLite database and creates tables if they don't exist
pub fn init_database() -> Result<(), MetadataError> {
    let db_path = get_db_path()?;
    let conn = Connection::open(&db_path)?;
    
    // Create connections table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS connections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            host TEXT NOT NULL,
            port INTEGER NOT NULL,
            database TEXT NOT NULL,
            user TEXT NOT NULL,
            encrypted_password TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )?;
    
    // Create saved_queries table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS saved_queries (
            id TEXT PRIMARY KEY,
            connection_id TEXT,
            name TEXT NOT NULL,
            sql TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE SET NULL
        )",
        [],
    )?;
    
    // Create app_state table for storing last active connection, etc.
    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;
    
    DB_CONNECTION
        .set(Mutex::new(conn))
        .map_err(|_| MetadataError::NotInitialized)?;
    
    Ok(())
}

fn get_connection() -> Result<std::sync::MutexGuard<'static, Connection>, MetadataError> {
    DB_CONNECTION
        .get()
        .ok_or(MetadataError::NotInitialized)?
        .lock()
        .map_err(|_| MetadataError::NotInitialized)
}

// ============ Connection CRUD ============

pub fn create_connection(
    name: &str,
    host: &str,
    port: u16,
    database: &str,
    user: &str,
    encrypted_password: &str,
) -> Result<SavedConnection, MetadataError> {
    let conn = get_connection()?;
    let id = Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO connections (id, name, host, port, database, user, encrypted_password, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, name, host, port, database, user, encrypted_password, created_at],
    )?;
    
    Ok(SavedConnection {
        id,
        name: name.to_string(),
        host: host.to_string(),
        port,
        database: database.to_string(),
        user: user.to_string(),
        encrypted_password: encrypted_password.to_string(),
        created_at,
    })
}

pub fn list_connections() -> Result<Vec<SavedConnection>, MetadataError> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare(
        "SELECT id, name, host, port, database, user, encrypted_password, created_at 
         FROM connections ORDER BY created_at DESC"
    )?;
    
    let connections = stmt
        .query_map([], |row| {
            Ok(SavedConnection {
                id: row.get(0)?,
                name: row.get(1)?,
                host: row.get(2)?,
                port: row.get(3)?,
                database: row.get(4)?,
                user: row.get(5)?,
                encrypted_password: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?
        .collect::<SqliteResult<Vec<_>>>()?;
    
    Ok(connections)
}

pub fn get_connection_by_id(id: &str) -> Result<SavedConnection, MetadataError> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare(
        "SELECT id, name, host, port, database, user, encrypted_password, created_at 
         FROM connections WHERE id = ?1"
    )?;
    
    stmt.query_row(params![id], |row| {
        Ok(SavedConnection {
            id: row.get(0)?,
            name: row.get(1)?,
            host: row.get(2)?,
            port: row.get(3)?,
            database: row.get(4)?,
            user: row.get(5)?,
            encrypted_password: row.get(6)?,
            created_at: row.get(7)?,
        })
    })
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => MetadataError::ConnectionNotFound,
        _ => MetadataError::Database(e),
    })
}

pub fn update_connection(
    id: &str,
    name: &str,
    host: &str,
    port: u16,
    database: &str,
    user: &str,
    encrypted_password: Option<&str>,
) -> Result<SavedConnection, MetadataError> {
    let conn = get_connection()?;
    
    if let Some(password) = encrypted_password {
        conn.execute(
            "UPDATE connections 
             SET name = ?2, host = ?3, port = ?4, database = ?5, user = ?6, encrypted_password = ?7
             WHERE id = ?1",
            params![id, name, host, port, database, user, password],
        )?;
    } else {
        conn.execute(
            "UPDATE connections 
             SET name = ?2, host = ?3, port = ?4, database = ?5, user = ?6
             WHERE id = ?1",
            params![id, name, host, port, database, user],
        )?;
    }
    
    get_connection_by_id(id)
}

pub fn delete_connection(id: &str) -> Result<(), MetadataError> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM connections WHERE id = ?1", params![id])?;
    Ok(())
}

// ============ Saved Queries CRUD ============

pub fn create_saved_query(
    connection_id: Option<&str>,
    name: &str,
    sql: &str,
) -> Result<SavedQuery, MetadataError> {
    let conn = get_connection()?;
    let id = Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO saved_queries (id, connection_id, name, sql, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, connection_id, name, sql, created_at],
    )?;
    
    Ok(SavedQuery {
        id,
        connection_id: connection_id.map(|s| s.to_string()),
        name: name.to_string(),
        sql: sql.to_string(),
        created_at,
    })
}

pub fn list_saved_queries() -> Result<Vec<SavedQuery>, MetadataError> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare(
        "SELECT id, connection_id, name, sql, created_at 
         FROM saved_queries ORDER BY created_at DESC"
    )?;
    
    let queries = stmt
        .query_map([], |row| {
            Ok(SavedQuery {
                id: row.get(0)?,
                connection_id: row.get(1)?,
                name: row.get(2)?,
                sql: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?
        .collect::<SqliteResult<Vec<_>>>()?;
    
    Ok(queries)
}

pub fn delete_saved_query(id: &str) -> Result<(), MetadataError> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM saved_queries WHERE id = ?1", params![id])?;
    Ok(())
}

// ============ App State ============

pub fn get_app_state(key: &str) -> Result<Option<String>, MetadataError> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT value FROM app_state WHERE key = ?1")?;
    
    match stmt.query_row(params![key], |row| row.get(0)) {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(MetadataError::Database(e)),
    }
}

pub fn set_app_state(key: &str, value: &str) -> Result<(), MetadataError> {
    let conn = get_connection()?;
    conn.execute(
        "INSERT OR REPLACE INTO app_state (key, value) VALUES (?1, ?2)",
        params![key, value],
    )?;
    Ok(())
}

