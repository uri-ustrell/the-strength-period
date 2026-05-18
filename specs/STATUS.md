# Implementation Status — The Strength Period

> Last updated: 2026-05-05

## Current Phase: Feature 17 "Progreso Jugable" — In Progress (Visual restyle Phase 1 complete)

> 2026-05-05 — **Feature 17 "Progreso Jugable" rollout (Phase 1 — visual + structural).**
> The Step 16 dual-skin (`classic-boring` + `retro-platformer`) is REVERTED.
> Replaced by a single dark identity: tokens (coral/mint/mustard/violet) on
> `#1e1b2e` bg with `Space Grotesk / Inter / Fira Code`. Routers collapsed
> to single renderers (`DashboardMap`, `SessionExecution`, `EarnAcknowledgement`,
> `TotemInventory`, `ChartThemeProvider`). New primitives shipped: `Card`,
> `Button` (coral pill), `EmptyState`, `ConfettiBurst` (canvas-confetti, no-op
> under `prefers-reduced-motion`), `Dock` (frosted-glass `BottomNav`). Audio
> gate moved from `aestheticVariant` to explicit `audioOptIn` opt-in (default
> `false`) with toggle in Settings. i18n collapsed: `*.retro.*` / `*.calm.*`
> / `appearance.*` keys removed; `settings.audio.*` added; ca/es/en parity
> preserved. Mass restyle of 30+ pages/components from gray/indigo/white
> Tailwind classes to the new semantic tokens. Spec at
> `specs/features/17-progreso-jugable.md`. Build + 91/91 unit + 3/3
> ingestion + i18n parity all green at checkpoint.
>
> 2026-04-30 — Comprehensive code review pass completed across `src/`. 30+ fixes
> applied (date/UTC drift, IDB transaction safety, planning engine deload
> coherency with weekly progression rates, session store retry idempotency,
> rest-timer re-render isolation, weight selector locale-friendly input,
> exercise catalog retry, autoRestrictions deprecation across ingestion).
> See `STATUS_HISTORY.md` for the detailed log.

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
| 16 | Ethical Gamification | 🚧 In Progress | Steps 8, 9, 14 |
| 17 | Formatter + Session Hooks | ✅ | — |
| 18 | Multi-Source Content Ingestion Pipeline | ✅ | Steps 2, 7, 15 |
| 19 | Preset & Session Template Redesign | ✅ | Steps 7, 14, 18 |

## Architecture Notes

- Local-first: IndexedDB for user data, no server-side inference.
- Exercises: pre-built at dev-time via `npm run build:exercises` (raw free-exercise-db → enriched JSON). Client fetches final JSON with zero runtime processing.
- Static data (presets, i18n) bundled in JS — zero serverless cost.
- Export/Import via JSON for data portability.
- Available weights start unselected by default; the first selection per equipment auto-selects inferior weights once, then subsequent interactions are isolated per-weight toggles.
- Step 18 now includes reusable manual LLM chat prompt templates for presets/exercises under `data/ingestion/prompts/`, aligned with ingestion validators.
- Preset batch ingestion now accepts optional i18n payloads, writes preset translations/tags to locale planning files (`ingested_presets`, `preset_tags`) with locale fallback rules, and auto-seeds hardcoded app presets into the ingestion catalog.
- UI presets now render from ingestion preset catalog entries (`data/ingestion/presets/catalog.json`) without hardcoded fallback merges, and exercises load through a dedicated catalog adapter targeting `/exercises/exercises.json`.
- Exercise ingestion `llm-json` path now reuses one loaded payload for both candidate parsing and i18n parsing, validates the prompt i18n contract (`ca/es/en`, localized names, required tag labels) as explicit candidate reasons, and merges names/instructions/tag labels with duplicate-safe canonical i18n refresh using deterministic multi-candidate resolution.
- `scripts/buildExercises.ts` now writes through the shared ingestion exercise catalog path constant to prevent path drift between build output and ingestion merge targets.
- Step 18 ingestion now has focused automated tests (`npm run test:ingestion`) covering deterministic grouped i18n merge precedence and LLM i18n contract-validation edge cases.
- Runtime-generated ingestion report/review-queue artifacts under `data/ingestion/reports/` and `data/ingestion/queues/` are treated as transient outputs, with only `.gitkeep` placeholders tracked.
- Tooling baseline now uses Biome for formatting/linting with repository-wide normalization and session-end auto-format hooks.
- Step 18 review fixes applied: llm-example migrated from exerciseIds to sessions[], Claude inline contract split into generator/faithful examples, validator muscleDistribution check conditional on sessions presence, adapter enforces reps tuple shape, prompt ranges aligned with validator, contracts annotated with sync comments.
- Dependency alignment keeps PWA support stable: `vite` pinned to `^7.3.2` with `@vitejs/plugin-react` at `^5.2.0` to satisfy `vite-plugin-pwa@^1.2.0` peer requirements.

