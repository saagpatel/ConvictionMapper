# Conviction Mapper — Implementation Roadmap

## Architecture

### System Overview

```
[React UI Layer]
  ├── GraphView (D3 force simulation, SVG — D3 owns DOM)
  ├── ListView (sortable belief table)
  ├── BeliefPanel (slide-in detail + evidence editor)
  ├── QuickAdd (⌘N overlay)
  ├── DeepAdd (⌘⇧N full form)
  └── SettingsView (decay config, domains, export/import)
        │
        ↓ invoke() — typed wrappers in src/lib/tauri-commands.ts
[Rust/Tauri Command Layer]
  ├── get_beliefs() → Vec<Belief>
  ├── upsert_belief(payload) → Belief
  ├── delete_belief(id) → ()
  ├── get_evidence(belief_id) → Vec<Evidence>
  ├── upsert_evidence(payload) → Evidence
  ├── delete_evidence(id) → ()
  ├── get_connections() → Vec<Connection>
  ├── upsert_connection(payload) → Connection
  ├── delete_connection(id) → ()
  ├── log_update(payload) → BeliefUpdate
  ├── get_updates(belief_id) → Vec<BeliefUpdate>
  ├── get_setting(key) → String
  ├── set_setting(key, value) → ()
  └── export_database(dest_path) → ()
        │
        ↓ sqlx queries (WAL mode, FK enforcement)
[SQLite — ~/Library/Application Support/conviction-mapper/conviction.db]
  ├── beliefs
  ├── evidence
  ├── connections
  ├── updates
  └── app_settings
```

### File Structure

```
conviction-mapper/
├── src/
│   ├── components/
│   │   ├── graph/
│   │   │   ├── GraphView.tsx        # D3 SVG container — D3 owns this DOM subtree
│   │   │   ├── Minimap.tsx          # Canvas minimap, 200×120px, bottom-right fixed
│   │   │   └── useForceGraph.ts     # Custom hook: simulation init, tick, freeze/resume
│   │   ├── beliefs/
│   │   │   ├── BeliefPanel.tsx      # Slide-in detail panel (380px), edit + evidence
│   │   │   ├── EvidenceList.tsx     # Evidence chain display inside BeliefPanel
│   │   │   ├── EvidenceForm.tsx     # Add/edit evidence entry form
│   │   │   ├── QuickAdd.tsx         # ⌘N floating overlay
│   │   │   └── DeepAdd.tsx          # ⌘⇧N full form
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx          # Left nav: view switcher + domain filter chips
│   │   │   ├── TopBar.tsx           # Search input, domain filters, view toggle
│   │   │   └── CommandPalette.tsx   # ⌘K — beliefs nav + app commands
│   │   └── shared/
│   │       ├── ConfidenceSlider.tsx # 0–100 slider with live numeric display
│   │       ├── DomainBadge.tsx      # Colored pill badge per domain
│   │       └── DecayIndicator.tsx   # Visual brightness preview for a belief
│   ├── views/
│   │   ├── GraphViewPage.tsx        # Primary view — GraphView + Minimap + BeliefPanel
│   │   ├── ListViewPage.tsx         # Table: title, domain, confidence, last_touched, evidence count
│   │   ├── SettingsPage.tsx         # App settings, domain management, export/import
│   │   └── OnboardingWizard.tsx     # 3-screen first-launch wizard
│   ├── store/
│   │   ├── beliefStore.ts           # Zustand: beliefs[], connections[], CRUD actions
│   │   └── uiStore.ts               # Zustand: selectedBeliefId, activeView, panelOpen, filters
│   ├── lib/
│   │   ├── tauri-commands.ts        # Type-safe invoke() wrappers — one function per Tauri command
│   │   ├── decay.ts                 # computeDecayBrightness(), confidenceToRadius(), strengthToStroke()
│   │   ├── graph-layout.ts          # Force config constants, DOMAIN_COLORS palette, cluster force
│   │   └── onboarding.ts            # seedDatabase() — 8 starter beliefs with spread last_touched dates
│   ├── types/
│   │   └── index.ts                 # All shared interfaces and enums
│   ├── App.tsx                      # Thin router: reads onboarding state, renders active view
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                  # App entry, registers all Tauri commands
│   │   ├── commands/
│   │   │   ├── beliefs.rs           # get_beliefs, upsert_belief, delete_belief
│   │   │   ├── evidence.rs          # get_evidence, upsert_evidence, delete_evidence
│   │   │   ├── connections.rs       # get_connections, upsert_connection, delete_connection
│   │   │   ├── updates.rs           # log_update, get_updates
│   │   │   └── settings.rs          # get_setting, set_setting, export_database
│   │   ├── db/
│   │   │   ├── mod.rs               # Pool init — sets WAL mode + FK pragma on every connection
│   │   │   └── migrations/
│   │   │       └── 001_initial.sql  # Full schema — all 5 tables
│   │   └── models/
│   │       └── mod.rs               # Rust structs matching DB schema (Serialize, Deserialize)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── CLAUDE.md
├── IMPLEMENTATION-ROADMAP.md
├── package.json
└── tsconfig.json
```

