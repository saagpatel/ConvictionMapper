# Conviction Mapper

Local-first Tauri 2 + React + TypeScript desktop app (macOS-first) — renders a personal belief system as a force-directed graph. Confidence scores (0–100), evidence chains, and decay curves. Zero network calls; all data in SQLite.

## Stack

- Rust: stable (1.78+), Tauri 2.x
- React 19.x (hooks only), TypeScript 5.x strict, Vite 7.x
- D3.js 7.x — force simulation + custom SVG rendering
- sqlx 0.8 — async SQLite in Rust (no tauri-plugin-sql)
- Zustand 5.x, Tailwind CSS 3.x, date-fns 4.x, lucide-react

## Build / Run

```bash
npm run tauri dev    # development
npm run tauri build  # release binary
```

## Architecture & Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Graph library | D3.js v7, direct DOM | Maximum force simulation control; abstracted libs can't do custom decay animation |
| D3 rendering | D3 owns SVG DOM via useRef | React re-rendering 150 nodes/tick kills WebKit performance |
| State management | Zustand | Lightweight for solo app; no Redux overhead |
| Connection UI | Right-click context menu → click target | Drag-to-connect unreliable with active force simulation |
| Decay formula | Exponential: `0.15 + 0.85 * e^(-ln(2)/half_life * days)` | Brightness floors at 0.15 — nodes dim but never vanish |
| DB path | `~/Library/Application Support/conviction-mapper/conviction.db` | Standard macOS app support dir |

## Conventions

- TypeScript strict — use `unknown` + narrowing; zero `any`
- kebab-case files, PascalCase components, camelCase functions/variables
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- D3 owns SVG DOM directly via `useRef` + tick callbacks — pipe x/y into React state breaks WebKit at 150 nodes/tick
- All Tauri commands return `Result<T, String>` — handle errors on both Rust and TS sides
- Persistence via SQLite through Tauri commands only — localStorage/sessionStorage are bypassed
- WAL mode belongs in Rust pool init as a connection pragma, not in SQL migrations
- Unit tests cover all pure functions in `src/lib/` before commit

## Scope

V1 + V2 complete (phases 0–3). Phase scope lives in IMPLEMENTATION-ROADMAP.md — stay within the current phase; new features go through the roadmap before implementation. V2 added prediction tracking + calibration dashboard (Brier score, per-confidence-bucket accuracy, per-domain breakdown). AI/Ollama integration is a V3 concern.

<!-- portfolio-context:start -->
# Portfolio Context

## What This Project Is

A local-first Tauri 2 + React + TypeScript desktop app (macOS-first) that renders a user's personal belief system as a living, force-directed graph. Every belief node carries a confidence score (0–100), a structured evidence chain, and a decay curve that dims stale beliefs over time. Zero network calls. All data in SQLite.

## Current State

**V1 + V2 complete.** All phases (0–3) shipped. V2 adds prediction tracking and a calibration dashboard (Brier score, per-confidence-bucket accuracy, per-domain breakdown). See IMPLEMENTATION-ROADMAP.md for the full phase breakdown.

## Stack

- Rust: stable (1.78+)
- Tauri: 2.x
- React: 19.x (hooks only, no class components)
- TypeScript: 5.x (strict mode, no `any`)
- Vite: 7.x
- D3.js: 7.x — force simulation + custom SVG rendering
- sqlx: 0.8 — async SQLite in Rust (used directly; no tauri-plugin-sql)
- Zustand: 5.x — client state management
- Tailwind CSS: 3.x
- date-fns: 4.x — decay date arithmetic
- lucide-react: latest — icons

## How To Run

```bash
# Start in development mode
npm run tauri dev

# Build release binary
npm run tauri build
```

## Known Risks

- Do not add features not in the current phase of IMPLEMENTATION-ROADMAP.md
- Do not pipe D3 node x/y positions into React state — D3 owns the SVG DOM
- Do not make any network calls — this app is fully local in V1
- Do not use localStorage or sessionStorage — all persistence via SQLite through Tauri commands
- Do not scaffold the entire project in one session — build phase by phase per the roadmap
- Do not set WAL mode in SQL migration — set it in the Rust pool init code as a connection pragma
- Do not add Ollama or any AI integration — that is explicitly V2

## Next Recommended Move

Use this context plus the README and supporting docs to resume the next active task, then promote the repo beyond minimum-viable by capturing a dedicated handoff, roadmap, or discovery artifact.

<!-- portfolio-context:end -->
