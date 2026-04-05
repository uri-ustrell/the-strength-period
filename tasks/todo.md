# Task Progress

## Current Step
> Check `specs/STATUS.md` for the authoritative status tracker.

## Active Tasks

### Env + Documentation Alignment — Gemini Server-side Flow
- [x] Add implementation checklist and track progress in this section
- [x] Align `.env.example` with required/optional vars (`GEMINI_API_KEY`, `VITE_MOCK_API`, optional `GEMINI_MODEL`)
- [x] Modernize `README.md` for Gemini + Vercel Serverless Function architecture and dev scripts
- [x] Update `specs/STATUS.md` with env/docs alignment note
- [x] Run `npm run build` and capture result
- [x] Add short review/result notes

### Real End-to-End Local API Flow (Pending)
- [ ] Validate `npm run dev:api` runs Vercel local runtime with `/api/*` endpoints
- [ ] Verify `/api/generate-plan` works locally with real `GEMINI_API_KEY` from `.env.local`
- [ ] Add clear developer guidance for when to use browser mock mode vs real E2E mode
- [ ] Verify `npm run build` still passes after any E2E-flow changes

### Step 12 — Deploy + CI/CD
- [ ] Verify git repository state (`main` + `develop`) and baseline branch strategy
- [ ] Configure GitHub remote with personal SSH alias and validate auth
- [ ] Push `main` and `develop` to origin
- [ ] Add CI workflow for install + typecheck + build on pull requests
- [ ] Add CI workflow trigger on push to `main` and `develop`
- [ ] Define required status checks and branch protection rules
- [ ] Validate Vercel deploy settings for preview and production deployments
- [ ] Document deploy/CI flow in STATUS.md

### Step 11 — Dev scripts alignment
- [x] Make `npm run dev` execute full-stack local mode (`dev:api`)
- [x] Add frontend-only script with API mock disabled
- [x] Verify build
- [x] Update STATUS.md

### QA Inputs — Session, Full Plan, and Gemini Prompt (2026-04-05)
- [x] Block 1: Live reordering in pre-session view (`SessionPreStart`)
	- [x] Implement a derived list that depends on `executionMode` instead of rendering `generatedSession.exercises` directly
	- [x] When switching `setExecutionMode('standard' | 'circuit')`, validate immediate order updates without starting the session
	- [x] Keep consistency with `removeExerciseFromPreview(index)` so deletion applies to the same visible list
	- [x] Verify `startSession()` preserves the selected mode and the final order shown in preview
- [x] Block 2: Circuit mode text cleanup (remove "short rest")
	- [x] Update `execution_mode.circuit_desc` in `src/i18n/locales/{ca,es,en}/common.json` to remove short-rest references
	- [x] Verify no visible variants remain for "short rest" / "poco descanso" / "poc descans"
	- [x] Validate correct rendering of the updated text in the session mode selector
- [x] Block 3: Active session with a single skip button
	- [x] Remove the second button in `Session.tsx` bound to `session.next_exercise`
	- [x] Remove `skipBlock` from `sessionStore.ts` (interface + implementation) and `useSession.ts`
	- [x] Remove i18n keys and content for `session.next_exercise` in ca/es/en
	- [x] Validate end-to-end flow in `standard` and `circuit` with only `session.skip_exercise`
- [x] Block 4: Full plan visualization (all sessions + exercises)
	- [x] Keep the week overview (`MonthView` / `WeekView`) and add expandable per-session detail
	- [x] Define the exercise data source per session (currently `SessionTemplate` only includes `muscleGroupTargets`)
	- [x] Show per-session details: exercises, sets, reps, target load, and rest
	- [x] Validate navigation and readability on mobile and desktop for full-plan review in one place
- [x] Block 5: Gemini reanalysis + 0-10 progression + 60% deload
	- [x] Add a weekly progression field (0..10) to the plan creation flow (`PlanCreator` + `UserConfig`)
	- [x] Propagate this value through `planningStore` -> `planningEngine` -> `/api/generate-plan` (types, payload, validation)
	- [x] Update `SYSTEM_PROMPT` and `buildUserMessage` in `api/generate-plan.ts` to use the selected percentage
	- [x] Apply conservative rehab/injury behavior: increment <= selected percentage and never above safety cap
	- [x] Define deload weeks on multiples of 4 (4, 8, 12) at 60% of achieved load (aligned across prompt and local rules)
	- [x] Validate `loadPercentage` follows configured week-by-week progression

### QA Inputs — UX, Language, Planning, and Session (2026-04-03)
- [x] Language as a dropdown and official UX criterion
	- [x] Replace language buttons with a reusable dropdown selector
	- [x] Ensure usability and scalability for additional languages (mobile + desktop)
	- [x] Add this criterion explicitly to the UX/UI expert agent (`ux-reviewer`)
	- [x] Validate there are no i18n regressions in primary navigation
- [x] Restore language persistence in the first Landing + Onboarding journey
	- [x] Reproduce the bug and document exact language-loss conditions
	- [x] Persist language before/during the Landing -> Onboarding flow
	- [x] Ensure correct i18n hydration on refresh and first render
	- [x] Add manual verification for ca/es/en flow coverage
- [x] Improve planning-step usability (proportional muscle-group weighting)
	- [x] Add a clear global label explaining proportional weighting intent
	- [x] Convert per-group selectors into clearer dropdown-based UI
	- [x] Add an "AI organizes weights" option that disables all manual selectors
	- [x] Arrange selectors in a desktop grid and accessible mobile layout
	- [x] Add helper microcopy so users understand the expected action