---

## Data Model

```sql
-- src-tauri/src/db/migrations/001_initial.sql
-- NOTE: WAL mode and FK enforcement are set in Rust pool init, NOT here.

CREATE TABLE IF NOT EXISTS beliefs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    description  TEXT,
    confidence   INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    domain       TEXT    NOT NULL DEFAULT 'General',
    half_life    INTEGER NOT NULL DEFAULT 90,   -- days until 50% brightness
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_touched DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pos_x        REAL,   -- persisted graph position; NULL = use random initial placement
    pos_y        REAL
);
CREATE INDEX IF NOT EXISTS idx_beliefs_domain       ON beliefs(domain);
CREATE INDEX IF NOT EXISTS idx_beliefs_last_touched ON beliefs(last_touched);

CREATE TABLE IF NOT EXISTS evidence (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    belief_id  INTEGER NOT NULL REFERENCES beliefs(id) ON DELETE CASCADE,
    type       TEXT    NOT NULL CHECK (type IN ('observation','data','argument','authority','experience')),
    content    TEXT    NOT NULL,
    source_url TEXT,           -- nullable; personal experience evidence has no URL
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
    UNIQUE(from_belief_id, to_belief_id)   -- no duplicate edges in either direction
);
CREATE INDEX IF NOT EXISTS idx_connections_from ON connections(from_belief_id);
CREATE INDEX IF NOT EXISTS idx_connections_to   ON connections(to_belief_id);

CREATE TABLE IF NOT EXISTS updates (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    belief_id            INTEGER NOT NULL REFERENCES beliefs(id) ON DELETE CASCADE,
    old_confidence       INTEGER,   -- NULL for the initial creation entry
    new_confidence       INTEGER NOT NULL,
    trigger_description  TEXT,      -- optional: what caused the change
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
```

**Rust pool init (db/mod.rs) — must execute on every connection:**
```rust
sqlx::query("PRAGMA journal_mode = WAL;").execute(&pool).await?;
sqlx::query("PRAGMA foreign_keys = ON;").execute(&pool).await?;
```

---

## TypeScript Interfaces

```typescript
// src/types/index.ts

export type EvidenceType = 'observation' | 'data' | 'argument' | 'authority' | 'experience';
export type RelationshipType = 'supports' | 'contradicts' | 'depends_on' | 'related';
export type Domain =
  | 'Geopolitics' | 'Personal Finance' | 'Technology' | 'Science & Health'
  | 'Society' | 'Personal/Values' | 'Career' | 'Philosophy' | 'General'
  | string; // user-created custom domains

export interface Belief {
  id: number;
  title: string;
  description: string | null;
  confidence: number;        // 0–100
  domain: Domain;
  half_life: number;         // days
  created_at: string;        // ISO datetime string
  last_touched: string;      // ISO datetime string
  pos_x: number | null;
  pos_y: number | null;
}

// Belief with decay brightness computed client-side (never stored)
export interface BeliefWithDecay extends Belief {
  decay_brightness: number;  // 0.15–1.0
}

export interface Evidence {
  id: number;
  belief_id: number;
  type: EvidenceType;
  content: string;
  source_url: string | null;
  strength: number;          // 1–5
  added_at: string;
}

export interface Connection {
  id: number;
  from_belief_id: number;
  to_belief_id: number;
  relationship: RelationshipType;
  strength: number;          // 1–5
  created_at: string;
}

export interface BeliefUpdate {
  id: number;
  belief_id: number;
  old_confidence: number | null;
  new_confidence: number;
  trigger_description: string | null;
  created_at: string;
}

// D3 simulation node — extends Belief with D3 mutable position fields
export interface GraphNode extends BeliefWithDecay {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;   // set during drag to pin; null releases
  fy?: number | null;
}

// D3 simulation link
export interface GraphLink {
  source: number;            // from_belief_id
  target: number;            // to_belief_id
  relationship: RelationshipType;
  strength: number;
}

// Tauri command payloads
export interface BeliefPayload {
  id?: number;               // omit for create
  title: string;
  description?: string;
  confidence: number;
  domain: Domain;
  half_life?: number;        // defaults to 90 if omitted
  pos_x?: number;
  pos_y?: number;
}

export interface QuickAddPayload {
  title: string;
  confidence: number;
  domain: Domain;
}

export interface EvidencePayload {
  id?: number;
  belief_id: number;
  type: EvidenceType;
  content: string;
  source_url?: string;
  strength: number;
}

export interface ConnectionPayload {
  id?: number;
  from_belief_id: number;
  to_belief_id: number;
  relationship: RelationshipType;
  strength: number;
}

export interface UpdatePayload {
  belief_id: number;
  old_confidence: number | null;
  new_confidence: number;
  trigger_description?: string;
}
```