## Architecture Decisions

| # | Decision | Summary |
|---|----------|---------|
| 1 | Remove Server-Side AI | Gemini API removed; deterministic planning + user-owned LLM path |
| 2 | Deterministic Planning | On-device algorithm: anti-repeat, duration constraints, progression rules |
| 3 | User-Owned LLM Assistant | Prompt + CSV template; user pastes JSON; app validates schema |
| 4 | Presets | Built-in + user-saved presets as wizard starting points |
| 5 | Static Data Serving | No serverless endpoints; static CDN only |
| 7 | Pre-Built Exercise Pipeline | Build-time enrichment; client gets final JSON; zero runtime processing |
| 6 | Ethical Gamification | Habit-tied achievements; anti-addictive guardrails; optional patronage |
| 8 | Multi-Source Ingestion | Adapter-based ingestion, canonical transforms, dedup, and media hooks |
| 9 | Exercise-Rich Presets | Presets carry sessions with exercises, sets, reps, rest, tempo; dual engine mode (faithful vs generator); see Feature 14 extension |

> Full rationale in `specs/STATUS_HISTORY.md`

## Planned Steps

### Step 15 — User-Owned LLM Assistant ✅
- [x] Service layer: prompt generation, CSV generation, validation, conversion
- [x] Store: added `setGeneratedPreview` action to planningStore
- [x] Component: LLMAssistant with personal notes, prompt display, CSV download, JSON paste, validation, import
- [x] PlanCreator integration: 'llm-assistant' step, secondary button on configure step
- [x] i18n keys in ca/es/en (planning namespace, nested under `llm`)
- [x] Build verification: zero errors

### Step 16 — Ethical Gamification ⚠️ Phase A–E REVERTED in Feature 17 "Progreso Jugable" (2026-05-05)

> The dual-skin (`classic-boring` + `retro-platformer`) variant routing,
> `aestheticVariant` field, `useEffectiveAestheticVariant` hook,
> `AppearanceSelector`, and all Classic*/Retro* variant renderers have been
> removed in favor of a single dark identity. The shared model contracts
> (`buildDashboardMap`, `buildSessionExecutionModel`, `buildTotemInventoryModel`,
> `buildSessionCompletionTotemPayload`) and the totem catalog **stay** — only
> the dual-renderer routers are gone. Audio gating moved to a new explicit
> `audioOptIn` user setting. See Feature 17 spec for migration details.

