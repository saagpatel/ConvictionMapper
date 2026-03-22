mod commands;
mod db;
mod models;

use tauri::Manager;

use commands::{
    beliefs::{delete_belief, get_beliefs, upsert_belief},
    connections::{delete_connection, get_connections, upsert_connection},
    evidence::{delete_evidence, get_evidence, get_evidence_counts, upsert_evidence},
    settings::{export_database, get_setting, set_setting},
    updates::{get_updates, log_update},
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;

            let db_path = app_data_dir.join("conviction.db");
            let pool = tauri::async_runtime::block_on(db::init_pool(&db_path))?;

            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // beliefs
            get_beliefs,
            upsert_belief,
            delete_belief,
            // evidence
            get_evidence,
            upsert_evidence,
            delete_evidence,
            get_evidence_counts,
            // connections
            get_connections,
            upsert_connection,
            delete_connection,
            // updates
            log_update,
            get_updates,
            // settings
            get_setting,
            set_setting,
            export_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