---

## Core Library Functions

```typescript
// src/lib/decay.ts

/**
 * Computes visual brightness for a belief node.
 * Returns value in [0.15, 1.0].
 * Formula: 0.15 + 0.85 * e^(-ln(2)/half_life * days_elapsed)
 *
 * Test vectors (half_life = 90):
 *   0 days  → 1.0
 *   90 days → ~0.575
 *  180 days → ~0.363
 *  365 days → ~0.219
 */
export function computeDecayBrightness(
  lastTouched: string,
  halfLifeDays: number,
  nowOverride?: Date  // used by demo mode and time-travel
): number {
  const now = nowOverride ?? new Date();
  const last = new Date(lastTouched);
  const days = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  const k = Math.LN2 / halfLifeDays;
  const brightness = 0.15 + 0.85 * Math.exp(-k * days);
  return Math.max(0.15, Math.min(1.0, brightness));
}

/** Node radius from confidence. Range: 8px (confidence=0) – 32px (confidence=100). */
export function confidenceToRadius(confidence: number): number {
  return 8 + (confidence / 100) * 24;
}

/** Edge stroke width from connection strength. Range: 1px – 4px. */
export function strengthToStroke(strength: number): number {
  return 1 + (strength / 5) * 3;
}
```

```typescript
// src/lib/graph-layout.ts

export const DOMAIN_COLORS: Record<string, string> = {
  'Geopolitics':      '#EF4444',  // red-500
  'Personal Finance': '#10B981',  // emerald-500
  'Technology':       '#3B82F6',  // blue-500
  'Science & Health': '#8B5CF6',  // violet-500
  'Society':          '#F97316',  // orange-500
  'Personal/Values':  '#EC4899',  // pink-500
  'Career':           '#14B8A6',  // teal-500
  'Philosophy':       '#A78BFA',  // violet-400
  'General':          '#6B7280',  // gray-500
};

export const EDGE_COLORS: Record<string, string> = {
  supports:    '#3B82F6',  // blue
  contradicts: '#EF4444',  // red
  depends_on:  '#6B7280',  // gray
  related:     '#F59E0B',  // amber
};

// D3 force simulation config constants
export const FORCE_CONFIG = {
  manyBodyStrength:   -300,  // node repulsion
  linkDistanceBase:    120,  // base link distance
  linkDistanceScale:    30,  // additional distance per inverse-strength unit
  clusterStrength:    0.15,  // same-domain attraction
  alphaDecayRate:    0.028,  // D3 default; how fast simulation cools
  velocityDecay:      0.4,   // damping
  idleFreezeSecs:       3,   // seconds before stopping simulation
};
```

---

## Dependencies

```bash
# Frontend (run in project root)
npm install d3@7 zustand date-fns lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Rust — add to src-tauri/Cargo.toml under [dependencies]
# tauri-plugin-sql = { version = "2", features = ["sqlite"] }
# serde = { version = "1", features = ["derive"] }
# serde_json = "1"
# sqlx = { version = "0.7", features = ["sqlite", "runtime-tokio", "macros"] }
# tokio = { version = "1", features = ["full"] }

# System requirement — Tauri CLI (if not already installed)
cargo install tauri-cli --version "^2.0"
```

---

## Scope Boundaries

