use crate::models::{BeliefUpdate, UpdatePayload};
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn log_update(app: AppHandle, payload: UpdatePayload) -> Result<BeliefUpdate, String> {
    let pool = app.state::<SqlitePool>();

    let new_id: i64 = sqlx::query_scalar(
        "INSERT INTO updates (belief_id, old_confidence, new_confidence, trigger_description) \
         VALUES (?1, ?2, ?3, ?4) RETURNING id",
    )
    .bind(payload.belief_id)
    .bind(payload.old_confidence)
    .bind(payload.new_confidence)
    .bind(&payload.trigger_description)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to log update: {e}");
        format!("Failed to log update: {e}")
    })?;

    sqlx::query_as::<_, BeliefUpdate>(
        "SELECT id, belief_id, old_confidence, new_confidence, trigger_description, created_at \
         FROM updates WHERE id = ?1",
    )
    .bind(new_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to fetch new update {new_id}: {e}");
        format!("Failed to fetch new update: {e}")
    })
}

#[tauri::command]
pub async fn get_updates(app: AppHandle, belief_id: i64) -> Result<Vec<BeliefUpdate>, String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query_as::<_, BeliefUpdate>(
        "SELECT id, belief_id, old_confidence, new_confidence, trigger_description, created_at \
         FROM updates WHERE belief_id = ?1 ORDER BY created_at DESC",
    )
    .bind(belief_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to get updates for belief {belief_id}: {e}");
        format!("Failed to get updates: {e}")
    })
}
