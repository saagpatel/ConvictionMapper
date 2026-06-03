# ConvictionMapper — Portfolio Disposition

**Status:** Active — working Tauri + Rust + TypeScript belief-mapping
desktop app on `origin/main`, V1 + V2 (prediction tracking with
calibration scores) both shipped, no release-readiness doc yet.
Disposition is **not** Release Frozen; the gate is "decide whether
to package this for distribution."

> Disposition uses strict `origin/main` verification.
> **Memory correction:** the project memory previously claimed V2
> prediction tracking was "committed but not on main." That claim
> was wrong. V2 is on `origin/main` (commits `cb41562`, `7f4d0a6`).

---

## Verification posture

Clean account-migration state — **no `legacy-origin` remote**. The
trap from FreeLanceInvoice/PersonalKBDrafter doesn't apply.

Specifically verified on `origin/main`:
- Tip: `1d1c633` chore: add initial CHANGELOG
- Substantive feature commits on `origin/main`:
  - `cb41562` feat: merge prediction tracking — calibration scores, BeliefPanel integration, graph rings
  - `7f4d0a6` feat: prediction tracking with calibration scores
  - `47a658b` feat: V1 final integration — wire orphaned components, domain colors, fixes
  - `d0cae7f` feat: Phase 3 — onboarding, settings, command palette, history, time-travel
  - `cf8f779` feat: Phase 1 UI — list view, belief panel, evidence, connections, overlays
- V2 prediction tracking files present on `origin/main`:
  - `src-tauri/src/commands/predictions.rs`
  - `src-tauri/src/db/migrations/002_predictions.sql`
  - `src/components/beliefs/PredictionCard.tsx`, `PredictionForm.tsx`, `PredictionSection.tsx`
  - `src/components/predictions/CalibrationChart.tsx`, `CalibrationDashboard.tsx`, `PredictionRow.tsx`, `PredictionsViewPage.tsx`
- **No `docs/` directory** on `origin/main` before this file
- Default branch: `main`

---

## Memory correction

Previous portfolio-OS memory claimed "V2 prediction tracking committed
but not on main." That was a SynthWave-style trap concern (work on
local-only branches that never reached canonical). **It's not the
case here** — V2 merged into `origin/main` via commits `7f4d0a6`
(initial) and `cb41562` (full integration). The prediction-tracking
files exist in the canonical source tree, not just on a side branch.

The memory should be updated. This file is the corrected reference.

---

## Current state in one paragraph

Conviction Mapper is a local-first Tauri + Rust + TypeScript desktop
app for mapping and tracking beliefs as an interactive
force-directed graph. Each belief carries a confidence score, domain
tag, evidence trail, and configurable half-life — nodes visually
fade without revisit. Beliefs link as supports/contradicts/depends-on/
related. V2 added dated falsifiable predictions tied to beliefs,
plus a calibration dashboard with Brier scoring, per-confidence-bucket
accuracy, and per-domain breakdown. SQLite persistence, D3 graph
canvas, time-travel/history, command palette, onboarding flow. V1 +
V2 are both shipped on `origin/main`.

For full detail see `README.md`.

---

## Why "Active" instead of Release Frozen

Same shape as Conductor / SnippetLibrary / Chronomap /
ScreenshotAnnotate / CryptForge. The signing-frozen cluster (10
repos: DesktopPEt / ContentEngine / AIGCCore / Relay / FreeLanceInvoice
/ Nexus / DeepTank / OPscinema / ShipKit / SignalFlow) all have
release-readiness docs. ConvictionMapper doesn't. The next move is
operator decision-time about distribution, not signing-credential-time.

The "calibration dashboard with Brier score" feature is notable —
it implies a non-trivial audience (rationalists, forecasters,
quantified-self folks) that distinguishes this from generic
mind-mapping tools.

---

## Possible next moves (operator choice)

### Option 1 — Package for distribution and join the signing cluster

Required scope:

1. Write `docs/RELEASE-READINESS.md`
2. Wire Tauri 2 macOS signing + notarization
3. Cut a v2.0 release (V1 + V2 are both in)
4. Decide distribution channel:
   - GitHub Releases (DMG)
   - LessWrong / rationalist community direct posts
   - Homebrew cask (less natural fit for a graph app)

Estimated effort: ~4 hours for signing + readiness doc.

### Option 2 — Open-source as a build-locally tool

Polish the README local-build path, no signing. Same posture as
Option 2 for other "Active" cluster members.

Estimated effort: ~30 minutes.

### Option 3 — Mark as personal-use rationalist tool

Decide audience is just the author. Move to `Cold Storage`. Keep
repo public for transparency.

Estimated effort: ~15 minutes.

---

## Recommendation (informational)

**Option 1 is a natural fit** for ConvictionMapper:

- The product has a sharp, identifiable audience (calibration /
  forecasting community)
- LessWrong / EA Forum posts about "I built this tool" do well for
  this category — distribution path is cheap and clearly-targeted
- The V1→V2 progression suggests the operator already iterated past
  v1 ambition

But operator-judgment. Option 2 is fine if signing pipeline isn't
a priority and a discoverable readme is enough.

---

## Portfolio operating system instructions

| Aspect | Posture |
|---|---|
| Portfolio status | `Active` |
| Memory note | Update prior "V2 not on main" claim — V2 IS on main as of `cb41562` |
| Next packet shape | "Decide between Option 1 / 2 / 3" |
| Review cadence | Resume normal cadence — this row needs decision-time |
| Resurface conditions | Once the operator picks an option, surface a packet for the work each option implies |
| Do **not** auto-add to signing cluster | The cluster is for repos that already have release-readiness docs. ConvictionMapper doesn't yet. |

---

## Reactivation procedure (for the next code session)

1. Clean migration state — no `legacy-origin` to verify against.
2. Delete stale `codex/*` branches that pre-date the V2 merge
   (`cb41562`).
3. Re-run `pnpm install && pnpm tauri build` to confirm the
   toolchain still works after the freeze.
4. If picking Option 1, write the release-readiness doc first.

---

## Last known reference

| Field | Value |
|---|---|
| `origin/main` tip | `012a1a5` docs: lean CLAUDE.md (claude-md-lint) |
| Last substantive commit | `cb41562` feat: merge prediction tracking — calibration scores, BeliefPanel integration, graph rings |
| V1 status | Shipped (`47a658b`) |
| V2 status | Shipped on `origin/main` (`cb41562`, `7f4d0a6`) — **corrects prior memory claim** |
| Build system | Tauri 2 + Rust + React/TypeScript + Vite + Tailwind |
| Release readiness doc | **None** — gate before joining the signing cluster |
| Migration state | Clean (no `legacy-origin` remote) |
| Audience profile | Calibration / forecasting / rationalist community |
