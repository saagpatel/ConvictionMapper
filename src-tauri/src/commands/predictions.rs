use std::collections::HashMap;

use crate::models::{
    CalibrationBucket, CalibrationStats, DomainCalibration, Prediction, PredictionCount,
    PredictionPayload, PredictionWithBelief, ResolvePredictionPayload,
};
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn get_predictions(
    app: AppHandle,
    belief_id: i64,
) -> Result<Vec<Prediction>, String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query_as::<_, Prediction>(
        "SELECT id, belief_id, statement, predicted_confidence, resolution_date, \
         outcome, outcome_notes, resolved_at, created_at \
         FROM predictions WHERE belief_id = ?1 ORDER BY resolution_date ASC",
    )
    .bind(belief_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to get predictions for belief {belief_id}: {e}");
        format!("Failed to get predictions: {e}")
    })
}

#[tauri::command]
pub async fn get_all_predictions(app: AppHandle) -> Result<Vec<PredictionWithBelief>, String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query_as::<_, PredictionWithBelief>(
        "SELECT p.id, p.belief_id, p.statement, p.predicted_confidence, p.resolution_date, \
         p.outcome, p.outcome_notes, p.resolved_at, p.created_at, \
         b.title AS belief_title, b.domain AS belief_domain \
         FROM predictions p \
         JOIN beliefs b ON p.belief_id = b.id \
         ORDER BY p.resolution_date ASC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to get all predictions: {e}");
        format!("Failed to get all predictions: {e}")
    })
}

#[tauri::command]
pub async fn upsert_prediction(
    app: AppHandle,
    payload: PredictionPayload,
) -> Result<Prediction, String> {
    let pool = app.state::<SqlitePool>();

    if let Some(id) = payload.id {
        // UPDATE path
        sqlx::query(
            "UPDATE predictions SET belief_id = ?1, statement = ?2, \
             predicted_confidence = ?3, resolution_date = ?4 WHERE id = ?5",
        )
        .bind(payload.belief_id)
        .bind(&payload.statement)
        .bind(payload.predicted_confidence)
        .bind(&payload.resolution_date)
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to update prediction {id}: {e}");
            format!("Failed to update prediction: {e}")
        })?;

        sqlx::query_as::<_, Prediction>(
            "SELECT id, belief_id, statement, predicted_confidence, resolution_date, \
             outcome, outcome_notes, resolved_at, created_at \
             FROM predictions WHERE id = ?1",
        )
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to fetch updated prediction {id}: {e}");
            format!("Failed to fetch updated prediction: {e}")
        })
    } else {
        // INSERT path
        let new_id: i64 = sqlx::query_scalar(
            "INSERT INTO predictions (belief_id, statement, predicted_confidence, resolution_date) \
             VALUES (?1, ?2, ?3, ?4) RETURNING id",
        )
        .bind(payload.belief_id)
        .bind(&payload.statement)
        .bind(payload.predicted_confidence)
        .bind(&payload.resolution_date)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to insert prediction: {e}");
            format!("Failed to insert prediction: {e}")
        })?;

        sqlx::query_as::<_, Prediction>(
            "SELECT id, belief_id, statement, predicted_confidence, resolution_date, \
             outcome, outcome_notes, resolved_at, created_at \
             FROM predictions WHERE id = ?1",
        )
        .bind(new_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            log::error!("Failed to fetch new prediction {new_id}: {e}");
            format!("Failed to fetch new prediction: {e}")
        })
    }
}

#[tauri::command]
pub async fn delete_prediction(app: AppHandle, id: i64) -> Result<(), String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query("DELETE FROM predictions WHERE id = ?1")
        .bind(id)
        .execute(pool.inner())
        .await
        .map(|_| ())
        .map_err(|e| {
            log::error!("Failed to delete prediction {id}: {e}");
            format!("Failed to delete prediction: {e}")
        })
}

#[tauri::command]
pub async fn resolve_prediction(
    app: AppHandle,
    payload: ResolvePredictionPayload,
) -> Result<Prediction, String> {
    let pool = app.state::<SqlitePool>();

    sqlx::query(
        "UPDATE predictions SET outcome = ?1, outcome_notes = ?2, \
         resolved_at = datetime('now') WHERE id = ?3",
    )
    .bind(&payload.outcome)
    .bind(&payload.outcome_notes)
    .bind(payload.id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to resolve prediction {}: {e}", payload.id);
        format!("Failed to resolve prediction: {e}")
    })?;

    sqlx::query_as::<_, Prediction>(
        "SELECT id, belief_id, statement, predicted_confidence, resolution_date, \
         outcome, outcome_notes, resolved_at, created_at \
         FROM predictions WHERE id = ?1",
    )
    .bind(payload.id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to fetch resolved prediction {}: {e}", payload.id);
        format!("Failed to fetch resolved prediction: {e}")
    })
}