- [x] Presets with deterministic muscle-group preselection
	- [x] Define deterministic mapping from preset -> preselected groups/weights
	- [x] Apply automatic preselection when a preset is chosen
	- [x] Allow user-defined custom presets with the same deterministic behavior
	- [x] Store and recover custom presets from local configuration
- [x] Pre-session page before starting a session
	- [x] Show full session preview: exercises, sets/reps/weights
	- [x] Allow deleting exercises from the pre-session view
	- [x] Allow deleting individual reps/sets before session start
	- [x] Add order mode selector ("standard" vs "circuit") only in this pre-start page
	- [x] Show representative thumbnail/preview per exercise in the summary
- [x] Lock order mode selector once the session has started
	- [x] Hide or disable standard/circuit mode during active execution
	- [x] Ensure consistency with the mode selected at session start
	- [x] Cover session re-entry while a session is already in progress (persistent state)
- [x] Translate exercise instructions into all supported languages
	- [x] Extract base instructions from `exercises.json` into i18n keys
	- [x] Add ca/es/en instruction translations
	- [x] Add safe fallback behavior when translations are missing
	- [x] Verify translated instruction rendering in Landing/Planning/Session
- [x] Exercise image architecture (initial phase with dummy assets)
	- [x] Define data model for multiple images per exercise (target: minimum 3-5)
	- [x] Mark one image as "representative" for cards and summaries
	- [x] Show representative image next to exercise name
	- [x] Show remaining images in ordered sequence inside instructions accordion
	- [x] Reuse representative image in pre-session summary thumbnails
	- [x] Implement phase 1 using a single dummy image to validate full UI flow
	- [x] Document migration plan from dummy assets to final static image sets

### Step 9 — Dashboard + Stats
- [x] Create stats i18n files (ca, es, en)
- [x] Add dashboard keys to common i18n (ca, es, en)
- [x] Add plan creator keys to planning i18n (ca, es, en)
- [x] Register stats namespace in i18n/index.ts
- [x] Add loadUserConfig to userStore
- [x] Add list functions to sessionRepository
- [x] Update useDB hook
- [x] Create BottomNav component
- [x] Create SessionPreview, PlanCreator, WeekView, MonthView
- [x] Create VolumeChart, ProgressionChart, AdherenceChart
- [x] Implement Dashboard, Planning, Stats pages
- [x] Update App.tsx with BottomNav
- [x] Verify build
- [x] Update STATUS.md

## Completed

### Steps 2 + 4 — 2026-03-31
- [x] Install `idb` dependency
- [x] Download free-exercise-db (873 exercises) → `public/exercises/exercises.json`
- [x] Create `src/types/exercise.ts` — MuscleGroup, Equipment, ExerciseTag, Restriction, Exercise
- [x] Create `src/types/planning.ts` — Mesocycle, SessionTemplate, LoadTarget
- [x] Create `src/types/session.ts` — ExecutedSet, ExecutedSession
- [x] Create `src/types/user.ts` — UserProfile, UserConfig
- [x] Create `src/services/db/database.ts` — IndexedDB init (4 stores, indexes)
- [x] Create `src/services/db/configRepository.ts` — config CRUD
- [x] Create `src/services/db/mesocycleRepository.ts` — mesocycle CRUD
- [x] Create `src/services/db/sessionRepository.ts` — session+sets CRUD (atomic)
- [x] Create `src/hooks/useDB.ts` — React hook wrapping repositories
- [x] Create `src/data/muscleGroups.ts` — taxonomy + free-exercise-db muscle/equipment mapping
- [x] Create `src/data/exerciseEnrichment.ts` — 97 exercises enriched
- [x] Create `src/services/exercises/exerciseLoader.ts` — load + merge enrichment
- [x] Create `src/services/exercises/exerciseFilter.ts` — multi-criteria filter
- [x] Create `src/stores/exerciseStore.ts` — Zustand store
- [x] Create `src/hooks/useExercises.ts` — auto-fetch hook
- [x] Create `src/i18n/locales/{ca,es,en}/exercises.json` — 97 exercises × 3 languages
- [x] Create `src/i18n/locales/{ca,es,en}/muscles.json` — 23 muscle groups × 3 languages
- [x] Update `src/i18n/index.ts` — register exercises + muscles namespaces
- [x] Verify build passes (zero errors)
- [x] Verify data integrity (all IDs valid, all translations present)
- [x] Update `specs/STATUS.md`

## Review Notes
- 97 enriched exercises covers all 5 preset areas (lower body, core, mobility, upper body, rehab)
- All enrichment IDs confirmed to exist in exercises.json
- All 97 exercise nameKeys have matching translations in ca/es/en
- All 23 muscle groups have translations in ca/es/en
- `npm run build` passes with zero errors

## Review / Result — Env + Docs Alignment (2026-03-31)
- Updated env template to match Gemini server-side architecture with clear required/optional vars.
- Updated README architecture, quickstart, environment variables, and dev script behavior (`dev`, `dev:frontend`).
- Synced package scripts with documented workflow (`dev` -> `dev:api`, `dev:api` -> `vercel dev`).
- Updated STATUS with a brief env/docs alignment note.
- Verification: `npm run build` passes.

## Review / Result — Start implementation follow-up (2026-03-31)
- Confirmed implementation is complete and validated after subagent run.
- Re-ran `npm run build`: passes successfully.
