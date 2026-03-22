use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ---------------------------------------------------------------------------
// Output structs (DB → app)
// ---------------------------------------------------------------------------

#[derive(Debug, FromRow, Serialize)]
pub struct Belief {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub confidence: i64,
    pub domain: String,
    pub half_life: i64,
    pub created_at: String,
    pub last_touched: String,
    pub pos_x: Option<f64>,
    pub pos_y: Option<f64>,
}

#[derive(Debug, FromRow, Serialize)]
pub struct Evidence {
    pub id: i64,
    pub belief_id: i64,
    /// DB column is `type` (Rust keyword) — mapped via sqlx rename.
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub evidence_type: String,
    pub content: String,
    pub source_url: Option<String>,
    pub strength: i64,
    pub added_at: String,
}

#[derive(Debug, FromRow, Serialize)]
pub struct Connection {
    pub id: i64,
    pub from_belief_id: i64,
    pub to_belief_id: i64,
    pub relationship: String,
    pub strength: i64,
    pub created_at: String,
}

#[derive(Debug, FromRow, Serialize)]
pub struct BeliefUpdate {
    pub id: i64,
    pub belief_id: i64,
    pub old_confidence: Option<i64>,
    pub new_confidence: i64,
    pub trigger_description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, FromRow, Serialize)]
pub struct AppSetting {
    pub key: String,
    pub value: String,
}

#[derive(Debug, FromRow, Serialize)]
pub struct EvidenceCount {
    pub belief_id: i64,
    pub count: i32,
}

// ---------------------------------------------------------------------------
// Input structs (frontend → app)
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct BeliefPayload {
    pub id: Option<i64>,
    pub title: String,
    pub description: Option<String>,
    pub confidence: i64,
    pub domain: String,
    pub half_life: i64,
    pub last_touched: Option<String>,
    pub pos_x: Option<f64>,
    pub pos_y: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct EvidencePayload {
    pub id: Option<i64>,
    pub belief_id: i64,
    /// Serialised as `type` in JSON to match the DB column name.
    #[serde(rename = "type")]
    pub evidence_type: String,
    pub content: String,
    pub source_url: Option<String>,
    pub strength: i64,
}

#[derive(Debug, Deserialize)]
pub struct ConnectionPayload {
    pub id: Option<i64>,
    pub from_belief_id: i64,
    pub to_belief_id: i64,
    pub relationship: String,
    pub strength: i64,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePayload {
    pub belief_id: i64,
    pub old_confidence: Option<i64>,
    pub new_confidence: i64,
    pub trigger_description: Option<String>,
}