#### Step 16 — Ethical Gamification 🚧 In Progress (Pre-execution gates complete) [HISTORICAL]
- Source of truth: `specs/features/16-ethical-gamification.md` (extended 2026-05-04 with Shared Gamification Core + scalable Aesthetic Variants; initial variants `retro-platformer` and `classic-boring`; `classic-boring` default; `prefers-reduced-motion` forces `classic-boring` without overwriting preference).
- [x] Phase 0 — Source-of-truth read & dependency check (Steps 8/9/14 ✅; no contradictions in `tasks/todo.md`)
- [x] Phase 1 — Behavioral risk brief for Phase A (no high-risk mechanics; reduced-motion override mitigated by runtime derivation)
- [x] Phase 2 — UI/UX Integrity Gate: **INCREMENTAL** for Phase A (no IA change; full refactor deferred to Phase B)
- [x] Phase 3 — Mechanic design & event model for Phase A: `UserConfig.aestheticVariant`, default `'classic-boring'`, Settings selector, optional onboarding step, reduced-motion hook, zero new telemetry/IDB
- [x] Phase 4 — Implementation Plan Gate: ordered Phase A checklist (A1–A10) recorded in `tasks/todo.md`
- [x] Phase A implementation (see `tasks/todo.md` → "Step 16 — Phase A") ✅ Complete — Reviewer 2026-05-04 re-review: PASS. All blockers closed (`onboarding:appearance.variant.*` parity, Vitest infra + 3 required tests, `●` badge removed, Skip persists `DEFAULT_AESTHETIC_VARIANT`); shared-core invariants and reduced-motion runtime-only override intact.
- **Phase B (Dashboard parity: World Map + Calendar) — pre-execution gates ✅ (2026-05-04, architect)**
  - [x] Phase 0 — Source-of-truth & dependency check (Phase A complete; spec patched with additive "Phase B Shared Contracts (Dashboard)" subsection covering canonical state model, a11y contract, sub-palette resolution, token namespaces, zero-IDB/zero-telemetry)
  - [x] Phase 1 — Behavioral risk brief (no high-risk; two medium risks mitigated: lock-as-storytelling, muted future cells)
  - [x] Phase 2 — UI/UX Integrity Gate: **INCREMENTAL with shared adapter** (no full refactor; one shared `buildDashboardMap` + two thin variant renderers selected via `useEffectiveAestheticVariant()`)
  - [x] Phase 3 — Mechanic design: `DashboardMapModel`, `<DashboardMap>` contract, `theme.dashboard.*` tokens, shared a11y contract, i18n surface defined; zero new IDB / zero new telemetry confirmed
  - [x] Phase 4 — Implementation plan gate: B1–B11 ordered checklist with ACs in `tasks/todo.md`, both variants in parity at every step
  - [x] Phase B implementation (B1–B11) ✅ Complete — Reviewer 2026-05-04: PASS WITH MINOR; warnings addressed 2026-05-04 (see `specs/STATUS_HISTORY.md` → "2026-05-04 — Step 16 Phase B warning fixes"). Shared `buildDashboardMap` selector + `RetroWorldMap`/`ClassicCalendar` ship together off the same model; zero new IDB / zero new telemetry preserved.
- **Phase C (Session Execution parity: Retro Level Run + Classic Cards) — pre-execution gates ✅ (2026-05-04, architect)**
  - [x] Phase 0 — Source-of-truth & dependency check (Phase A/B complete; spec patched with additive "Phase C Shared Contracts (Session Execution)" subsection covering canonical per-set state model, HUD contract, rest-timer contract, completion-frame contract, a11y contract, token namespaces, audio gating contract, zero-IDB/zero-telemetry)
  - [x] Phase 1 — Behavioral risk brief (no high-risk; medium risks mitigated: rest-timer no-urgency, completion-frame separation, skip-not-shame, audio gating)
  - [x] Phase 2 — UI/UX Integrity Gate: **INCREMENTAL with shared adapter** (Session.tsx IA preserved; one shared `buildSessionExecutionModel` selector + `<SessionExecution>` router + `<RetroLevelRun>`/`<ClassicSessionCards>` renderers selected via `useEffectiveAestheticVariant()`)
  - [x] Phase 3 — Mechanic design: `SessionExecutionModel`, `<SessionExecution>` contract, `theme.session.*` tokens, shared a11y contract, i18n surface defined; audio gating contract; zero new IDB / zero new telemetry confirmed
  - [x] Phase 4 — Implementation plan gate: C1–C12 ordered checklist with ACs in `tasks/todo.md`, both variants in parity at every step
  - [x] Phase C implementation (C1–C12) ✅ Complete — Implementer 2026-05-04 (see `specs/STATUS_HISTORY.md` → "2026-05-04 — Step 16 Phase C implementation"). Shared `buildSessionExecutionModel` selector + `<SessionExecution>` router + `RetroLevelRun`/`ClassicSessionCards` renderers ship together off the same model; zero new IDB / zero new telemetry preserved; cross-variant parity test in place.