**In scope (V1):**
- Belief CRUD with full structured evidence chains
- Force-directed graph with decay visualization
- Connection management (4 relationship types)
- Domain clustering and color coding
- Guided onboarding (8 seed categories)
- Time-travel replay via updates table
- Command palette (⌘K)
- Settings: decay config, domain management, export/import
- Node position persistence
- Belief update history log

**Out of scope (V1 — do not build):**
- Any network calls, cloud sync, or backend
- Ollama / local AI connection suggestions
- Social comparison of belief networks
- RSS/news integration
- Mobile or Windows builds
- User accounts or authentication
- Prediction tracking with resolution dates

**Deferred to V2:**
- Ollama-powered connection suggestions
- Supabase sync for cross-device access
- Social belief network comparison
- Prediction tracking + calibration scores
- News feed integration

---

## Security

- Zero network calls in V1. The app does not open any sockets.
- DB path: `~/Library/Application Support/conviction-mapper/conviction.db` — macOS user-space, no elevated permissions required.
- Export: user-initiated via native file dialog (`tauri::api::dialog::save_file`). Destination chosen by user. No automatic uploads.
- Import: destructive action — requires explicit confirmation dialog before replacing DB.
- V2 note: when Supabase sync is added, design around per-node explicit sharing opt-in + row-level security. Never sync full graph by default.

---

## Phase 0: Foundation (Week 1)

**Objective:** Scaffolded Tauri 2 project, full SQLite schema live with WAL mode, all Rust commands stubbed with correct signatures, seed script written. Zero UI.

**Tasks:**

1. Scaffold Tauri 2 + React + TypeScript project with Vite using `cargo tauri init`.
   **Acceptance:** `cargo tauri dev` opens a window titled "Conviction Mapper" with no console errors and no Rust panics in terminal.

2. Add tauri-plugin-sql to `Cargo.toml`. In `db/mod.rs`, initialize SQLite pool at `~/Library/Application Support/conviction-mapper/conviction.db`. On every connection, execute: `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`.
   **Acceptance:** App launch creates the `.db` file at the correct path. `sqlite3 [path] "PRAGMA journal_mode;"` returns `wal`.

3. Write `001_initial.sql` with all 5 tables and all indexes (see Data Model above). Run migration via sqlx on app startup before any commands are registered.
   **Acceptance:** `sqlite3 [path] ".schema"` outputs all 5 tables with correct columns, types, and constraints. The 3 default `app_settings` rows are present.

4. Implement all Rust Tauri commands with correct signatures and return types. Commands may return empty/stub data in Phase 0 — signatures, error types (`Result<T, String>`), and registrations in `main.rs` must be final.
   **Acceptance:** `cargo build` exits 0. All commands are registered. Calling `invoke('get_beliefs')` from browser console returns `[]` without error.

5. Write `src/types/index.ts` with all interfaces exactly as specified above. Write `src/lib/tauri-commands.ts` with type-safe async wrappers for every Tauri command.
   **Acceptance:** `tsc --noEmit` exits 0 in strict mode. Every wrapper function has the correct return type matching its Rust command.

6. Write `src/lib/decay.ts` with `computeDecayBrightness()`, `confidenceToRadius()`, and `strengthToStroke()`. Write unit tests (Vitest) verifying the test vectors: `computeDecayBrightness(now, 90)` → 1.0; `computeDecayBrightness(90daysAgo, 90)` → ~0.575 (±0.01); `confidenceToRadius(0)` → 8; `confidenceToRadius(100)` → 32.
   **Acceptance:** `npx vitest run` → all 4 tests pass.

7. Write `src/lib/onboarding.ts` — `seedDatabase()` function that inserts: 8 starter beliefs (one per domain), with `last_touched` dates spread across the past 6 months to make decay immediately visible, 1–2 evidence entries per belief, and 4–5 connections between beliefs. Vary confidence from 30–90 across the seed set.
   **Acceptance:** Calling `seedDatabase()` from browser console populates all 3 tables. Verify in SQLite browser: beliefs have varied `last_touched` dates, evidence rows reference correct `belief_id`s, connections reference existing beliefs.

