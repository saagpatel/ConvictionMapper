use crate::models::{Belief, BeliefPayload};
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn get_beliefs(app: AppHandle) -> Result<Vec<Belief>, String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query_as::<_, Belief>(
        "SELECT id, title, description, confidence, domain, half_life, \
         created_at, last_touched, pos_x, pos_y \
         FROM beliefs ORDER BY last_touched DESC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to get beliefs: {e}");
        format!("Failed to get beliefs: {e}")
    })
}

#[tauri::command]
pub async fn upsert_belief(app: AppHandle, payload: BeliefPayload) -> Result<Belief, String> {
    let pool = app.state::<SqlitePool>();

    if let Some(id) = payload.id {
        // UPDATE path
        if let Some(ref ts) = payload.last_touched {
            sqlx::query(
                "UPDATE beliefs SET title = ?1, description = ?2, confidence = ?3, \
                 domain = ?4, half_life = ?5, last_touched = ?6, pos_x = ?7, pos_y = ?8 \
                 WHERE id = ?9",
            )
            .bind(&payload.title)
            .bind(&payload.description)
            .bind(payload.confidence)
            .bind(&payload.domain)
            .bind(payload.half_life)
            .bind(ts)
            .bind(payload.pos_x)
            .bind(payload.pos_y)
            .bind(id)
            .execute(pool.inner())
            .await
            .map_err(|e| {
                log::error!("Failed to update belief {id}: {e}");
                format!("Failed to update belief: {e}")
            })?;
        } else {
            sqlx::query(
                "UPDATE beliefs SET title = ?1, description = ?2, confidence = ?3, \
                 domain = ?4, half_life = ?5, last_touched = datetime('now'), \
                 pos_x = ?6, pos_y = ?7 \
                 WHERE id = ?8",
            )
            .bind(&payload.title)
            .bind(&payload.description)
            .bind(payload.confidence)
            .bind(&payload.domain)
            .bind(payload.half_life)
            .bind(payload.pos_x)
            .bind(payload.pos_y)
            .bind(id)
            .execute(pool.inner())
            .await
            .map_err(|e| {
                log::error!("Failed to update belief {id}: {e}");
                format!("Failed to update belief: {e}")
            })?;
        }

        // Fetch and return updated row
        sqlx::query_as::<_, Belief>(
            "SELECT id, title, description, confidence, domain, half_life, \
             created_at, last_touched, pos_x, pos_y \
             FROM beliefs WHERE id = ?1",
        )
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to fetch updated belief {id}: {e}");
            format!("Failed to fetch updated belief: {e}")
        })
    } else {
        // INSERT path — use RETURNING to get the new id
        let new_id: i64 = if let Some(ref ts) = payload.last_touched {
            sqlx::query_scalar(
                "INSERT INTO beliefs (title, description, confidence, domain, half_life, \
                 last_touched, pos_x, pos_y) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) \
                 RETURNING id",
            )
            .bind(&payload.title)
            .bind(&payload.description)
            .bind(payload.confidence)
            .bind(&payload.domain)
            .bind(payload.half_life)
            .bind(ts)
            .bind(payload.pos_x)
            .bind(payload.pos_y)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                log::error!("Failed to insert belief: {e}");
                format!("Failed to insert belief: {e}")
            })?
        } else {
            sqlx::query_scalar(
                "INSERT INTO beliefs (title, description, confidence, domain, half_life, \
                 pos_x, pos_y) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) \
                 RETURNING id",
            )
            .bind(&payload.title)
            .bind(&payload.description)
            .bind(payload.confidence)
            .bind(&payload.domain)
            .bind(payload.half_life)
            .bind(payload.pos_x)
            .bind(payload.pos_y)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                log::error!("Failed to insert belief: {e}");
                format!("Failed to insert belief: {e}")
            })?
        };

        // Fetch full row
        sqlx::query_as::<_, Belief>(
            "SELECT id, title, description, confidence, domain, half_life, \
             created_at, last_touched, pos_x, pos_y \
             FROM beliefs WHERE id = ?1",
        )
        .bind(new_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to fetch new belief {new_id}: {e}");
            format!("Failed to fetch new belief: {e}")
        })
    }
}

#[tauri::command]
pub async fn delete_belief(app: AppHandle, id: i64) -> Result<(), String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query("DELETE FROM beliefs WHERE id = ?1")
        .bind(id)
        .execute(pool.inner())
        .await
        .map(|_| ())
        .map_err(|e| {
            log::error!("Failed to delete belief {id}: {e}");
            format!("Failed to delete belief: {e}")
        })
}