- **Phase D (Stats / Inventory parity: Retro Inventory Shelf + Classic Totem Grid) — pre-execution gates ✅ (2026-05-04, architect)**
  - [x] Phase 0 — Source-of-truth & dependency check (Phase A/B/C complete; spec patched with additive "Phase D Shared Contracts (Stats / Inventory)" subsection covering scope lock, canonical totem model, v1 totem catalog (8 deterministic totems), forbidden renderings, a11y contract, token namespaces, i18n surface, audio gating, deferred-to-Phase-E totem list, zero-IDB/zero-telemetry)
  - [x] Phase 1 — Behavioral risk brief (no high-risk; six medium risks mitigated: no locked silhouettes, no streak pressure, no peer comparison, calm empty-state, deterministic rules with visible rule text, retro inspect chime opt-in single-fire)
  - [x] Phase 2 — UI/UX Integrity Gate: **INCREMENTAL with shared adapter** (Stats.tsx IA preserved; existing analytics sections out of scope; one shared `buildTotemInventoryModel` selector + `<TotemInventory>` router + `<RetroInventoryShelf>`/`<ClassicTotemGrid>` renderers selected via `useEffectiveAestheticVariant()`)
  - [x] Phase 3 — Mechanic design: `TotemInventoryModel`, `<TotemInventory>` contract, `theme.stats.*` tokens (+ retro-only `theme.game.stats.*`), shared a11y contract (non-modal inline inspect disclosure), i18n surface under `stats:totem.*` defined; audio gating contract via `statsAudio`; v1 catalog of 8 totems locked; zero new IDB / zero new telemetry confirmed
  - [x] Phase 4 — Implementation plan gate: D1–D11 ordered checklist with ACs in `tasks/todo.md`, both variants in parity at every step
  - [x] Phase D implementation (D1–D11) ✅ Complete — Implementer 2026-05-04 (see `specs/STATUS_HISTORY.md` → "2026-05-04 — Step 16 Phase D implementation"). Shared `buildTotemInventoryModel` selector + `<TotemInventory>` router + `RetroInventoryShelf`/`ClassicTotemGrid` renderers ship together off the same model; zero new IDB / zero new telemetry preserved; cross-variant parity test in place.
- **Phase E (Final polish + deferred totems: earn-ack frame, Rive microanims, chart variant theming, deferred totems by family) — pre-execution gates ✅ (2026-05-04, architect)**
  - [x] Phase 0 — Source-of-truth & dependency check (Phase A/B/C/D complete; spec patched: Phase D chart scope-lock lifted, "zero new IDB stores" constraint scoped to Phase A–D, additive "Phase E Shared Contracts (Polish + Deferred Totems)" subsection appended covering E1 earn-ack contract, E2 Rive wrapper + license manifest, E3 chart theming wrapper, E4 deferred-totem families with v1→v2 IDB migration baseline + `TOTEM_CATALOG_V2`)
  - [x] Phase 1 — Behavioral risk brief (two high-risk items mitigated: E2 motion-sickness/license → wrapper short-circuit + mandatory `*.LICENSE.md`; E4b shame-on-pain-flag → totem rewards act-of-flagging, no pain copy, no aggregated pain history; medium risks per sub-phase mitigated)
  - [x] Phase 2 — UI/UX Integrity Gate: **INCREMENTAL with shared adapter** for all sub-phases (E1 extends `SessionCompletionModel`; E2 single `<RiveAnim>` wrapper retro-only lazy-loaded; E3 `<ChartThemeProvider>` wraps existing chart components without fork; E4 grows `TOTEM_CATALOG_V2` additively + per-family local capture UIs)
  - [x] Phase 3 — Mechanic design: contracts for `SessionCompletionTotemPayload`, `<EarnAcknowledgement>`, `<RiveAnim>`, `<ChartThemeProvider>`, `--theme-charts-*` / `--theme-game-charts-*` namespaces, schema migration baseline (IDB v1→v2 additive + export format v1→v2 backward-compat), per-family evaluator signatures + i18n keys
  - [x] Phase 4 — Implementation plan gate: ordered Phase E sub-phase checklist (E4g → E1 → E3 → E4a → E4f → E4b → E4c → E4d → E2; E4e moves to Phase F) recorded in `tasks/todo.md` with per-sub-phase mini-gate / implementer / reviewer cycles
  - [x] E4g — Deload-family expansion (`five-deloads-honored`) — evaluator-only, ship first
  - [x] E1 — Earn-acknowledgement frame
  - [x] E3 — Chart variant theming (`VolumeChart`, `ProgressionChart`, `AdherenceChart`)
  - [x] E4a — Warm-Up family (`warm-up-habit`, `triple-preparation`)
  - [x] E4f — Rest-day family (`first-rest-day-honored`)
  - [ ] E4b — Pain-flag family (`pain-signal-respected`)
  - [ ] E4c — Notes family (`first-note`, `consistent-logger`)
  - [ ] E4d — Planning audit-trail family (`honest-check-in`, `measured-step`) — adds `planningAuditLog` IDB store
  - [ ] E2 — Rive microanims (`@rive-app/react-canvas` ~210KB lazy retro chunk)
