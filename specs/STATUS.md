# Implementation Status — The Strength Period

> Last updated: 2026-04-09

## Current Phase: Step 18 Complete — Step 16 Planned

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
| 16 | Ethical Gamification | 🚧 Planned | Steps 8, 9, 14 |
| 17 | Formatter + Session Hooks | ✅ | — |
| 18 | Multi-Source Content Ingestion Pipeline | ✅ | Steps 2, 7, 15 |

## Architecture Notes

- Local-first: IndexedDB for user data, no server-side inference.
- Exercises: pre-built at dev-time via `npm run build:exercises` (raw free-exercise-db → enriched JSON). Client fetches final JSON with zero runtime processing.
- Static data (presets, i18n) bundled in JS — zero serverless cost.
- Export/Import via JSON for data portability.
- Available weights start unselected by default; the first selection per equipment auto-selects inferior weights once, then subsequent interactions are isolated per-weight toggles.
- Tooling baseline now uses Biome for formatting/linting with repository-wide normalization and session-end auto-format hooks.

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

> Full rationale in `specs/STATUS_HISTORY.md`

## Planned Steps

### Step 15 — User-Owned LLM Assistant ✅
- [x] Service layer: prompt generation, CSV generation, validation, conversion
- [x] Store: added `setGeneratedPreview` action to planningStore
- [x] Component: LLMAssistant with personal notes, prompt display, CSV download, JSON paste, validation, import
- [x] PlanCreator integration: 'llm-assistant' step, secondary button on configure step
- [x] i18n keys in ca/es/en (planning namespace, nested under `llm`)
- [x] Build verification: zero errors

### Step 16 — Ethical Gamification
- [ ] Read and follow `specs/features/16-ethical-gamification.md` as source of truth before implementation
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
- [x] Emit ingestion reports with accepted/skipped/duplicate/rejected counts and reasons; include dry-run and rollback-safe workflow
- [x] Validate legal/licensing metadata per source before merge (attribution, allowed usage, provenance)

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