#[tauri::command]
pub async fn get_prediction_counts(app: AppHandle) -> Result<Vec<PredictionCount>, String> {
    let pool = app.state::<SqlitePool>();
    sqlx::query_as::<_, PredictionCount>(
        "SELECT belief_id, \
         CAST(COUNT(*) AS INTEGER) AS total, \
         CAST(SUM(CASE WHEN outcome IS NULL AND resolution_date > datetime('now') THEN 1 ELSE 0 END) AS INTEGER) AS pending, \
         CAST(SUM(CASE WHEN outcome IS NULL AND resolution_date <= datetime('now') THEN 1 ELSE 0 END) AS INTEGER) AS overdue \
         FROM predictions GROUP BY belief_id",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to get prediction counts: {e}");
        format!("Failed to get prediction counts: {e}")
    })
}

/// Resolved prediction row for calibration computation.
#[derive(Debug, sqlx::FromRow)]
struct ResolvedPredictionRow {
    predicted_confidence: i64,
    outcome: String,
    domain: String,
}

#[tauri::command]
pub async fn get_calibration_stats(app: AppHandle) -> Result<CalibrationStats, String> {
    let pool = app.state::<SqlitePool>();

    // Fetch all resolved predictions (excluding voided)
    let rows = sqlx::query_as::<_, ResolvedPredictionRow>(
        "SELECT p.predicted_confidence, p.outcome, b.domain \
         FROM predictions p \
         JOIN beliefs b ON p.belief_id = b.id \
         WHERE p.outcome IS NOT NULL AND p.outcome != 'voided'",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to fetch resolved predictions for calibration: {e}");
        format!("Failed to compute calibration: {e}")
    })?;

    // Count voided separately
    let voided_count: i32 = sqlx::query_scalar(
        "SELECT CAST(COUNT(*) AS INTEGER) FROM predictions WHERE outcome = 'voided'",
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        log::error!("Failed to count voided predictions: {e}");
        format!("Failed to count voided predictions: {e}")
    })?;

    // Count total predictions
    let total_predictions: i32 =
        sqlx::query_scalar("SELECT CAST(COUNT(*) AS INTEGER) FROM predictions")
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                log::error!("Failed to count total predictions: {e}");
                format!("Failed to count total predictions: {e}")
            })?;

    let resolved_count = rows.len() as i32;

    if rows.is_empty() {
        return Ok(CalibrationStats {
            total_predictions,
            resolved_count: 0,
            voided_count,
            brier_score: 0.0,
            accuracy: 0.0,
            buckets: Vec::new(),
            by_domain: Vec::new(),
        });
    }

    // Compute Brier score + accuracy
    let mut brier_sum = 0.0;
    let mut correct_count = 0i32;

    for row in &rows {
        let predicted = row.predicted_confidence as f64 / 100.0;
        let actual = if row.outcome == "correct" {
            correct_count += 1;
            1.0
        } else {
            0.0
        };
        brier_sum += (predicted - actual).powi(2);
    }

    let brier_score = brier_sum / resolved_count as f64;
    let accuracy = correct_count as f64 / resolved_count as f64;

    // Bucket into 10 ranges (0-10, 10-20, ..., 90-100)
    let mut buckets: Vec<CalibrationBucket> = (0..10)
        .map(|i| CalibrationBucket {
            range_start: i * 10,
            range_end: (i + 1) * 10,
            total: 0,
            correct: 0,
            actual_rate: 0.0,
        })
        .collect();

    for row in &rows {
        let idx = ((row.predicted_confidence as usize).min(99)) / 10;
        buckets[idx].total += 1;
        if row.outcome == "correct" {
            buckets[idx].correct += 1;
        }
    }

    for bucket in &mut buckets {
        if bucket.total > 0 {
            bucket.actual_rate = bucket.correct as f64 / bucket.total as f64;
        }
    }

    // Per-domain calibration
    let mut domain_data: HashMap<String, (f64, i32, i32)> = HashMap::new(); // (brier_sum, total, correct)
    for row in &rows {
        let entry = domain_data
            .entry(row.domain.clone())
            .or_insert((0.0, 0, 0));
        let predicted = row.predicted_confidence as f64 / 100.0;
        let actual = if row.outcome == "correct" { 1.0 } else { 0.0 };
        entry.0 += (predicted - actual).powi(2);
        entry.1 += 1;
        if row.outcome == "correct" {
            entry.2 += 1;
        }
    }

    let by_domain: Vec<DomainCalibration> = domain_data
        .into_iter()
        .map(|(domain, (brier_sum, total, correct))| DomainCalibration {
            domain,
            brier_score: if total > 0 {
                brier_sum / total as f64
            } else {
                0.0
            },
            total,
            correct,
            accuracy: if total > 0 {
                correct as f64 / total as f64
            } else {
                0.0
            },
        })
        .collect();

    Ok(CalibrationStats {
        total_predictions,
        resolved_count,
        voided_count,
        brier_score,
        accuracy,
        buckets,
        by_domain,
    })
}