- **Phase F (Volume-based Recovery Indicator) — prerequisite for E4e (`recovery-read` totem) — pre-execution gates pending**
  - Recovery indicator does NOT exist in `src/` (verified 2026-05-04 by grep `recoveryIndicator|recoveryState|RecoveryState|recoveryHint` → 0 matches). Phase F implements the spec section §"Volume-Based Recovery Estimation" (selector, advisory surfacing on planning + dashboard, transparency doc, capture event). Once Phase F lands, **E4e (`recovery-read`)** ships as part of Phase F.
- Phase E parity decision (2026-05-04): **strict parity from day one** for E1, E3, and E4 inspect-panel rendering of new totems. E2 is intentionally retro-only (classic-boring is silent + still + AA-safe by design); the `<RiveAnim>` wrapper enforces fallback for classic and reduced-motion users.
- Phase B parity decision (2026-05-04): **strict parity from day one** — every Phase B+ surface ships `retro-platformer` and `classic-boring` together; no temporary single-variant releases.
- Phase C parity decision (2026-05-04): **strict parity from day one** — `RetroLevelRun` and `ClassicSessionCards` ship together off the same `SessionExecutionModel`; no temporary single-variant releases.
- Phase D parity decision (2026-05-04): **strict parity from day one** — `RetroInventoryShelf` and `ClassicTotemGrid` ship together off the same `TotemInventoryModel`; no temporary single-variant releases. Existing quantitative analytics in `Stats.tsx` remain variant-agnostic in Phase D.

### Step 19 — Preset & Session Template Redesign ✅ (spec: `specs/features/17-preset-sessions-redesign.md`)
- [x] Read `specs/features/17-preset-sessions-redesign.md` end-to-end before starting
- [x] Type changes: `TemplateKey`, `WeekProgressionRate`, updated `PresetSessionTemplate` (add `templateKey`+`name`, remove `label?`), `initialLoadKg` on `PresetExerciseEntry`
- [x] Add `weeklyProgressionRates` to `CustomPreset` and `Preset` interfaces in `src/data/presets.ts`
- [x] Planning engine: `resolveWeekMultiplier` helper; thread `weeklyProgressionRates`; use `initialLoadKg` as base weight in faithful mode
- [x] Create `WeekProgressionTable` component (`src/components/planning/WeekProgressionTable.tsx`)
- [x] `PlanCreator.tsx`: remove "Custom" grid card; A/B/C/D normalisation in `handleCreateFromScratch` and `handleSelectCustomPreset`; replace `weeklyProgression` slider with `WeekProgressionTable`
- [x] `FaithfulExercisesStep.tsx`: A/B/C/D tabs; template rename field; copy-to mechanic; `initialLoadKg` input per exercise
- [x] i18n: add new keys to ca/es/en; remove `planning:custom` and `planning:custom_desc`
- [x] Update `specs/DATA_MODEL.md` with new and changed types
- [x] Build verification: `npm run build` zero errors
- [x] Auto-fork built-in presets → CustomPreset on "Save as preset" with required inline name field
- [x] Legacy `weeklyProgression` write-back migration on first IndexedDB load
- [x] Unsaved-changes confirmation guard for built-in working copies
- [x] QA Pass / UX Refinements (Round 2) — see `specs/features/17-preset-sessions-redesign.md`
  - [x] QA-5: `Equipment` enum extended; `'pilates'` removed; `EquipmentChipSelector` + `equipmentCatalog`
  - [x] QA-6: `activeRestrictions` removed from `UserConfig`, store, onboarding, settings, `exerciseFilter`, `llmAssistantService`
  - [x] Build green after QA fix-up (`npm run build`, `npm run lint`)
  - [x] QA-1: `WeekProgressionTable` long-description copy + tooltip + verified `resolveWeekMultiplier` cumulative semantics
  - [x] QA-2: translated blocking save errors via `validatePresetExercises` (PlanCreator + planningStore.saveGenerated)
  - [x] QA-3: wizard step reorder (preset → exercises → configure → preview); Next-disabled gating via `templatesComplete`
  - [x] QA-4: `PresetPreviewModal` wired into `PlanCreator` with "Comença ara" / "Personalitza" CTAs (focus trap, ESC, backdrop click)
  - [x] QA-5: i18n keys for new equipment values (`onboarding:equipment.*`, `equipment_category_*`, `equipment_show_more/less`) in ca/es/en
  - [x] QA-7: faithful-only preset path; generator/muscles step removed from preset flow; empty-state on FaithfulExercisesStep
  - [x] Polish: sparkline aria-label i18n; chip 44px tap target + aria-pressed; preview 2-col on `lg:`; templatesComplete gate
  - [ ] Faithful regeneration of `data/ingestion/presets/catalog.json`
