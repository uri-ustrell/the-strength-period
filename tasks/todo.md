# Task Progress

## Current Step
> Check `specs/STATUS.md` for the authoritative status tracker.

## Active Tasks

### Available Weights Configuration and Snapping
**Context:** `LoadTarget.weightKg` és un nombre lliure (float). `UserConfig` no té cap camp que descrigui els pesos físicament disponibles de l'usuari (p. ex. parelles de manubles: 4, 6, 8, 10, 12, 16 kg; discos de barra; kettlebells). El motor de planificació (`computeLoadTarget` a `planningEngine.ts`) i el Gemini prompt ignoren completament quines càrregues reals pot muntar l'usuari. Això fa que els objectius de pes generats siguin valors teòrics no adaptats a l'equipament real.
**Goal:** L'usuari declara els pesos disponibles per tipus d'equipament durant l'onboarding o la configuració; el motor i el prompt els utilitzen per arrodonir els `weightKg` al valor disponible més pròxim per sobre o per sota.

- [x] **Data model** — Afegir `availableWeights` a `UserConfig` (`src/types/user.ts`): estructura per tipus d'equipament (`manueles`, `barra`, `kettlebell`) amb llista de kg disponibles; inicialitzar amb valors per defecte raonables
- [x] **Onboarding / Settings UI** — Afegir pas o secció per declarar els pesos disponibles per equipament; UI simple de xips/checkboxes amb valors predefinits comuns (2, 4, 6, 8, 10, 12, 14, 16, 20, 24 kg per manubles/KB; increments de disc de barra)
- [x] **Weight snapping util** — Crear funció pura `snapToAvailableWeight(targetKg, availableWeights, direction: 'up' | 'down' | 'nearest'): number` a `src/services/planning/`
- [x] **Planning engine integration** — Quan `progressionMetric === 'weight'`, arrodonir el `weightKg` calculat al pes disponible més proper usant la nova utilitat
- [x] **Gemini prompt** — ~~Skipped~~ — Server-side AI removed per Decision 1; planning is fully deterministic on-device
- [x] **Session execution** — En el pre-start i l'execució activa, mostrar el pes arrodonit i permetre que l'usuari esculli pes superior/inferior dins els seus valors disponibles
- [x] Run `npm run build` — zero errors

### Skip Set Button in Active Session
**Context:** Currently, the session page has a "skip exercise" button that immediately moves to the next exercise. Users sometimes want to skip only the current set (e.g., due to fatigue mid-set) without losing the commitment to the exercise, and without triggering an automatic rest period. The UX should make "skip set" less prominent than "complete set" to reduce accidental clicks.
**Goal:** Replace the existing "skip exercise" button with a "skip set" button that advances to the next set without recording it as completed and without starting a rest timer. The button should be secondary in visual hierarchy (less prominent than "Complete Set"). The "skip exercise" functionality is removed entirely.

- [x] **i18n keys** — Add `session.skip_set` key to all three languages (ca/es/en) in common.json with translations: "Skip set" (en), "Saltar sèrie" (ca), "Omitir serie" (es); remove the existing `session.skip_exercise` key
- [x] **SessionStore interface** — Add `skipSet: () => void` action and remove `skipExercise: () => void` from the SessionStore interface in `src/stores/sessionStore.ts`
- [x] **SessionStore implementation** — Implement `skipSet` action: advance `currentSetIndex`, do NOT create ExecutedSet, do NOT trigger rest (set `isResting: false`); handle both standard and circuit modes; remove `skipExercise` implementation
- [x] **useSession hook** — Export `skipSet` and remove `skipExercise` from `src/hooks/useSession.ts`
- [x] **SetLogger UI** — Replace the current skip-exercise button with a secondary-style "skip set" button (e.g., smaller, gray, less rounded, less bold) in `src/components/session/SetLogger.tsx`; wire to `onSkipSet` callback
- [x] **Session page integration** — Replace `skipExercise` with `skipSet` in hook destructuring in `src/pages/Session.tsx`; pass it to SetLogger as `onSkipSet` prop
- [x] Run `npm run build` — zero errors

