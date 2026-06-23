# Implementation Status — The Strength Period

> **How to read these docs.** This file is a quick-scan **snapshot** of the
> *current* state only: phase, step table, architecture facts, known gaps,
> links. Dated narrative, per-phase logs, and decision rationale live in
> `specs/STATUS_HISTORY.md`. The live work backlog (with implementation notes
> and acceptance criteria) lives in `tasks/todo.md`. When a feature ships,
> update this snapshot and archive its log to `STATUS_HISTORY.md` in the same
> change.

> Last updated: 2026-06-23

## Current Phase

**Feature 17 "Progreso Jugable" — shipped** (single dark identity; the Step 16
dual-skin was reverted). The app now runs one renderer per surface
(`DashboardMap`, `SessionExecution`, `EarnAcknowledgement`, `TotemInventory`,
`ChartThemeProvider`) on coral/mint/mustard/violet tokens over `#1e1b2e`. Audio
is an explicit `audioOptIn` opt-in (default `false`).

Active work is the **Quality, Architecture & Usability** backlog (from the
2026-06-01 audit) tracked in `tasks/todo.md`:

- **P1 — quality gates:** ✅ done (i18n duplicate detection, Biome in the lint
  gate + CI, no non-null assertions, exhaustive-deps effects, mechanical lint).
- **P2 — architecture/perf:** ✅ done (route code-splitting, root ErrorBoundary,
  `PlanCreator` refactor, shared Zod schema validation, task-history comment
  cleanup).
- **P3 — docs/a11y/hardening:** in progress (this doc trim, README refresh,
  a11y pass, durable rate limiting, PWA/offline verification).

## Steps Overview

| Step | Name | Status | Dependencies |
|------|------|--------|-------------|
| 1 | Scaffold + Specs | ✅ | — |
| 2 | Exercises + Enrichment | ✅ | Step 1 |
| 4 | IndexedDB Persistence | ✅ | Step 1 |
| 5 | Onboarding | ✅ | Steps 2, 4 |
| 6 | Session Engine | ✅ | Step 2 |
| 7 | Planning Engine | ✅ | Step 2 |
| 8 | Execution Mode | ✅ | Steps 4, 6, 7 |
| 9 | Dashboard + Stats | ✅ | Steps 4, 7, 8 |
| 10 | Polish + PWA + Export/Import | ✅ | All above |
| 11 | Local API Mock for Dev | ✅ | Step 7 |
| 12 | Git Flow + GitHub Push | ✅ | — |
| 13 | Static Data API | ❌ Reverted | — |
| 14 | Deterministic Planning | ✅ | Steps 2, 4 |
| 15 | User-Owned LLM Assistant | ✅ | Step 14 |
| 16 | Ethical Gamification | ↩︎ Reverted → superseded by Feature 17 | Steps 8, 9, 14 |
| 17 | Formatter + Session Hooks | ✅ | — |
| 18 | Multi-Source Content Ingestion Pipeline | ✅ | Steps 2, 7, 15 |
| 19 | Preset & Session Template Redesign | ✅ | Steps 7, 14, 18 |
| F17 | "Progreso Jugable" single-skin redesign | ✅ Shipped | Step 16 |

> Per-step completion logs and the full Step 16 phase A–E history are in
> `specs/STATUS_HISTORY.md`.

## Architecture Notes

- Local-first: IndexedDB for user data, no server-side inference.
- Exercises: pre-built at dev-time via `npm run build:exercises` (raw free-exercise-db → enriched JSON). Client fetches final JSON with zero runtime processing.
- Static data (presets, i18n) bundled in JS — zero serverless cost.
- Export/Import via JSON for data portability (export format v2: adds optional `ExecutedSet.isWarmup` + `SessionTemplate.isPlannedRestDay`; imports v1 and v2).
- Available weights start unselected by default; the first selection per equipment auto-selects inferior weights once, then subsequent interactions are isolated per-weight toggles.
- Ingestion includes reusable manual LLM chat prompt templates for presets/exercises under `data/ingestion/prompts/`, aligned with ingestion validators.
- Preset batch ingestion accepts optional i18n payloads, writes preset translations/tags to locale planning files (`ingested_presets`, `preset_tags`) with locale fallback rules, and auto-seeds hardcoded app presets into the ingestion catalog.
- UI presets render from the ingestion preset catalog (`data/ingestion/presets/catalog.json`) without hardcoded fallback merges; exercises load through a catalog adapter targeting `/exercises/exercises.json`.
- `scripts/buildExercises.ts` writes through the shared ingestion exercise catalog path constant to prevent path drift between build output and ingestion merge targets.
- Ingestion has focused automated tests (`npm run test:ingestion`) covering deterministic grouped i18n merge precedence and LLM i18n contract-validation edge cases.
- Runtime-generated ingestion report/review-queue artifacts under `data/ingestion/reports/` and `data/ingestion/queues/` are transient; only `.gitkeep` placeholders are tracked.
- Tooling baseline: Biome for formatting/linting with repository-wide normalization and session-end auto-format hooks; `npm run lint` runs Biome + `tsc`, gated in CI.
- Routes are code-split via `React.lazy` + Vite `manualChunks` (`react-vendor`, `recharts`, `i18n`); a root `ErrorBoundary` provides reload + data-export recovery.
- LLM plan responses are validated at both trust boundaries with shared Zod schemas (`src/types/planSchema.ts`).
- Dependency alignment keeps PWA support stable: `vite` pinned to `^7.3.2` with `@vitejs/plugin-react` at `^5.2.0` to satisfy `vite-plugin-pwa@^1.2.0` peer requirements.

## Architecture Decisions

| # | Decision | Summary |
|---|----------|---------|
| 1 | Remove Server-Side AI | Gemini API removed; deterministic planning + user-owned LLM path |
| 2 | Deterministic Planning | On-device algorithm: anti-repeat, duration constraints, progression rules |
| 3 | User-Owned LLM Assistant | Prompt + CSV template; user pastes JSON; app validates schema |
| 4 | Presets | Built-in + user-saved presets as wizard starting points |
| 5 | Static Data Serving | No serverless endpoints; static CDN only |
| 6 | Ethical Gamification | Habit-tied achievements; anti-addictive guardrails; optional patronage |
| 7 | Pre-Built Exercise Pipeline | Build-time enrichment; client gets final JSON; zero runtime processing |
| 8 | Multi-Source Ingestion | Adapter-based ingestion, canonical transforms, dedup, and media hooks |
| 9 | Exercise-Rich Presets | Presets carry sessions with exercises, sets, reps, rest, tempo; dual engine mode (faithful vs generator) |

> Full rationale in `specs/STATUS_HISTORY.md` → "Architecture Decisions — Full Rationale".

## Active Known Issues

- `trx` Equipment type has 0 exercises in raw data (candidate for future cleanup).
- `by-active` boolean index in IndexedDB unused (harmless; removing requires DB migration).
- Faithful regeneration of `data/ingestion/presets/catalog.json` still pending (Step 19 tail).
- `api/generate-plan.ts` rate limiting is in-memory per cold-start (best-effort only; see `tasks/todo.md` #15).

## Links

- Backlog: `tasks/todo.md`
- History: `specs/STATUS_HISTORY.md`
- Conventions: `specs/CONVENTIONS.md`
- Data model: `specs/DATA_MODEL.md`
- Feature specs: `specs/features/`
