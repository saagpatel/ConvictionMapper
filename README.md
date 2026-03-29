![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white) ![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black) ![Rust](https://img.shields.io/badge/Rust-1.70+-DEA584?logo=rust&logoColor=white) ![SQLite](https://img.shields.io/badge/SQLite-local--first-003B57?logo=sqlite&logoColor=white) ![License](https://img.shields.io/badge/license-unlicensed-lightgrey)

# Conviction Mapper

A local-first desktop app for mapping and tracking your beliefs as an interactive force-directed graph. Each belief carries a confidence score, a domain tag, and an evidence trail — and every belief slowly dims over time if you don't revisit it, reflecting how conviction decays without reinforcement.

You can link beliefs together (supports, contradicts, depends on, related), attach evidence items with sourced references, and make falsifiable predictions tied to specific beliefs. A calibration dashboard scores your prediction accuracy over time using the Brier scoring method, helping you identify where your confidence is well-founded versus overconfident.

<!-- TODO: Add screenshot -->

## What It Does

- **Belief graph** — create, edit, and connect beliefs on a D3 force-directed canvas or switch to a flat list view
- **Confidence decay** — each belief has a configurable half-life; nodes visually fade if not touched recently
- **Evidence tracking** — attach observations, data points, arguments, authority references, or personal experience to any belief
- **Prediction tracking** — make dated, falsifiable predictions tied to beliefs and resolve them as correct / incorrect / voided
- **Calibration stats** — Brier score, accuracy by confidence bucket, and per-domain breakdown to measure how well-calibrated your confidence levels are
- **Import / export** — SQLite database backup and restore via native file dialog

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 |
| Frontend | React 19, TypeScript 5.8, Vite 7 |
| Styling | Tailwind CSS 3, DM Sans variable font |
| Graph rendering | D3 7 (force simulation) |
| State management | Zustand 5 |
| Backend / persistence | Rust, SQLite via sqlx 0.8 |
| Date utilities | date-fns 4 |

## Prerequisites

- **Node.js** 18 or later
- **Rust** 1.70 or later (install via [rustup](https://rustup.rs))
- **Tauri CLI** — installed automatically as a dev dependency via `npm`
- **System Tauri dependencies** — follow the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for your OS (WebView2 on Windows, webkit2gtk on Linux, Xcode CLI on macOS)

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd ConvictionMapper

# Install frontend dependencies
npm install

# Start the app in development mode (Vite dev server + Tauri window)
npm run tauri dev

# Build a production binary
npm run tauri build
```

Run the test suite:

```bash
npm run test:run
```

## Project Structure

```
ConvictionMapper/
├── src/                        # React frontend
│   ├── components/
│   │   ├── beliefs/            # Belief create/edit panels
│   │   ├── command-palette/    # Keyboard-driven command palette
│   │   ├── graph/              # D3 force-graph canvas components
│   │   ├── layout/             # App shell and navigation
│   │   ├── onboarding/         # First-run walkthrough
│   │   ├── predictions/        # Prediction list and calibration views
│   │   ├── settings/           # App settings panel
│   │   └── shared/             # Reusable UI primitives
│   ├── hooks/                  # use-force-graph custom hook
│   ├── lib/                    # Pure logic: decay, calibration, graph layout
│   ├── store/                  # Zustand stores (beliefs, settings, UI)
│   ├── types/                  # Shared TypeScript types
│   └── views/                  # Page-level components (GraphViewPage, ListViewPage)
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── commands/           # Tauri IPC command handlers
│   │   ├── db/                 # SQLite schema and migrations
│   │   ├── models/             # Rust data models
│   │   └── lib.rs              # Tauri app setup
│   └── tauri.conf.json         # App configuration
├── index.html
├── package.json
└── vite.config.ts
```

## License

No license file is present in this repository. All rights reserved by the author unless otherwise stated.
