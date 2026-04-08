# Implementation Status — The Strength Period

> Last updated: 2026-04-08

## Current Phase: Step 14 Complete — Steps 15–17 Planned

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
| 15 | User-Owned LLM Assistant | 🚧 Planned | Step 14 |
| 16 | Ethical Gamification | 🚧 Planned | Steps 8, 9, 14 |
| 17 | Formatter + Session Hooks | 🚧 Planned | — |

## Architecture Notes

- Local-first: IndexedDB for user data, no server-side inference.
- Static data (exercises, presets, i18n) served from `/public/` or bundled — zero serverless cost.
- Export/Import via JSON for data portability.

## Architecture Decisions

| # | Decision | Summary |
|---|----------|---------|
| 1 | Remove Server-Side AI | Gemini API removed; deterministic planning + user-owned LLM path |
| 2 | Deterministic Planning | On-device algorithm: anti-repeat, duration constraints, progression rules |
| 3 | User-Owned LLM Assistant | Prompt + CSV template; user pastes JSON; app validates schema |
| 4 | Presets | Built-in + user-saved presets as wizard starting points |
| 5 | Static Data Serving | No serverless endpoints; static CDN only |
| 6 | Ethical Gamification | Habit-tied achievements; anti-addictive guardrails; optional patronage |

> Full rationale in `specs/STATUS_HISTORY.md`

## Planned Steps

### Step 15 — User-Owned LLM Assistant
- [ ] Design prompt template with JSON contract and step-by-step instructions
- [ ] Generate CSV artifact: exercise catalog (filtered), user restrictions, JSON schema
- [ ] Build UI: prompt display + CSV download
- [ ] Accept pasted JSON; validate against schema; show structured errors
- [ ] On valid JSON, import plan (reuse existing infrastructure)

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
