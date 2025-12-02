mod commands;
mod crypto;
mod db;

use db::postgres::create_postgres_state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize the metadata database
    if let Err(e) = db::metadata::init_database() {
        eprintln!("Failed to initialize metadata database: {}", e);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(create_postgres_state())
        .invoke_handler(tauri::generate_handler![
            // Connection commands
            commands::connections::list_connections,
            commands::connections::create_connection,
            commands::connections::update_connection,
            commands::connections::delete_connection,
            commands::connections::test_connection_by_id,
            commands::connections::connect_to_database,
            commands::connections::disconnect_database,
            commands::connections::get_active_connection,
            commands::connections::get_last_connection_id,
            // Query commands
            commands::queries::execute_query,
            commands::queries::fetch_tables,
            commands::queries::fetch_columns,
            commands::queries::fetch_table_data,
            commands::queries::save_query,
            commands::queries::list_saved_queries,
            commands::queries::delete_saved_query,
            commands::queries::save_editor_content,
            commands::queries::get_editor_content,
            // Explain commands
            commands::explain::explain_query,
            commands::explain::explain_query_no_analyze,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
