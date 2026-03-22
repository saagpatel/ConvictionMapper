CREATE TABLE IF NOT EXISTS beliefs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    description  TEXT,
    confidence   INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    domain       TEXT    NOT NULL DEFAULT 'General',
    half_life    INTEGER NOT NULL DEFAULT 90,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_touched DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pos_x        REAL,
    pos_y        REAL
);
CREATE INDEX IF NOT EXISTS idx_beliefs_domain       ON beliefs(domain);
CREATE INDEX IF NOT EXISTS idx_beliefs_last_touched ON beliefs(last_touched);

CREATE TABLE IF NOT EXISTS evidence (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    belief_id  INTEGER NOT NULL REFERENCES beliefs(id) ON DELETE CASCADE,
    type       TEXT    NOT NULL CHECK (type IN ('observation','data','argument','authority','experience')),
    content    TEXT    NOT NULL,
    source_url TEXT,
    strength   INTEGER NOT NULL CHECK (strength >= 1 AND strength <= 5),
    added_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_evidence_belief ON evidence(belief_id);

CREATE TABLE IF NOT EXISTS connections (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    from_belief_id  INTEGER NOT NULL REFERENCES beliefs(id) ON DELETE CASCADE,
    to_belief_id    INTEGER NOT NULL REFERENCES beliefs(id) ON DELETE CASCADE,
    relationship    TEXT    NOT NULL CHECK (relationship IN ('supports','contradicts','depends_on','related')),
    strength        INTEGER NOT NULL DEFAULT 3 CHECK (strength >= 1 AND strength <= 5),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_belief_id, to_belief_id)
);
CREATE INDEX IF NOT EXISTS idx_connections_from ON connections(from_belief_id);
CREATE INDEX IF NOT EXISTS idx_connections_to   ON connections(to_belief_id);

CREATE TABLE IF NOT EXISTS updates (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    belief_id            INTEGER NOT NULL REFERENCES beliefs(id) ON DELETE CASCADE,
    old_confidence       INTEGER,
    new_confidence       INTEGER NOT NULL,
    trigger_description  TEXT,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_updates_belief ON updates(belief_id);
CREATE INDEX IF NOT EXISTS idx_updates_time   ON updates(created_at);

CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
INSERT OR IGNORE INTO app_settings VALUES ('onboarding_complete', 'false');
INSERT OR IGNORE INTO app_settings VALUES ('default_half_life',   '90');
INSERT OR IGNORE INTO app_settings VALUES ('decay_demo_mode',     'false');
