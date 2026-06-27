# Security Remediation - 2026-06-20

Status: local remediation complete; release not yet eligible.

## Findings addressed

GitHub Dependabot intake showed npm critical/high findings for Vitest/Vite and
additional npm/Rust findings in the lockfiles.

Local remediation:

- Kept `vitest` at `3.2.6` and `vite` at `7.3.5`.
- Updated `postcss` to `8.5.15`.
- Added an npm override for `esbuild` `0.28.1`.
- Updated the npm lockfile.
- Updated Tauri/Rust lockfile dependencies.
- Narrowed SQLx to SQLite-only features:
  - `default-features = false`
  - `sqlite`
  - `runtime-tokio`
  - `macros`

The SQLx feature change removes unused MySQL/Postgres dependency surface and
the transitive `rsa` advisory from this app, which only uses SQLite.

## Validation

Passed:

```bash
npm audit --json
npm run build
npm run test:run
cargo audit --file src-tauri/Cargo.lock --json
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

`npm audit` reported zero vulnerabilities.

`cargo audit` reported zero vulnerabilities. It still reported informational
unmaintained/unsound warnings from Tauri's Linux GTK dependency graph. These
must be reviewed before any Linux release artifact is included. The current
release lane for ConvictionMapper remains macOS DMG.

## Release blockers remaining

- Branch is ahead of origin.
- `tsconfig.json` had pre-existing local changes and was not touched here.
- GitHub Dependabot alerts will remain open until these local changes are
  pushed and GitHub re-evaluates the dependency graph.
- No artifact, receipt, notarization, install smoke, or portfolio update exists
  yet.
