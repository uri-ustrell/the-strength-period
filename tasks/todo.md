# Task Progress

## Current Step
> Check `specs/STATUS.md` for the authoritative status tracker.

## Active Tasks

### Preset Catalog Alignment + UI Source Switch (In Progress, 2026-04-09)
- [ ] Verify all currently rendered built-in presets are represented in `data/ingestion/presets/catalog.json`
- [ ] Update runtime preset source in `src/data/presets.ts` to read from ingestion catalog with safe hardcoded fallback
- [ ] Ensure deterministic hardcoded preset merge behavior in ingestion tooling (`scripts/ingestion/presetGenerator.ts`)
- [ ] Keep catalog ordering deterministic and duplicate-safe while preserving required UI fields
- [ ] Run verification: `npm run test:ingestion`
- [ ] Run verification: `npm run build`
- [ ] Update `specs/STATUS.md` and `specs/STATUS_HISTORY.md` with concise completion notes

### Ingestion Follow-ups — Focused Tests + Artifact Hygiene (Complete, 2026-04-09)
- [x] Add deterministic ingestion unit tests for grouped i18n merge precedence and tag ordering in `scripts/ingestion/i18nMerge.test.ts`
- [x] Add contract validator coverage for missing locale blocks, localized names for `sourceExternalId`/`canonicalExerciseId`, and missing `preset_tags` labels
- [x] Add minimal deterministic test command for ingestion coverage (`npm run test:ingestion`)
- [x] Clean runtime-generated ingestion artifacts under `data/ingestion/reports/*` and `data/ingestion/queues/*` while preserving static placeholders
- [x] Run verification: `npm run test:ingestion`
- [x] Run verification: `npm run ingest -- --config data/ingestion/sources.example.json --dry-run`
- [x] Run verification: `npm run build`

### Ingestion Corrections — i18n Merge/Validation + llm-json Payload Reuse (Complete, 2026-04-09)
- [x] Preserve all exercise i18n update candidates per canonical id with deterministic resolution order
- [x] Validate llm-json i18n contract (ca/es/en + required localized names/tag labels) and surface failures as explicit ingestion reasons
- [x] Remove llm-json double-fetch by reusing one loaded payload for candidate parsing and i18n parsing
- [x] Update llm example fixture to include valid top-level i18n payload that exercises ingestion i18n flow
- [x] Run required verification: `npm run ingest -- --config data/ingestion/sources.example.json --dry-run`
- [x] Run required verification: `npm run build`
- [x] Update `specs/STATUS.md` and `specs/STATUS_HISTORY.md` with completion notes

### Ingestion Automation — Exercise i18n + Tag Localization (Complete, 2026-04-09)
- [x] Parse optional top-level i18n payloads from llm-json ingestion sources during `npm run ingest`
- [x] Add rollback-safe locale merge flow for exercise names in `src/i18n/locales/{ca,es,en}/exercises.json` keyed by canonical exercise id
- [x] Add optional instruction writes to `exercises.instructions.<exerciseId>` in all locales using fallback chain (locale -> en -> existing -> fallback)
- [x] Merge tag labels from exercise i18n payloads into `src/i18n/locales/{ca,es,en}/planning.json` under `preset_tags.<tag>` with locale fallback chain
- [x] Keep locale files synchronized for `ca/es/en` and preserve deterministic key sorting
- [x] Allow duplicate exercise candidates to refresh i18n for the matched canonical id when schema validation succeeds
- [x] Preserve ingest dedup/report behavior and CLI summary output
- [x] Update exercise LLM prompt template to require i18n tag labels for all tags used by generated exercises
- [x] Run required verification: `npm run ingest -- --config data/ingestion/sources.example.json --dry-run`
- [x] Run required verification: `npm run build`
- [x] Update `specs/STATUS.md` and `specs/STATUS_HISTORY.md` with completion notes

### Ingestion Automation — LLM i18n Split + Hardcoded Preset Seeding (Complete, 2026-04-09)
- [x] Update preset and exercise LLM chat prompt templates with strict top-level JSON shapes including i18n payloads (ca/es/en)
- [x] Extend preset batch parser to support old payload formats and new payload format with i18n block
- [x] Split preset i18n writes into locale planning files (`src/i18n/locales/{ca,es,en}/planning.json`) under `ingested_presets` and `preset_tags`
- [x] Implement locale fallback chain for missing i18n values (en -> existing locale value -> humanized fallback)
- [x] Ensure requiredTags from accepted presets are represented under `planning.preset_tags` for all locales
- [x] Seed/merge hardcoded presets from `src/data/presets.ts` into `data/ingestion/presets/catalog.json` without duplicate IDs
- [x] Keep deterministic catalog sorting and preserve ingestionMeta consistency
- [x] Preserve existing `npm run presets` CLI output behavior
- [x] Run `npm run build` and confirm zero errors
- [x] Update `specs/STATUS.md` with brief completion note
- [x] Update `specs/STATUS_HISTORY.md` with detailed completion notes

### Ingestion Prompt Templates for Manual LLM Chat (Complete, 2026-04-09)
- [x] Inspect preset flow contracts and validators (`scripts/generatePresetBatch.ts`, `scripts/ingestion/presetGenerator.ts`, `scripts/ingestion/contracts.ts`, `scripts/ingestion/validators.ts`)
- [x] Inspect exercise flow contracts/adapters/validators (`scripts/runIngestion.ts`, `scripts/ingestion/adapters/llmJsonAdapter.ts`, `scripts/ingestion/contracts.ts`, `scripts/ingestion/validators.ts`)
- [x] Create copy/paste-ready preset prompt template with strict JSON output contract and custom exercise-type variable section
- [x] Create copy/paste-ready exercise prompt template with strict JSON output contract and custom exercise-type variable section
- [x] Run verification command and confirm no regressions