**Verification Checklist:**
- [ ] `cargo tauri dev` → window opens, no panics, no console errors
- [ ] `.db` file created at `~/Library/Application Support/conviction-mapper/conviction.db`
- [ ] `sqlite3 [path] "PRAGMA journal_mode;"` → `wal`
- [ ] `sqlite3 [path] "PRAGMA foreign_keys;"` → `1`
- [ ] `sqlite3 [path] ".schema"` → shows all 5 tables with correct schemas
- [ ] `sqlite3 [path] "SELECT * FROM app_settings;"` → 3 rows present
- [ ] `cargo build` → exits 0
- [ ] `tsc --noEmit` → exits 0
- [ ] `npx vitest run` → 4 decay tests pass
- [ ] `invoke('get_beliefs')` from console → `[]` (no error)
- [ ] `seedDatabase()` from console → SQLite browser shows populated data

**Risks:**
- tauri-plugin-sql v2 API changes: check the plugin's GitHub `examples/` folder before writing commands — it's the ground truth over docs.
- WAL pragma must be in Rust pool init, not SQL migration. Setting it in SQL works once but doesn't persist across connections.

---

## Phase 1: Belief Ledger (Weeks 2–3)

**Objective:** Full CRUD for beliefs, evidence, and connections. List view, BeliefPanel, QuickAdd, DeepAdd. No graph yet. The data layer and interaction patterns are validated here.

**Tasks:**

1. Build `ListViewPage.tsx` — sortable table showing all beliefs. Columns: title, domain (DomainBadge), confidence (numeric + progress bar), last_touched (relative: "3 days ago"), evidence count. Default sort: last_touched DESC. Clicking a row sets `selectedBeliefId` in `uiStore` and opens BeliefPanel.
   **Acceptance:** All 8 seeded beliefs appear with correct data. Clicking each column header sorts correctly. Clicking a row opens BeliefPanel showing that belief.

2. Build `BeliefPanel.tsx` — slide-in panel (380px wide, right side). Shows: title (editable), description (editable textarea), confidence slider (ConfidenceSlider), domain selector, half_life field, and sections for Evidence and Connections. Has a "Save" button that commits all edits. Closes on Escape or clicking outside.
   **Acceptance:** Changing confidence and saving: (1) updates the belief in DB, (2) inserts a row into `updates` table with old/new confidence, (3) updates `beliefStore` without full refetch. Panel closes on Escape.

3. Build `EvidenceList.tsx` + `EvidenceForm.tsx`. EvidenceList renders inside BeliefPanel — shows each evidence entry with type badge, content, source URL (clickable link if present), strength stars, and delete button. EvidenceForm is an inline add/edit form with: type dropdown (5 options), content textarea, source_url text input (optional, validated as URL if provided), strength 1–5 selector.
   **Acceptance:** Adding evidence saves to DB and appends to list without closing panel. Deleting evidence removes from DB and list. Source URL renders as `<a target="_blank">` when present.

4. Build `QuickAdd.tsx` — triggered by ⌘N. Floating centered overlay. Fields: title (auto-focused text input), confidence slider (default 50), domain dropdown. Submit on Enter or "Add Belief" button. Escape dismisses.
   **Acceptance:** Full flow ⌘N → fill title → adjust slider → Enter completes in <10 seconds. Belief appears immediately in list. BeliefPanel auto-opens on the new belief. An initial row is inserted into `updates` (old_confidence = null, new_confidence = initial value).

5. Build `DeepAdd.tsx` — triggered by ⌘⇧N. Same fields as QuickAdd plus: description textarea, half_life number input (default 90), and optional first evidence entry inline (shows EvidenceForm collapsed; expanding it reveals the form). Submit creates belief + evidence in a single transaction.
   **Acceptance:** Submitting with evidence creates both rows atomically. If the evidence form is not expanded, only the belief is created. No orphaned beliefs.

6. Build connection management section inside BeliefPanel. Shows existing connections as a list: relationship type badge, other belief title, strength indicator, delete button. "Add Connection" button opens a searchable belief picker (filters by title as user types), then relationship type selector, then strength slider. Submit writes to `connections` table.
   **Acceptance:** Creating a connection appears in list immediately. Deleting shows a confirmation, then removes from DB and list. The UNIQUE constraint on connections is enforced — attempting a duplicate shows an error toast.

7. Wire `beliefStore.ts` and `uiStore.ts`. On app load, fetch all beliefs and connections via Tauri commands and hydrate the stores. All mutations (create/update/delete) update both DB and store state in the same action — no separate refetch.
   **Acceptance:** Navigating between List and Graph views (once Graph exists) shows consistent data. Adding a belief in List view would be immediately visible if Graph were rendered.