- [ ] Run pre-execution decision gate; if guardrails cannot be met cleanly, allow and recommend full UI/UX refactor first
- [ ] Define anti-addictive guardrails as acceptance criteria
- [ ] Design achievement system tied to sustainable habits
- [ ] Implement milestones (consistency, deload compliance, warm-up, injury-safe progression)
- [ ] Streak recovery safeguards (grace period, no punishment)
- [ ] Optional patronage UI (tip jar / supporter badge, non-pressuring copy)
- [ ] Validate every mechanic against guardrails before shipping

### Step 17 — Formatter + Session Hooks
- [x] Evaluate and configure Biome as project formatter/linter
- [x] Add format-on-save and Biome settings to `.vscode/settings.json`
- [x] Create `.agents/hooks/hooks.json` with session-end auto-format hook
- [x] Run formatter on entire codebase for initial normalization
- [x] Document formatting conventions in `specs/CONVENTIONS.md`
- [x] Build verification: `npm run build` passes with zero errors

### Step 18 — Multi-Source Content Ingestion Pipeline ✅
- [x] Define canonical contracts for ingestion candidates and outputs (exercise, preset, ingestion report)
- [x] Build source-adapter architecture for multiple providers (external APIs, LLM JSON outputs)
- [x] Implement normalization + schema validation to map source payloads into canonical exercise/preset structures
- [x] Add robust dedup strategy before merge (source IDs, slug collisions, title/muscle similarity, alias map)
- [x] Add review gates for low-confidence items (reject/accept queue) before appending to source-of-truth datasets
- [x] Build Node pipeline for exercise photos with free-tier-first provider abstraction (use Nanobanana only when free tier is available; otherwise auto-select best free provider such as Pollinations/Hugging Face)
- [x] Provide a style reference image in photo-generation prompts so all exercise images follow the same visual language
- [x] Lock photo generation to one single model per catalog generation cycle to ensure consistent style across all exercises
- [x] Support image generation modes: full recursive regen, only missing photos, single exercise, and ingestion-driven incremental mode
- [x] Wire ingestion success path to trigger photo generation for each newly accepted exercise
- [x] Build Node preset-batch generator using Claude API (free-tier-first), with prompt-in → validated preset JSON out constrained to available exercises
- [x] Load `.env` in ingestion CLI entrypoints (`ingest`, `photos`, `presets`) via `dotenv/config` so API keys are available when running npm scripts
- [x] Emit ingestion reports with accepted/skipped/duplicate/rejected counts and reasons; include dry-run and rollback-safe workflow
- [x] Validate legal/licensing metadata per source before merge (attribution, allowed usage, provenance)
- [x] Add focused automated tests for grouped i18n merge precedence and LLM i18n contract validation
- [x] Keep runtime-generated report/queue artifacts cleaned before commit (track only static placeholders)

## Active Known Issues

- `trx` Equipment type has 0 exercises in raw data (candidate for future cleanup)
- `by-active` boolean index in IndexedDB unused (harmless; removing requires DB migration)

## Code Review Fixes (2025-07-16)

### Completed
- [x] Restored `baseUrl` in tsconfig files (required by `paths` alias)
- [x] Removed unnecessary `useCallback` wrappers in `useDB.ts`
- [x] Added `response.ok` check in `exerciseLoader.ts` fetch
- [x] Fixed misleading `useMemo` dependency in `SessionPreStart.tsx`
- [x] Fixed critical `mesocycleId` bug in `sessionStore.ts` — sessions are now correctly marked complete
- [x] Removed unused `exercises` prop from `LLMAssistant`
- [x] Extracted Dashboard helpers → `src/utils/dateHelpers.ts`
- [x] Extracted PlanCreator utilities → `src/services/planning/muscleDistribution.ts`
- [x] Extracted Stats aggregations → `src/services/stats/statsAggregation.ts`
- [x] Extracted sessionStore navigation → `src/services/session/sessionNavigation.ts`
- [x] Synced `specs/DATA_MODEL.md` with actual `UserConfig` type
- [x] Build verification: zero errors
