# Conviction Mapper

## Overview
A local-first Tauri 2 + React + TypeScript desktop app (macOS-first) that renders a user's personal belief system as a living, force-directed graph. Every belief node carries a confidence score (0–100), a structured evidence chain, and a decay curve that dims stale beliefs over time. Zero network calls. All data in SQLite.

## Tech Stack
- Rust: stable (1.78+)
- Tauri: 2.x
- React: 18.x (hooks only, no class components)
- TypeScript: 5.x (strict mode, no `any`)
- Vite: 5.x
- D3.js: 7.x — force simulation + custom SVG rendering
- tauri-plugin-sql: 2.x — SQLite access from Rust
- sqlx: 0.7.x — async SQLite in Rust
- Zustand: 4.x — client state management
- Tailwind CSS: 3.x
- date-fns: 3.x — decay date arithmetic
- lucide-react: latest — icons

## Development Conventions
- TypeScript strict mode — zero `any` types, no implicit returns
- kebab-case for files, PascalCase for React components, camelCase for functions/variables
- Conventional commits — `feat:`, `fix:`, `chore:`, `refactor:`
- D3 must own SVG DOM directly via `useRef` + tick callbacks — never pipe x/y into React state
- All Tauri commands return `Result<T, String>` — handle errors on both Rust and TS sides
- Zustand stores are the single source of truth for UI state — no prop drilling beyond 2 levels
- Unit tests required for all pure functions in `src/lib/` before committing

## Current Phase
**Phase 0: Foundation**
Scaffold Tauri project, SQLite schema, Rust commands stubbed, seed script. No UI.
See IMPLEMENTATION-ROADMAP.md for full phase details and acceptance criteria.

## Key Decisions
| Decision | Choice | Why |
|----------|--------|-----|
| Graph library | D3.js v7, direct DOM | Maximum force simulation control; abstracted libs can't do custom decay animation |
| D3 rendering | D3 owns SVG DOM via useRef | React re-rendering 150 nodes/tick kills WebKit performance |
| State management | Zustand | Lightweight for solo app; no Redux overhead |
| Connection UI | Right-click context menu → click target | Drag-to-connect unreliable with active force simulation |
| Decay formula | Exponential: `0.15 + 0.85 * e^(-ln(2)/half_life * days)` | Brightness floors at 0.15 — nodes dim but never vanish |
| AI features | V2 only | V1 validates core loop without Ollama complexity |
| DB path | `~/Library/Application Support/conviction-mapper/conviction.db` | Standard macOS app support dir |

## Do NOT
- Do not add features not in the current phase of IMPLEMENTATION-ROADMAP.md
- Do not pipe D3 node x/y positions into React state — D3 owns the SVG DOM
- Do not make any network calls — this app is fully local in V1
- Do not use localStorage or sessionStorage — all persistence via SQLite through Tauri commands
- Do not scaffold the entire project in one session — build phase by phase per the roadmap
- Do not set WAL mode in SQL migration — set it in the Rust pool init code as a connection pragma
- Do not add Ollama or any AI integration — that is explicitly V2