### Step 18 CLI .env loading fix (Complete, 2026-04-09)
- [x] Reproduce `CLAUDE_API_KEY` missing failure on `npm run presets`
- [x] Load `.env` in Step 18 Node CLI entrypoints via `dotenv/config`
- [x] Add `dotenv` dependency and regenerate lockfile
- [x] Verify `npm run presets -- --prompt "test prompt"` advances past missing-key guard
- [x] Verify `npm run build` passes

### Tooling — npm install peer dependency fix (Complete, 2026-04-09)
- [x] Confirm compatible versions for `vite`, `@vitejs/plugin-react`, and `vite-plugin-pwa`
- [x] Update dependency versions in `package.json` and regenerate lockfile
- [x] Verify `npm i` and `npm run build`
- [x] Update `specs/STATUS.md` and `specs/STATUS_HISTORY.md`

### Step 16 — Ethical Gamification Documentation Foundation (Complete, 2026-04-09)
- [x] Recreate `specs/features/16-ethical-gamification.md` with ethical guardrails, forbidden patterns, Duolingo references, pre-execution phases, explicit full UI/UX refactor policy, metrics, and checklist coverage
- [x] Update Step 16 in `specs/STATUS.md` with source-of-truth requirement before implementation
- [x] Update Step 16 in `specs/STATUS.md` with pre-execution decision gate for full UI/UX refactor when needed
- [x] Add Step 16 planning documentation foundation entry to `specs/STATUS_HISTORY.md`
- [x] Run `npm run build` and confirm zero errors

### Step 17 — Formatter + Session Hooks (Complete, 2026-04-09)
- [x] Evaluate and configure Biome as project formatter/linter (`biome.jsonc`, scripts, dependency)
- [x] Add format-on-save + Biome VS Code settings in `.vscode/settings.json`
- [x] Create `.agents/hooks/hooks.json` with a session-end auto-format hook
- [x] Run Biome formatter on the entire codebase for initial normalization
- [x] Document formatting conventions in `specs/CONVENTIONS.md`
- [x] Run `npm run build` and confirm zero errors
- [x] Update `specs/STATUS.md` and `specs/STATUS_HISTORY.md` for Step 17 completion

### Step 18 — Multi-Source Content Ingestion Pipeline (Complete, 2026-04-09)
- [x] Create concise Step 18 feature spec at `specs/features/18-multi-source-ingestion.md`
- [x] Implement ingestion core modules under `scripts/ingestion/` (contracts, adapters, normalize, validate, dedup, review, merge, reports)
- [x] Implement CLI entrypoints (`scripts/runIngestion.ts`, `scripts/generateExercisePhotos.ts`, `scripts/generatePresetBatch.ts`)
- [x] Add ingestion state/artifact roots under `data/ingestion/` and `public/exercises/images/`
- [x] Add npm scripts and environment documentation for Step 18 workflows
- [x] Run verification commands (`npm run build` + targeted dry-run/help commands)
- [x] Update `specs/STATUS.md` + `specs/STATUS_HISTORY.md` with Step 18 completion notes

- [x] Define ingestion adapter contract (`sourceId`, fetch, map, validate, score)
- [x] Implement source connectors for external exercise APIs and LLM-generated JSON payloads
- [x] Build canonical transform layer for exercises and presets (normalize equipment, muscles, tags, restrictions, translations)
- [x] Add dedup pipeline (source-id registry + slug collision + title/muscle similarity + alias map)
- [x] Create ingestion report artifact with accepted/skipped/duplicate/rejected counts and reasons
- [x] Add manual review queue for low-confidence mappings before merge into source-of-truth files
- [x] Build `scripts/generateExercisePhotos.ts` with free-tier-first provider abstraction (use Nanobanana only if free tier exists; otherwise use best free provider)
- [x] Add a style-reference image input to `scripts/generateExercisePhotos.ts` so all generated exercise photos follow the same art direction
- [x] Enforce one-model-per-run policy in `scripts/generateExercisePhotos.ts` and persist the selected model in the run metadata
- [x] Support photo generation execution modes: `--all`, `--missing`, `--exercise <id>`, `--from-ingest-report <path>`
- [x] Wire ingestion flow to trigger photo creation for each newly accepted exercise
- [x] Build `scripts/generatePresetBatch.ts` using Claude API prompt-in flow, constrained to available exercise IDs
- [x] Add preset validation and conflict checks before writing to preset catalog
- [x] Add dry-run and rollback-safe merge mode for ingestion and preset generation
- [ ] TODO: Allow manual modification of LLM-imported plan before import and allow saving that edited plan as a user preset

### Weight Selector One-Time Cascade Normalization (2026-04-08)
- [x] Update weight selection behavior so cascade applies only once per equipment group (`manueles`, `barra`) on first selection-like action
- [x] Keep subsequent select/deselect interactions as isolated per-weight toggles after first cascade
- [x] Keep custom weight add flow coherent with the same rule (first add can cascade once, then isolated add/toggle)
- [x] Verify defaults remain unselected (empty arrays) and no i18n regressions
- [x] Run `npm run build` and confirm zero errors
- [x] Update `specs/STATUS.md` and `specs/STATUS_HISTORY.md`

### Weight Selector Default + Inferior Auto-Select (2026-04-08)
- [x] Set available weight defaults to empty arrays (no preselection)
- [x] Update WeightSelector selection logic to auto-select inferior weights
- [x] Keep custom weight add flow compatible with inferior auto-selection
- [x] Verify deselection behavior remains coherent
- [x] Run `npm run build`
- [x] Update `specs/STATUS.md` and `specs/STATUS_HISTORY.md`

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
