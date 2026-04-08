# Implementation Status — The Strength Period

> Last updated: 2026-04-08

## Current Phase: Step 15 Complete — Steps 16–17 Planned

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
| 17 | Formatter + Session Hooks | 🚧 Planned | — |

## Architecture Notes

- Local-first: IndexedDB for user data, no server-side inference.
- Exercises: pre-built at dev-time via `npm run build:exercises` (raw free-exercise-db → enriched JSON). Client fetches final JSON with zero runtime processing.
- Static data (presets, i18n) bundled in JS — zero serverless cost.
- Export/Import via JSON for data portability.
- Available weights start unselected by default; the first selection per equipment auto-selects inferior weights once, then subsequent interactions are isolated per-weight toggles.

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
- [ ] Define anti-addictive guardrails as acceptance criteria
- [ ] Design achievement system tied to sustainable habits
- [ ] Implement milestones (consistency, deload compliance, warm-up, injury-safe progression)
- [ ] Streak recovery safeguards (grace period, no punishment)
- [ ] Optional patronage UI (tip jar / supporter badge, non-pressuring copy)
- [ ] Validate every mechanic against guardrails before shipping

### Step 17 — Formatter + Session Hooks
- [ ] Evaluate and configure Biome as project formatter/linter
- [ ] Add format-on-save and Biome settings to `.vscode/settings.json`
- [ ] Create `.agents/hooks/hooks.json` with session-end auto-format hook
- [ ] Run formatter on entire codebase for initial normalization
- [ ] Document formatting conventions in `specs/CONVENTIONS.md`

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
