# Conviction Mapper

[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript)](#) [![Rust](https://img.shields.io/badge/Rust-dea584?style=flat-square&logo=rust)](#) [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

> Your beliefs decay if you don't revisit them. This makes that visible.

Conviction Mapper is a local-first desktop app for mapping and tracking beliefs as an interactive force-directed graph. Each belief carries a confidence score, a domain tag, an evidence trail, and a configurable half-life — nodes visually fade over time if you don't revisit them. You can link beliefs together (supports, contradicts, depends on, related), attach evidence items, and make dated falsifiable predictions. A calibration dashboard scores your prediction accuracy using the Brier method.

## Features

- **Force-directed belief graph** — interactive D3 SVG with zoom, drag, and relationship edges; switch to flat list view anytime
- **Confidence decay** — each belief has a configurable half-life; nodes visually fade without regular reinforcement
- **Evidence tracking** — attach observations, data points, arguments, authority references, or personal experience to any belief
- **Belief relationships** — link beliefs as supports, contradicts, depends on, or related
- **Prediction tracking** — make dated, falsifiable predictions tied to specific beliefs; resolve as correct, incorrect, or voided
- **Calibration dashboard** — Brier score, accuracy by confidence bucket, and per-domain breakdown to measure how well-calibrated you actually are
- **Import / export** — SQLite database file copy; export uses a dated filename relative to the process working directory, and import takes a pasted file path

## Quick Start

### Prerequisites

- Node.js 24.x or 26+ (matching the locked Vitest engine range)
- Current stable Rust toolchain (`rustup`) compatible with the committed `Cargo.lock`
- Tauri system dependencies: [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/)

### Installation

```bash
git clone https://github.com/saagpatel/ConvictionMapper
cd ConvictionMapper
npm ci
```

### Usage

```bash
# Start in development mode
npm run tauri dev

# Build release binary
npm run tauri build
```

## Verification

Run from the repository root with Node 24.x or 26+ and the committed npm lockfile:

```bash
npm ci
npm run test:run -- src/lib/decay.test.ts  # focused pure confidence-decay tests
npm run test:run                         # all frontend domain tests; exits once
npm run build                            # TypeScript checking and Vite build
```

`npm test` enters watch mode. CI uses `npm ci`, `npm run build`, and
`npm run test:run`; the Makefile delegates to those npm commands. No dedicated
lint or format script is configured.

For native changes, install the platform's Tauri prerequisites and run:

```bash
cargo check --locked --manifest-path src-tauri/Cargo.toml
```

These checks do not launch the desktop app or open its personal SQLite database.
For static onboarding/layout changes, `npm run dev -- --host 127.0.0.1` provides
a browser preview. It has no Tauri backend: onboarding completion and the graph,
list, settings, and prediction flows require Rust commands and are not reachable
in that preview. Check those changed UI flows with `npm run tauri dev` in a
disposable OS account using synthetic beliefs. Importing or restoring a personal
database is not a verification step. No automated browser suite is configured.
Record unexercised native or human behavior separately.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Tauri 2 |
| Frontend | React 19, TypeScript 5.8, Vite 8, Tailwind CSS 4 |
| Graph rendering | D3 v7 (force simulation) |
| State | Zustand 5 |
| Backend | Rust, SQLite via `sqlx` 0.9 |
| Date utilities | date-fns 4 |

## Architecture

Belief and prediction state lives in SQLite, managed by the Rust backend via `sqlx`. Confidence decay is computed in the TypeScript frontend — `computeDecayBrightness()` runs against the `last_touched` timestamp returned from Rust when graph nodes are initialized or their data is refreshed; elapsed time alone does not refresh graph brightness. The D3 force simulation runs entirely in the React frontend, subscribing to belief data from the Rust layer via Tauri commands. Calibration statistics (Brier score, bucket accuracy) are aggregated in Rust over resolved, non-voided predictions.

## License

MIT — see [LICENSE](LICENSE)