8. Build `Sidebar.tsx` and `TopBar.tsx`. Sidebar: view switcher (List icon / Graph icon), domain filter chips (all domains from loaded beliefs, multi-select). TopBar: search input (filters belief list by title in real-time, debounced 150ms), active domain filter display, view label.
   **Acceptance:** Typing in search filters list within 150ms. Domain filter chips show only beliefs matching selected domains. Clearing filters (Escape in search field) restores full list.

**Verification Checklist:**
- [ ] All 8 seeded beliefs visible in list with correct columns
- [ ] Sort by each column works correctly
- [ ] Create belief via QuickAdd → appears in list → panel opens
- [ ] Create belief via DeepAdd with evidence → both rows in DB
- [ ] Edit confidence → updates row in DB + creates row in `updates`
- [ ] Add/delete evidence round-trip works without closing panel
- [ ] Source URL renders as clickable link
- [ ] Add/delete connection round-trip works
- [ ] Duplicate connection attempt shows error (not silent fail)
- [ ] Search filters list in real-time
- [ ] Domain filter chips work correctly

**Risks:**
- BeliefPanel local draft state: use `useState` for a local copy of the belief being edited; only commit to DB on explicit Save. Do NOT write to DB on every keypress.
- Zustand store going stale: Tauri commands should return the updated entity from Rust; replace the store entry with the returned value rather than optimistically mutating client state.

---

## Phase 2: Graph View (Weeks 4–5)

**Objective:** Force-directed graph with decay visualization, domain clustering, all 4 edge types, node drag, zoom/pan, minimap, position persistence, idle performance optimization.

**Tasks:**

1. Build `useForceGraph.ts` — custom hook that initializes D3 force simulation with: `d3.forceManyBody().strength(-300)`, `d3.forceLink().distance(link => 120 + 30 * (6 - link.strength))`, `d3.forceCenter()`, and a custom cluster force that applies a weak attraction (0.15) between nodes sharing the same domain. Returns: `svgRef`, `simulationRef`, a restart function, and a freeze/resume API.
   **Acceptance:** With 8 seed nodes and 5 links, simulation stabilizes (alpha < 0.01) in <3 seconds. No node overlap at rest.

2. Build `GraphView.tsx` — full-viewport SVG (minus sidebar). **D3 must own this DOM subtree.** Use `useRef` on the SVG element. In the D3 tick callback, directly mutate `cx`, `cy` attributes on circle elements and `x1`,`y1`,`x2`,`y2` on line elements — do NOT call React setState. Render: circles (radius from `confidenceToRadius()`, fill from `DOMAIN_COLORS`, fill-opacity from `computeDecayBrightness()`), lines (stroke from `EDGE_COLORS[relationship]`, stroke-width from `strengthToStroke()`), text labels (belief title, truncated at 20 chars, below node).
   **Acceptance:** All 8 nodes render with correct sizes, domain colors, and decay opacities. Seed beliefs from 6 months ago are visibly dimmer than recently created ones. All 5 connections render with correct edge colors.

3. Implement node drag. On `mousedown` on a node: set `node.fx = node.x`, `node.fy = node.y`, restart simulation with `alpha(0.3)`. On `mousemove`: update `fx`, `fy` to cursor position. On `mouseup`: release pin (`fx = null`, `fy = null`). All event handlers attached via D3, not React.
   **Acceptance:** Dragging a node moves it smoothly. Releasing allows it to settle. Other nodes respond to the repositioning. Graph does not jump on drag start.

4. Implement zoom + pan via `d3.zoom()` attached to the SVG. Scale extent: [0.2, 4.0]. Translate extent: unconstrained. Apply transform to an inner `<g>` wrapper (not the SVG itself). Double-click on a node: animate zoom to center on that node at scale 1.5 using `svg.transition().duration(500).call(zoom.transform, ...)`. ⌘0 resets zoom to default.
   **Acceptance:** Scroll zooms smoothly between 0.2–4x. Click+drag pans. Double-click on a node centers and zooms to it with animation. ⌘0 returns to default view.

5. Build `Minimap.tsx` — fixed-position canvas (200×120px, bottom-right, 16px margin). On each simulation tick, clear canvas and re-render all nodes as 2px filled circles using `DOMAIN_COLORS`. Draw a viewport rectangle showing the current visible area based on the D3 zoom transform. Clicking the minimap pans the main graph to the clicked position.
   **Acceptance:** Minimap updates every simulation tick and on zoom/pan. Clicking the minimap pans graph to the correct position. Viewport rectangle reflects actual visible area.

