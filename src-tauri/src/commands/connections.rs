use crate::models::{Connection, ConnectionPayload};
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn get_connections(app: AppHandle) -> Result<Vec<Connection>, String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query_as::<_, Connection>(
        "SELECT id, from_belief_id, to_belief_id, relationship, strength, created_at \
         FROM connections ORDER BY created_at DESC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to get connections: {e}");
        format!("Failed to get connections: {e}")
    })
}

#[tauri::command]
pub async fn upsert_connection(
    app: AppHandle,
    payload: ConnectionPayload,
) -> Result<Connection, String> {
    let pool = app.state::<SqlitePool>();

    if let Some(id) = payload.id {
        // UPDATE path
        sqlx::query(
            "UPDATE connections SET from_belief_id = ?1, to_belief_id = ?2, \
             relationship = ?3, strength = ?4 WHERE id = ?5",
        )
        .bind(payload.from_belief_id)
        .bind(payload.to_belief_id)
        .bind(&payload.relationship)
        .bind(payload.strength)
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to update connection {id}: {e}");
            format!("Failed to update connection: {e}")
        })?;

        sqlx::query_as::<_, Connection>(
            "SELECT id, from_belief_id, to_belief_id, relationship, strength, created_at \
             FROM connections WHERE id = ?1",
        )
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to fetch updated connection {id}: {e}");
            format!("Failed to fetch updated connection: {e}")
        })
    } else {
        // INSERT path — use INSERT OR IGNORE to respect the UNIQUE constraint,
        // then fetch the row (existing or new).
        let new_id: i64 = sqlx::query_scalar(
            "INSERT INTO connections (from_belief_id, to_belief_id, relationship, strength) \
             VALUES (?1, ?2, ?3, ?4) RETURNING id",
        )
        .bind(payload.from_belief_id)
        .bind(payload.to_belief_id)
        .bind(&payload.relationship)
        .bind(payload.strength)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to insert connection: {e}");
            format!("Failed to insert connection: {e}")
        })?;

        sqlx::query_as::<_, Connection>(
            "SELECT id, from_belief_id, to_belief_id, relationship, strength, created_at \
             FROM connections WHERE id = ?1",
        )
        .bind(new_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to fetch new connection {new_id}: {e}");
            format!("Failed to fetch new connection: {e}")
        })
    }
}

#[tauri::command]
pub async fn delete_connection(app: AppHandle, id: i64) -> Result<(), String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query("DELETE FROM connections WHERE id = ?1")
        .bind(id)
        .execute(pool.inner())
        .await
        .map(|_| ())
        .map_err(|e| {
            log::error!("Failed to delete connection {id}: {e}");
            format!("Failed to delete connection: {e}")
        })
}
