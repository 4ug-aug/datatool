use crate::crypto;
use crate::db::metadata;
use crate::db::postgres::PostgresState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub user: String,
    pub created_at: String,
}

impl From<metadata::SavedConnection> for ConnectionInfo {
    fn from(conn: metadata::SavedConnection) -> Self {
        Self {
            id: conn.id,
            name: conn.name,
            host: conn.host,
            port: conn.port,
            database: conn.database,
            user: conn.user,
            created_at: conn.created_at,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateConnectionInput {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub user: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateConnectionInput {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub user: String,
    pub password: Option<String>,
}

/// Lists all saved connections (without passwords)
#[tauri::command]
pub fn list_connections() -> Result<Vec<ConnectionInfo>, String> {
    metadata::list_connections()
        .map(|connections| connections.into_iter().map(ConnectionInfo::from).collect())
        .map_err(|e| e.to_string())
}

/// Creates a new database connection
#[tauri::command]
pub fn create_connection(input: CreateConnectionInput) -> Result<ConnectionInfo, String> {
    let encrypted_password =
        crypto::encrypt_password(&input.password).map_err(|e| e.to_string())?;

    metadata::create_connection(
        &input.name,
        &input.host,
        input.port,
        &input.database,
        &input.user,
        &encrypted_password,
    )
    .map(ConnectionInfo::from)
    .map_err(|e| e.to_string())
}

/// Updates an existing connection
#[tauri::command]
pub fn update_connection(input: UpdateConnectionInput) -> Result<ConnectionInfo, String> {
    let encrypted_password = if let Some(password) = &input.password {
        Some(crypto::encrypt_password(password).map_err(|e| e.to_string())?)
    } else {
        None
    };

    metadata::update_connection(
        &input.id,
        &input.name,
        &input.host,
        input.port,
        &input.database,
        &input.user,
        encrypted_password.as_deref(),
    )
    .map(ConnectionInfo::from)
    .map_err(|e| e.to_string())
}

/// Deletes a connection
#[tauri::command]
pub fn delete_connection(id: String) -> Result<(), String> {
    metadata::delete_connection(&id).map_err(|e| e.to_string())
}

/// Tests a connection by attempting to connect to the database
#[tauri::command]
pub async fn test_connection_by_id(
    id: String,
    postgres: State<'_, PostgresState>,
) -> Result<bool, String> {
    let saved_conn = metadata::get_connection_by_id(&id).map_err(|e| e.to_string())?;

    let password =
        crypto::decrypt_password(&saved_conn.encrypted_password).map_err(|e| e.to_string())?;

    // Try to connect
    postgres
        .connect(
            &saved_conn.id,
            &saved_conn.host,
            saved_conn.port,
            &saved_conn.database,
            &saved_conn.user,
            &password,
        )
        .await
        .map_err(|e| e.to_string())?;

    // Test the connection
    let result = postgres.test_connection().await.map_err(|e| e.to_string());

    // Disconnect after testing
    postgres.disconnect().await;

    result
}

/// Connects to a saved database connection
#[tauri::command]
pub async fn connect_to_database(
    id: String,
    postgres: State<'_, PostgresState>,
) -> Result<(), String> {
    let saved_conn = metadata::get_connection_by_id(&id).map_err(|e| e.to_string())?;

    let password =
        crypto::decrypt_password(&saved_conn.encrypted_password).map_err(|e| e.to_string())?;

    postgres
        .connect(
            &saved_conn.id,
            &saved_conn.host,
            saved_conn.port,
            &saved_conn.database,
            &saved_conn.user,
            &password,
        )
        .await
        .map_err(|e| e.to_string())?;

    // Store last active connection
    metadata::set_app_state("last_connection_id", &id).ok();

    Ok(())
}

/// Disconnects from the current database
#[tauri::command]
pub async fn disconnect_database(postgres: State<'_, PostgresState>) -> Result<(), String> {
    postgres.disconnect().await;
    Ok(())
}

/// Gets the currently connected database ID
#[tauri::command]
pub async fn get_active_connection(postgres: State<'_, PostgresState>) -> Result<Option<String>, String> {
    Ok(postgres.get_connection_id().await)
}

/// Gets the last used connection ID from app state
#[tauri::command]
pub fn get_last_connection_id() -> Result<Option<String>, String> {
    metadata::get_app_state("last_connection_id").map_err(|e| e.to_string())
}