6. Node right-click context menu. On `contextmenu` event on a node (D3 handler, `event.preventDefault()`): show a positioned dropdown with options: "Edit" (opens BeliefPanel), "Connect to..." (enters connection-draw mode), "Touch — Reset Decay" (calls `upsert_belief` with `last_touched = now`, brightens node immediately), "Delete" (confirmation then delete). Connection-draw mode: cursor changes to crosshair, clicking any other node triggers relationship type selector modal, then strength slider, then creates connection.
   **Acceptance:** Right-click menu appears at cursor position within 50ms. All 4 actions work. "Touch" visibly brightens the node opacity without requiring app restart. Connection-draw mode can be cancelled with Escape.

7. Persist node positions on drag-end. After `mouseup` in a drag, call `upsert_belief` with `pos_x = node.x`, `pos_y = node.y` via Tauri command. On graph initialization, if a belief has `pos_x`/`pos_y` set, initialize the D3 node with those coordinates and set `fx`/`fy` temporarily (release after first tick to allow simulation to refine).
   **Acceptance:** Drag nodes to new positions, quit app, reopen — nodes appear in same positions. Positions are in DB (`SELECT pos_x, pos_y FROM beliefs`).

8. Idle performance optimization. After simulation alpha drops below 0.01 (fully cooled), call `simulation.stop()`. On any user interaction with the graph (mousemove, mousedown, wheel), call `simulation.restart()` with a low alpha (0.1) to allow minor settling. After 3 seconds of no interaction, stop again.
   **Acceptance:** Open Activity Monitor. With graph idle, app CPU usage < 2%. Moving mouse over graph resumes simulation smoothly.

**Verification Checklist:**
- [ ] 8-node graph renders and stabilizes in <3 seconds
- [ ] All node sizes correct (confidence → radius mapping)
- [ ] All node opacities correct (older = dimmer)
- [ ] All edge colors correct per relationship type
- [ ] Drag: smooth movement, correct settle, no jump on start
- [ ] Zoom: 0.2–4x range, pan works, double-click centers
- [ ] ⌘0 resets zoom
- [ ] Minimap renders and click-to-pan works
- [ ] Minimap viewport rectangle is accurate
- [ ] Right-click menu: all 4 options work
- [ ] "Touch" brightens node immediately
- [ ] Connection-draw mode works; Escape cancels
- [ ] Node positions persist across app restart
- [ ] CPU < 2% when idle (Activity Monitor)

**Risks:**
- D3 + React double-render loop: never call `setState` with node positions. D3 tick callback manipulates DOM attributes directly. React manages everything outside the SVG subtree.
- Canvas minimap coordinate mapping: the minimap must use the same d3.zoom transform matrix to convert graph coordinates to canvas coordinates. Do not recompute independently.
- Simulation thrash on new node add: when adding a belief from BeliefPanel while in graph view, fix all existing node positions (`fx`, `fy`) before adding the new node. Release after new node settles.

---

## Phase 3: Polish + Onboarding (Week 6)

**Objective:** Guided first-launch onboarding, time-travel scrubber, settings page, command palette, decay demo mode, belief update history UI.

**Tasks:**

1. Build `OnboardingWizard.tsx` — 3-screen wizard shown when `onboarding_complete = false`. Screen 1: App intro with an animated miniature graph (CSS animation, not D3 — keep it simple). Screen 2: "Pick your starting domains" — checklist of 8 domains, all pre-checked. User can uncheck domains they don't want. Screen 3: "Add your first belief" — embedded QuickAdd form. On completion: call `seedDatabase()` with only the selected domains, then set `onboarding_complete = true` in `app_settings`. Wizard never re-triggers after completion.
   **Acceptance:** Fresh DB (delete and reopen) shows wizard. Deselecting 2 domains and completing: seed beliefs for only 6 domains are in DB. Reopening app after completion skips wizard entirely.

2. Build `SettingsPage.tsx` with 3 sections: (1) App — default half-life slider (30–365 days), decay demo mode toggle. (2) Domains — list all domains from beliefs, allow rename and color picker (hex input), add custom domain, delete domain (only if no beliefs use it). (3) Data — "Export Database" (native file dialog → saves `.db` to user-chosen path), "Import Database" (native file dialog → destructive confirmation → replaces DB), "Clear All Data" (destructive confirmation → wipes all tables → restarts onboarding).
   **Acceptance:** Export creates a valid SQLite file openable in DB Browser. Import replaces all data correctly. Clear all data resets `onboarding_complete` to false. Decay demo mode toggle persists across restarts.

