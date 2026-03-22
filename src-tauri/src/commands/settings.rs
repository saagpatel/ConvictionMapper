use sqlx::SqlitePool;
use std::fs;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn get_setting(app: AppHandle, key: String) -> Result<String, String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query_scalar::<_, String>(
        "SELECT value FROM app_settings WHERE key = ?1",
    )
    .bind(&key)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to get setting '{key}': {e}");
        format!("Failed to get setting: {e}")
    })?
    .ok_or_else(|| format!("Setting not found: {key}"))
}

#[tauri::command]
pub async fn set_setting(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(&key)
    .bind(&value)
    .execute(pool.inner())
    .await
    .map(|_| ())
    .map_err(|e| {
        log::error!("Failed to set setting '{key}': {e}");
        format!("Failed to set setting: {e}")
    })
}

/// Stub: copy the database file to `dest_path`.
#[tauri::command]
pub async fn export_database(app: AppHandle, dest_path: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;

    let src = app_data_dir.join("conviction.db");

    fs::copy(&src, &dest_path).map(|_| ()).map_err(|e| {
        log::error!("Failed to export database to '{dest_path}': {e}");
        format!("Failed to export database: {e}")
    })
}