### Muscle Group Selector Completeness (PlanCreator)
**Context:** `PlanCreator.tsx` defines a hardcoded `MAIN_MUSCLE_GROUPS` list of only 13 groups, while `ALL_MUSCLE_GROUPS` in `src/data/muscleGroups.ts` has the full 23 groups. The filter engine (`exerciseFilter.ts`) already matches on both `primaryMuscles` and `secondaryMuscles`, so showing all groups in the UI is purely a selector change.
**Goal:** Any user who wants to target a specific muscle (e.g. `avantbras`, `oblics`, `trapezi`, `mobilitat_turmell`) must be able to do so — including groups that only appear as secondary muscles in the enriched exercises.

- [x] Replace the hardcoded `MAIN_MUSCLE_GROUPS` constant in `PlanCreator.tsx` with `ALL_MUSCLE_GROUPS` imported from `src/data/muscleGroups.ts`
- [x] Initialise `muscleGroupPriorities` state from `ALL_MUSCLE_GROUPS` so all 23 groups get a default `'medium'` priority (no functional change, just correct seed)
- [x] Verify that preset preselection logic (`presetToMuscleGroupPriorities`) still covers the new groups as `null` / not selected by default and only highlights the preset-relevant ones
- [x] Validate the muscle-group selector UI renders all 23 groups correctly on mobile and desktop (grid layout, no overflow)
- [x] Run `npm run build` — zero errors

### Exercise Data Quality Audit
**Context:** 83 exercises are enriched (out of 873 in the raw JSON). All 23 MuscleGroup values now have ≥3 enriched exercises. Translations are complete for ca/es/en.
**Dependencies:** Muscle Group Selector Completeness task above (to know which groups the UI will expose).

- [x] **Coverage audit** — For each of the 23 `MuscleGroup` values, count exercises where it appears as `primaryMuscles` or `secondaryMuscles` in the enriched set; list groups with fewer than 3 exercises
- [x] **Gap filling** — Added `primaryMusclesExtra`/`secondaryMusclesExtra` to EnrichmentData + exerciseLoader merge; added muscle extras to 37 existing exercises; added 3 new exercises (Anterior_Tibialis-SMR, Decline_Oblique_Crunch, Dumbbell_Side_Bend)
- [x] **Translation completeness** — All 83 enriched exercise nameKeys have matching entries in all 3 languages
- [x] **Translation quality** — Reviewed ca/es/en exercise name translations for accuracy and consistency — all coherent
- [x] **Muscle mapping coherence** — No unmapped raw muscle or equipment values; 8 custom groups covered via new `primaryMusclesExtra`/`secondaryMusclesExtra` mechanism
- [x] **Equipment coverage audit** — All 12 raw equipment types mapped; `trx` Equipment has 0 exercises (noted for future cleanup); 14 null-equipment exercises correctly default to `pes_corporal`
- [x] **Instruction translations** — 10 exercises have instruction translations in CA/ES/EN (EN was missing, now fixed); 73 exercises without instruction translations (gradual expansion)
- [x] Run `npm run build` — zero errors

### Step 13 — Static Data API
- [x] Move `public/exercises/exercises.json` → `data/exercises.json`
- [x] Create `api/exercises.ts` — GET endpoint with filtering, ETag, cache headers
- [x] Create `api/presets.ts` — GET endpoint with cache headers
- [x] Create `api/i18n/[locale].ts` — GET endpoint per locale with cache headers
- [x] Create `src/services/cache/apiCache.ts` — client-side cache (localStorage)
- [x] Update `src/services/exercises/exerciseLoader.ts` — fetch from API + cache
- [x] Update `src/mocks/handlers.ts` — add GET handlers for 3 new endpoints
- [x] Update `vercel.json` — cache headers for API routes
- [x] Run `npm run build` — verify zero errors
- [x] Update `specs/STATUS.md` — mark Step 13 complete

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