3. Implement time-travel replay. In GraphViewPage, add a collapsible timeline panel (bottom-center, full width, 64px tall). A date scrubber (HTML range input mapping to `min_date` → `now`). As user scrubs: recompute all belief confidence values from the `updates` table at the target date (latest update ≤ target date per belief), recompute decay brightness using target date as `nowOverride`, re-render graph with updated node sizes and opacities. Playback button advances date at 1 month/second.
   **Acceptance:** Scrubbing to a date before a known confidence change shows the old confidence value (verify against `updates` table). Node sizes and opacities change as scrubber moves. Releasing scrubber snaps back to live mode.

4. Build `CommandPalette.tsx` (⌘K). Searchable list of: all beliefs (show domain badge + confidence), then all commands (New Belief, New Belief (Deep), Settings, Export, Toggle View, Clear Search, Reset Zoom). Keyboard navigation: ↑↓ arrows, Enter to select, Escape to close. Selecting a belief: closes palette, pans graph to that node, opens BeliefPanel.
   **Acceptance:** ⌘K opens palette. Typing filters within 50ms. Keyboard navigation works. Selecting a belief in graph view pans to it and opens panel. All listed commands execute correctly.

5. Implement decay demo mode. When enabled in Settings: compute all decay brightnesses using `addYears(now, 1)` as `nowOverride` (from date-fns). Show a persistent amber banner at top of graph view: "Decay Preview: showing decay state 1 year from now." Disabling restores real-time brightnesses. The toggle persists in `app_settings`.
   **Acceptance:** Enabling demo mode visibly dims most beliefs (especially those with short half-lives). Disabling restores them. The banner is visible while active.

6. Belief update history in BeliefPanel. Add a collapsible "History" section (collapsed by default). When expanded, shows all `updates` rows for this belief in reverse chronological order. Each entry: date (formatted "Mar 12, 2026"), confidence delta displayed as "65 → 80 ↑" or "80 → 65 ↓", and trigger_description (italic, gray, "No note" if null). Confidence change save flow: after saving, show an inline prompt "What changed your thinking?" with a text input and "Skip" link; saving the note calls `log_update` with the trigger_description.
   **Acceptance:** History section shows all logged updates for a seeded belief in correct order. Confidence change + "what changed" note: note appears in history. Skipping note: update logged with null trigger_description.

**Verification Checklist:**
- [ ] First-launch (clean DB) shows onboarding wizard
- [ ] Deselecting domains → only selected domain seeds are created
- [ ] Reopening after onboarding → skips wizard
- [ ] Export creates a valid `.db` file
- [ ] Import replaces data correctly
- [ ] Clear all data resets to onboarding state
- [ ] Time-travel: scrubbing to before a known confidence change shows old value
- [ ] ⌘K opens palette; belief selection pans graph + opens panel
- [ ] All commands in palette execute correctly
- [ ] Decay demo mode visibly changes brightnesses; banner shows; disabling restores
- [ ] Belief history shows correct update log in correct order
- [ ] "What changed?" note appears in history after saving

---

## Testing Strategy

### Unit Tests (Vitest — write in Phase 0, extend each phase)
- `decay.ts`: all 4 test vectors for `computeDecayBrightness`, boundary cases for `confidenceToRadius` and `strengthToStroke`
- `graph-layout.ts`: verify all 8 domains have an entry in `DOMAIN_COLORS`; all 4 relationship types in `EDGE_COLORS`
- `tauri-commands.ts`: mock `invoke` and verify wrapper functions pass correct command names and argument shapes

### Manual Verification Per Phase
- **Phase 0:** SQLite CLI checks (schema, pragmas, seed data)
- **Phase 1:** Full CRUD round-trip for all entity types; `updates` table populated on every confidence change
- **Phase 2:** CPU < 2% idle (Activity Monitor); position persistence across restarts; all graph interactions
- **Phase 3:** Onboarding flow on clean DB; time-travel accuracy verified against DB; export/import round-trip

### Performance Benchmarks
- Graph stabilizes with 100 nodes in <3 seconds on M4 Pro
- QuickAdd flow completes in <10 seconds
- Search/filter response: <150ms
- Command palette filter: <50ms
- Context menu appears: <50ms
