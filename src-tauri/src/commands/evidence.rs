use crate::models::{Evidence, EvidencePayload};
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn get_evidence(app: AppHandle, belief_id: i64) -> Result<Vec<Evidence>, String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query_as::<_, Evidence>(
        "SELECT id, belief_id, type, content, source_url, strength, added_at \
         FROM evidence WHERE belief_id = ?1 ORDER BY added_at DESC",
    )
    .bind(belief_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to get evidence for belief {belief_id}: {e}");
        format!("Failed to get evidence: {e}")
    })
}

#[tauri::command]
pub async fn upsert_evidence(
    app: AppHandle,
    payload: EvidencePayload,
) -> Result<Evidence, String> {
    let pool = app.state::<SqlitePool>();

    if let Some(id) = payload.id {
        // UPDATE path
        sqlx::query(
            "UPDATE evidence SET belief_id = ?1, type = ?2, content = ?3, \
             source_url = ?4, strength = ?5 WHERE id = ?6",
        )
        .bind(payload.belief_id)
        .bind(&payload.evidence_type)
        .bind(&payload.content)
        .bind(&payload.source_url)
        .bind(payload.strength)
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to update evidence {id}: {e}");
            format!("Failed to update evidence: {e}")
        })?;

        sqlx::query_as::<_, Evidence>(
            "SELECT id, belief_id, type, content, source_url, strength, added_at \
             FROM evidence WHERE id = ?1",
        )
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to fetch updated evidence {id}: {e}");
            format!("Failed to fetch updated evidence: {e}")
        })
    } else {
        // INSERT path
        let new_id: i64 = sqlx::query_scalar(
            "INSERT INTO evidence (belief_id, type, content, source_url, strength) \
             VALUES (?1, ?2, ?3, ?4, ?5) RETURNING id",
        )
        .bind(payload.belief_id)
        .bind(&payload.evidence_type)
        .bind(&payload.content)
        .bind(&payload.source_url)
        .bind(payload.strength)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to insert evidence: {e}");
            format!("Failed to insert evidence: {e}")
        })?;

        sqlx::query_as::<_, Evidence>(
            "SELECT id, belief_id, type, content, source_url, strength, added_at \
             FROM evidence WHERE id = ?1",
        )
        .bind(new_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to fetch new evidence {new_id}: {e}");
            format!("Failed to fetch new evidence: {e}")
        })
    }
}

#[tauri::command]
pub async fn delete_evidence(app: AppHandle, id: i64) -> Result<(), String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query("DELETE FROM evidence WHERE id = ?1")
        .bind(id)
        .execute(pool.inner())
        .await
        .map(|_| ())
        .map_err(|e| {
            log::error!("Failed to delete evidence {id}: {e}");
            format!("Failed to delete evidence: {e}")
        })
}
