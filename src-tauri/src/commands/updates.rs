use crate::models::{BeliefSnapshot, BeliefUpdate, UpdatePayload};
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

/// Returns the latest confidence for each belief before a given date.
/// Used by the time-travel replay feature.
#[tauri::command]
pub async fn get_beliefs_at_date(
    app: AppHandle,
    before: String,
) -> Result<Vec<BeliefSnapshot>, String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query_as::<_, BeliefSnapshot>(
        "SELECT u.belief_id, u.new_confidence AS confidence \
         FROM updates u \
         INNER JOIN ( \
             SELECT belief_id, MAX(created_at) AS max_date \
             FROM updates WHERE created_at <= ?1 \
             GROUP BY belief_id \
         ) latest ON u.belief_id = latest.belief_id AND u.created_at = latest.max_date",
    )
    .bind(&before)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to get beliefs at date '{before}': {e}");
        format!("Failed to get beliefs at date: {e}")
    })
}
