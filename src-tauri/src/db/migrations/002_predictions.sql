-- Prediction tracking: testable claims attached to beliefs with resolution dates
CREATE TABLE IF NOT EXISTS predictions (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    belief_id             INTEGER NOT NULL REFERENCES beliefs(id) ON DELETE CASCADE,
    statement             TEXT    NOT NULL,
    predicted_confidence  INTEGER NOT NULL CHECK (predicted_confidence >= 0 AND predicted_confidence <= 100),
    resolution_date       TEXT    NOT NULL,
    outcome               TEXT    CHECK (outcome IN ('correct', 'incorrect', 'voided')),
    outcome_notes         TEXT,
    resolved_at           TEXT,
    created_at            TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_predictions_belief ON predictions(belief_id);
CREATE INDEX IF NOT EXISTS idx_predictions_resolution_date ON predictions(resolution_date);
CREATE INDEX IF NOT EXISTS idx_predictions_outcome ON predictions(outcome);
