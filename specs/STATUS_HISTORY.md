# Implementation Status — History Archive

> Detailed completion records, architecture decision rationale, and QA notes.
> For current status, see `specs/STATUS.md`.

---

## Recent Changes

### Step 18 — Multi-Source Content Ingestion Pipeline (2026-04-09)
- **Added**: Core ingestion modules under `scripts/ingestion/` (contracts, adapters, normalizers, validators, dedup, review queue, reports, merge, photo pipeline, preset generator, and shared CLI/path utilities).
- **Added**: Step 18 CLI entrypoints (`scripts/runIngestion.ts`, `scripts/generateExercisePhotos.ts`, `scripts/generatePresetBatch.ts`) and npm scripts (`ingest`, `photos`, `presets`).
- **Added**: Ingestion artifacts/config roots (`data/ingestion/*`) and exercise image placeholder root (`public/exercises/images/.gitkeep`).
- **Implemented**: Deterministic flow with source-license validation, canonical normalization + schema validation, dedup guardrails (registry/slug/similarity/alias map), review gating, dry-run support, and rollback-safe writes.
- **Implemented**: Photo-generation integration from ingestion accepted IDs plus mode-based photo generation (`all`, `missing`, `single`, `from-report`) with free-tier-first provider selection and one-model-per-run metadata locking.
- **Implemented**: Claude preset batch generation flow with output validation and available-exercise ID constraints.
- **Verification**: `npm run build` passes (TypeScript + Vite production build).
- **Verification**: `npm run ingest -- --config data/ingestion/sources.example.json --dry-run` passes (run `ingestion-20260409-115055-a84a7a`: accepted 557, skipped 218, duplicate 100, rejected 0).
- **Verification**: `npm run photos -- --help` and `npm run presets -- --help` both pass offline and print expected CLI usage.

### Step 17 — Formatter + Session Hooks (2026-04-09)
- **Added**: `@biomejs/biome` as the repository formatter/linter baseline.
- **Added**: Biome scripts in `package.json` (`format`, `format:check`, `lint:biome`).
- **Added**: `biome.json` generated from Biome v2 and tuned to project style (2-space indentation, single quotes, semicolons as needed, trailing commas, 100-char line width).
- **Updated**: `.vscode/settings.json` with Biome default formatter + format-on-save and Biome organize-import actions.
- **Added**: `.agents/hooks/hooks.json` with a `session-end` hook that runs `npm run format`.
- **Executed**: Initial repository normalization via `npm run format` (104 files scanned, 58 files fixed).
- **Verification**: `npm run build` passes (TypeScript + Vite production build).

### Step 18 Planning — Multi-Source Content Ingestion Pipeline (2026-04-08)
- **Planned**: New Step 18 to ingest exercises, presets, and media from multiple sources through provider adapters (external APIs + LLM responses).
- **Planned**: Canonical transformation layer for exercise/preset payloads with strict schema validation before merge.
- **Planned**: Dedup guardrails combining source IDs, slug checks, title+muscle similarity, and alias mapping to avoid duplicate exercises.
- **Planned**: Node image pipeline for one representative photo per exercise with free-tier-first provider abstraction (use Nanobanana only if its free tier is available, otherwise auto-select the best free provider), supporting full regen and incremental generation.
- **Planned**: Image consistency guardrails include passing a style reference image in prompts and using one single model for all exercise images in a generation cycle.
- **Planned**: Preset-batch generation workflow using Claude prompt-in/preset-JSON-out, constrained to currently available exercise IDs.
- **Planned**: Operational safeguards (dry-run, ingest reports, manual review queue, rollback-safe merge process).
- **Added TODO**: Follow-up product item to manually edit LLM-imported plans before import and optionally save them as user presets.

### Weight Selector One-Time Cascade Normalization (2026-04-08)
- **Changed**: Hierarchical inferior-weight auto-selection now triggers only once per equipment group (`manueles`, `barra`) on the first selection-like action.
- **Changed**: After that first cascade, all chip interactions are normalized to isolated per-weight toggle behavior (select/deselect only the clicked weight).
- **Changed**: Custom weight add flow follows the same rule: first add can cascade once, later adds are isolated.
- **Kept**: Defaults remain unselected (`DEFAULT_AVAILABLE_WEIGHTS` empty arrays) and existing i18n usage unchanged.
- **Verification**: `npm run build` passes with zero errors.

### Weight Selector Hierarchical Selection Update (2026-04-08)
- **Changed**: `DEFAULT_AVAILABLE_WEIGHTS` now initializes `manueles` and `barra` with empty arrays, so weights are never preselected by default.
- **Changed**: `WeightSelector` now auto-selects all inferior weights (same equipment) when selecting an unselected weight chip.
- **Changed**: Custom weight add flow now follows the same hierarchy rule: adding/selecting a custom value also selects all inferior preset/custom weights.
- **Kept**: Deselection remains non-destructive; tapping a selected chip only deselects that chip.
- **Verification**: `npm run build` passes with zero errors.

### Onboarding & UserConfig Refactor (2026-04-09)
- **Removed**: `UserProfile` type and profile step from onboarding — was only used for preset filtering with minimal impact
- **Removed**: `weeklyProgression` from UserConfig — was always overridden by PlanCreator slider
- **Removed**: `availableDaysPerWeek: number` — replaced with `trainingDays: DayOfWeek[]` for specific weekday selection
- **Removed**: Free-text restriction textarea — moved idea to Step 15 (LLM free-form context)
- **Fixed**: Restriction key mismatch — old keys (`knee`, `ankle`, `back`, `shoulder`, `hip`, `wrist`) matched nothing in enrichment data. Now uses `RestrictionCondition` type: `rehab_genoll | rehab_lumbar | rehab_turmell | tendinitis_rotuliana`
- **Fixed**: WeightSelector custom weight UX — custom weights now appear in the toggleable grid after being added
- **Expanded**: Default weight presets — manueles 1-40kg, barra 20-120kg (was 2-32 / 20-100)
- **Changed**: Dashboard session logic — from "today by day-of-week" to "next consecutive uncompleted session"
- **Changed**: PlanCreator — shows all presets (not profile-filtered) with text search and tag filter
- **Changed**: Onboarding — single step instead of 2 (removed Step1Profile), weekday toggle buttons instead of numeric day count
- **Updated**: Settings page — removed profile section, added weekday toggles, uses real restriction conditions
- **Updated**: i18n (ca/es/en) — new restriction labels, weekday names, preset search/tag keys
- **Files changed**: 20+ files across types, data, services, stores, components, pages, i18n

### Pre-Built Exercise Pipeline (2026-04-08)
- **Architecture change:** Exercises are now pre-built at development time instead of enriched at runtime.
- **Added**: `data/raw/free-exercise-db.json` — archived raw source (873 exercises from free-exercise-db)
- **Added**: `scripts/buildExercises.ts` — build-time pipeline that merges raw data + enrichment map + muscle/equipment mappings → produces `public/exercises/exercises.json` (100 enriched exercises)
- **Added**: `npm run build:exercises` script
- **Simplified**: `exerciseLoader.ts` — reduced from 80 lines of runtime processing to 6 lines (fetch + return)
- **Bundle impact**: `exerciseEnrichment.ts` (~960 lines) and mapping tables from `muscleGroups.ts` are now tree-shaken out of the client bundle (no longer imported at runtime)
- **Updated**: `verify.cjs` — now validates against the enriched JSON (source of truth) instead of cross-referencing raw + enrichment
- **Updated**: specs (OVERVIEW.md, STATUS.md, 02-exercises.md) to reflect new data pipeline
- **Data flow**: `data/raw/free-exercise-db.json` + `src/data/exerciseEnrichment.ts` + `src/data/muscleGroups.ts` → `scripts/buildExercises.ts` → `public/exercises/exercises.json`
- **Rationale**: Client no longer downloads 873 raw exercises only to keep 100; no runtime muscle/equipment mapping or enrichment merging. Simpler loader, smaller bundle, faster client startup. Our enriched JSON becomes the true source of truth. Future remote source updates go through the build script.

### Decision 7 — Pre-Built Exercise Pipeline
- **Decided:** `public/exercises/exercises.json` is our source of truth — already enriched, mapped, and ready for client consumption.
- **Build-time script** (`scripts/buildExercises.ts`) takes raw free-exercise-db + enrichment map + muscle/equipment mappings and produces the final JSON.
- **Raw remote data** archived at `data/raw/free-exercise-db.json` for rebuild capability and future source updates.
- **Client loader** is a simple fetch + type assertion — zero processing.
- **Rationale:** The previous model fetched 873 raw exercises, filtered to ~100, applied muscle mappings, equipment mappings, and enrichment merges on every page load. This is wasteful since the data only changes when developers modify enrichment. Moving processing to build-time eliminates runtime cost, reduces bundle size (enrichment map tree-shaken), and establishes our JSON as the canonical source — important when we add custom exercises or additional remote sources in the future.

### Skip Set Button (2026-04-07)
- **Replaced**: `skipExercise` action with `skipSet` in sessionStore — advances one set (not entire exercise), no ExecutedSet record, no rest timer; handles both standard and circuit modes
- **Updated**: useSession hook — exports `skipSet` instead of `skipExercise`
- **Updated**: SetLogger component — added `onSkipSet` prop with secondary-style button inside the component
- **Updated**: Session page — removed standalone skip-exercise button, passes `skipSet` to SetLogger
- **Updated**: i18n keys in all 3 languages — replaced `session.skip_exercise` with `session.skip_set` (ca: "Saltar sèrie", es: "Omitir serie", en: "Skip set")

### Exercise Data Quality Audit (2026-04-07)
- **Added**: `primaryMusclesExtra` and `secondaryMusclesExtra` optional fields to `EnrichmentData` type — allows enrichment to add our custom taxonomy muscles (e.g. `oblics`, `psoes`, `mobilitat_cadera`) that don't exist in free-exercise-db vocabulary
- **Updated**: `exerciseLoader.ts` merges extra muscles with auto-mapped muscles from raw data (with deduplication)
- **Added**: Muscle extras to 37 existing enriched exercises covering all 8 previously empty custom muscle groups: `tibial_anterior`, `psoes`, `oblics`, `estabilitzadors_cadera`, `mobilitat_cadera`, `mobilitat_turmell`, `mobilitat_toracica`, `fascies`
- **Added**: 3 new enriched exercises: `Anterior_Tibialis-SMR`, `Decline_Oblique_Crunch`, `Dumbbell_Side_Bend` (total: 83 enriched)
- **Added**: ca/es/en translations for 3 new exercises
- **Fixed**: EN instruction translations added for 10 exercises (were only in CA/ES)
- **Result**: All 23 muscle groups now have ≥ 3 enriched exercises (previously 8 groups had zero); all 83 exercise name translations complete in 3 languages; 10 exercises have instruction translations in all 3 languages
- **Noted**: `trx` Equipment type has 0 exercises in raw data (candidate for future cleanup)

### Available Weights Configuration and Snapping (2026-04-07)
- **Added**: `AvailableWeights` type and `availableWeights` field to `UserConfig` (per equipment type: `manueles`, `barra`)
- **Added**: `DEFAULT_AVAILABLE_WEIGHTS` constant with sensible defaults for dumbbells and barbell
- **Added**: `snapToAvailableWeight()` pure function in `src/services/planning/weightSnapping.ts` — supports `up`, `down`, `nearest` directions
- **Added**: `getAdjacentWeights()` helper for session UI weight navigation
- **Integrated**: Planning engine (`computeLoadTarget`) now computes and snaps `weightKg` for weight-metric exercises based on user's available weights
- **Added**: `WeightSelector` reusable component — chip-toggle UI for common weights + custom weight input
- **Added**: Available weights section in Settings page (visible when dumbbells or barbell selected)
- **Added**: Available weights section in Onboarding Step 3 (visible when dumbbells or barbell selected)
- **Added**: Weight up/down controls in `ActiveExercise` during session execution using adjacent available weights
- **Added**: `updateCurrentExerciseWeight` action in sessionStore for runtime weight adjustment
- **Added**: i18n keys in all 3 languages (ca/es/en) for available weights UI, onboarding weights, and session weight navigation
- **Updated**: `useUserStore` with `availableWeights` state and `setAvailableWeights` action
- **Updated**: `PlanCreator` passes `availableWeights` when generating plans

### QA Pass (2026-04-05) — Session, Full Plan, and Gemini Prompt
- **Improved**: Pre-session exercise list uses derived (useMemo) list based on executionMode for reactive reordering
- **Fixed**: Circuit mode description — removed "short rest" / "poc descans" / "poco descanso" references from ca/es/en
- **Removed**: Second skip button (skipBlock / "next exercise") — single "skip exercise" button remains in active session
- **Removed**: `skipBlock` action from sessionStore, useSession, and i18n keys
- **Added**: Expandable per-session detail in plan view — compact SessionPreview rows expand to show muscle group targets with sets, reps, RPE, rest
- **Added**: Weekly progression field (0-10 scale) in plan creation configure step with range slider
- **Updated**: Gemini SYSTEM_PROMPT — progression rules tied to 0-10 scale, deload at multiples of 4 weeks at 60%, conservative rehab behavior
- **Updated**: buildUserMessage — includes progression level and deload schedule in prompt
- **Updated**: All progression rules — deload percentage standardized to 60% across linear/undulating/block types
- **Propagated**: weeklyProgression through UserConfig → PlanCreator → planningStore → planningEngine → /api/generate-plan

### QA Pass (2026-04-03) — UX, Language, Planning, Session
- **Improved**: Language selector — replaced button grid with native `<select>` dropdown in BottomNav for mobile scalability
- **Fixed**: Language persistence — added LanguageSelector to Landing and Onboarding pages so language choice persists through the full flow
- **Improved**: Planning muscle-group UX — replaced cycle-click with per-group `<select>` dropdowns in 2-col responsive grid
- **Added**: "Let AI decide" toggle for muscle group priorities in plan creation
- **Added**: Explanation and helper microcopy for muscle group weighting step
- **Added**: Deterministic preset → muscle group preselection (≥25% → High, 10-24% → Medium, <10% → Low)
- **Fixed**: Muscle group selector completeness — replaced hardcoded 13-group `MAIN_MUSCLE_GROUPS` with full 23-group `ALL_MUSCLE_GROUPS` from `muscleGroups.ts` so all groups (including secondary-only like `avantbras`, `oblics`, `trapezi`, `mobilitat_turmell`) are selectable in PlanCreator
- **Added**: Custom presets — save, load, and delete user-created presets from IndexedDB
- **Added**: Pre-session preview page (SessionPreStart) — shows exercises, sets/reps/weights before session starts
- **Added**: Delete exercises from pre-session preview
- **Added**: Execution mode selector (Standard/Circuit) moved to pre-session preview only
- **Locked**: Execution mode cannot be changed once session is active (read-only circuit indicator)
- **Added**: Exercise instruction i18n — component-level fallback from translated instructions to raw English
- **Added**: Catalan and Spanish translations for 10 representative exercise instructions
- **Added**: Exercise image architecture — ExerciseImage type, placeholder SVG, representative image in session and pre-start views
- **Updated**: UX reviewer agent — added "Language as dropdown" criterion

### QA Pass (2026-03-31) — Complete
- **Fixed**: Exercise title translation bug — `nameKey` had double namespace prefix (`exercises:exercises:...`)
- **Fixed**: Session viewport overlap — buttons hidden under sticky bottom nav when instructions expanded (pb-8 → pb-24)
- **Added**: Session cancel/pause/discard — cancel button, save partial progress, or discard entirely
- **Added**: Execution mode toggle (Standard vs Circuit) — circuit mode cycles through exercises one set at a time
- **Moved**: Language selector from fixed top-right position into "More" menu in bottom nav bar
- **Added**: Settings page (`/settings`) — edit profile, equipment, restrictions, days/week, minutes/session
- **Removed**: Weekly view from Planning tab — only month view remains
- **Improved**: Quick session — expandable muscle group selector with duration picker
- **Added**: Muscle group pre-selection with priority weights (high/medium/low) in plan creation
- **Fixed**: Plan view compact mode — shows all muscle groups instead of 3 + ellipsis

---

## Architecture Decisions — Full Rationale

### Decision 1 — Remove Server-Side AI (Gemini API)
- **Decided:** `api/generate-plan.ts` and the `planningEngine.ts` API client are removed.
- Replaced by two user-facing paths: Deterministic Planning and User-Owned LLM Assistant (see below).
- Rationale: eliminates infrastructure cost and API key management; shifts control to the user.

### Decision 2 — Deterministic Planning Engine
The new plan creation wizard lets the user configure everything manually; an on-device algorithm builds the plan.

**User inputs (wizard steps):**
1. Sessions per week + available minutes per session.
2. Muscle groups to target.
3. Specific exercises per muscle group — catalog is pre-filtered by the user's owned equipment/restrictions (from onboarding).
4. Option to start from a **preset** (built-in or user-saved) and adjust from there.

**Algorithm rules:**
- Each exercise in the catalog declares a `progressionMetric: 'weight' | 'reps' | 'seconds'`. The algorithm increments the relevant metric over the mesocycle.
- Random selection within the filtered exercise pool per muscle group.
- Anti-repeat: no exercise may appear in session N *and* session N+1 (two consecutive sessions).
- No exercise from the same muscle group is repeated within the same session.
- Duration constraint: total estimated sets × average set time ≤ user's available minutes.

### Decision 3 — User-Owned LLM Assistant Path ("Let AI do the job")
An alternative to the wizard for users who prefer AI-assisted configuration.

**Flow:**
1. App generates a **prompt template** describing the task and JSON contract, plus a **CSV attachment** containing:
   - Exercise catalog filtered by user's equipment (id, name, muscles, progressionMetric, equipment).
   - User's owned equipment and restrictions.
   - The expected JSON schema the app will validate against.
2. Numbered step-by-step instructions are shown so the user knows exactly how to proceed.
3. User copies the prompt + attaches the CSV into their LLM of choice (ChatGPT, Claude, Gemini, etc.).
4. User copies the LLM's JSON output and pastes it back into the app.
5. App validates the JSON against the schema before importing; shows clear errors if invalid.
- **Note (idea):** for any large reference data that would bloat the prompt but is stable, pack it into the CSV instead of inline text to avoid clipboard size limits.

### Decision 4 — Presets
- Built-in presets cover the most common training profiles (already partially implemented).
- User can load a preset as a starting point and modify it before saving.
- User-saved presets persist in IndexedDB (already implemented); extend to cover the full new wizard configuration shape.

### Decision 5 — Static Data Serving (exercises, presets, i18n)
- **Decided:** Keep static files served directly from Vercel's edge CDN. No serverless function endpoints.
- Exercises: `/public/exercises/exercises.json` fetched at runtime, merged with enrichment client-side.
- Presets + i18n: bundled in the JS bundle (tiny, change infrequently).
- **Rationale:** Serverless functions incur cold-start latency + function invocation costs. Static files on Vercel CDN are free, faster (no compute), and sufficient for this app's data size (~97 exercises, 5 presets, 3 locales). A Vercel Function approach only pays off at scale (thousands of exercises, frequent data updates, multiple external consumers).
- **Reverted:** A prior implementation (Step 13) added `api/exercises.ts`, `api/presets.ts`, `api/i18n/[locale].ts` with ETag/Cache-Control + client-side localStorage cache — removed because it increased infra cost with no real benefit at this scale.

### Decision 6 — Ethical Gamification (kept, scope defined)
- Achievements tied exclusively to sustainable habits: consistency streaks, deload compliance, warm-up completion, injury-safe progression.
- Non-speculative points/tokens used only for in-app milestones and reflection prompts — never for pay-to-win or pressure mechanics.
- Streak recovery safeguards so missing a session does not trigger guilt loops.
- Optional patronage model (tips, supporter badge) with no paywalled core functionality.
- Anti-addictive guardrails defined before any engagement mechanic ships.

---

## Architecture Migration — Fase 1 (Complete)
- Migrated from user-provided Claude API key (browser-side) to server-side Gemini 2.5 Flash via Vercel Serverless Function
- Onboarding simplified from 3 steps to 2 (removed Claude API key step)
- Removed crypto-js dependency (no longer needed)
- Created `api/generate-plan.ts` — Vercel Serverless Function (POST, Gemini 2.5 Flash, rate limiting)
- Created `src/services/planning/planningEngine.ts` — frontend service (calls /api/generate-plan)
- Updated all specs, i18n, and agent configs to reflect new architecture

---

## Completed Work Per Step

### Step 14 — ✅ Complete (2026-04-06)
- [x] `ProgressionMetric` type added to `src/types/exercise.ts` + `progressionMetric` field on `Exercise`
- [x] `ExerciseAssignment` type and optional `exerciseAssignments` field added to `SessionTemplate` in `src/types/planning.ts`
- [x] `weeklyProgression` made required in `UserConfig` (`src/types/user.ts`)
- [x] `progressionMetric` added to all 97 entries in `src/data/exerciseEnrichment.ts` (weight/reps/seconds per exercise)
- [x] `exerciseLoader.ts` merges `progressionMetric` from enrichment
- [x] `planningEngine.ts` fully rewritten: deterministic synchronous algorithm, no network calls
  - Anti-repeat constraint (no exercise in consecutive sessions)
  - In-session muscle group uniqueness
  - Duration check + trim (removes lowest-priority targets if over budget)
  - Progression rules applied: weekly volume scaled by `weeklyProgression` (0–10), deload at week % 4
  - Undulating variation (odd/even session multipliers)
- [x] `planningStore.ts` `generate()` made synchronous, accepts `exerciseSelections` option
- [x] `PlanCreator.tsx` wizard updated:
  - Removed `generating` spinner step, removed `aiDecides` toggle
  - Added `exercises` step with auto/manual exercise selection
  - Per-muscle-group accordion with exercise checkboxes when manual
  - Instant plan generation on button click
- [x] i18n keys added/updated in ca/es/en (12 new keys, 3 updated keys)
- [x] AI references replaced with algorithm references in all i18n strings
- [x] `npm run build` passes with zero errors

### Step 1 — ✅ Complete
- [x] `specs/OVERVIEW.md` — product vision, architecture, stack
- [x] `specs/CONVENTIONS.md` — code style, imports, patterns
- [x] `specs/DATA_MODEL.md` — all TypeScript types + IndexedDB schema
- [x] `specs/AGENT_GUIDE.md` — agent roles and workflow
- [x] `specs/STATUS.md` — this file
- [x] `specs/features/01-scaffold.md` through `10-polish.md` — all 10 feature specs
- [x] `specs/prompts/planning-system.md` — LLM system prompt
- [x] Vite 5 + React 18 + TypeScript 5 project initialized
- [x] Dependencies: react-router-dom, zustand, i18next, recharts, lucide-react, tailwindcss
- [x] Tailwind CSS v3 configured (tailwind.config.js, postcss.config.js, index.css)
- [x] React Router v6 with route shells (Landing, Onboarding, Dashboard, Planning, Session, Stats)
- [x] i18next configured with ca/es/en common.json files
- [x] Path alias `@/` → `src/` configured (tsconfig.json + vite.config.ts)
- [x] Landing page with 3 value propositions + CTA
- [x] `vercel.json`, `favicon.svg`
- [x] `npm run build` passes with zero errors

#### Files Created (Step 1)
```
specs/OVERVIEW.md, CONVENTIONS.md, DATA_MODEL.md, AGENT_GUIDE.md, STATUS.md
specs/features/01-scaffold.md through 10-polish.md
specs/prompts/planning-system.md
index.html, vite.config.ts, tsconfig.json, tsconfig.app.json, tsconfig.node.json
tailwind.config.js, postcss.config.js, vercel.json
public/favicon.svg
src/main.tsx, src/App.tsx, src/index.css, src/vite-env.d.ts
src/i18n/index.ts
src/i18n/locales/{ca,es,en}/common.json
src/pages/Landing.tsx, Dashboard.tsx, Planning.tsx, Session.tsx, Stats.tsx
src/pages/Onboarding/index.tsx
```

### Step 2 — ✅ Complete
- [x] `src/types/exercise.ts` — MuscleGroup, Equipment, ExerciseTag, Restriction, Exercise types
- [x] `public/exercises/exercises.json` — free-exercise-db (873 exercises)
- [x] `src/data/muscleGroups.ts` — muscle taxonomy + free-exercise-db mapping
- [x] `src/data/exerciseEnrichment.ts` — 97 exercises enriched with tags, restrictions, categories
- [x] `src/services/exercises/exerciseLoader.ts` — loads JSON, merges enrichment
- [x] `src/services/exercises/exerciseFilter.ts` — multi-criteria filter
- [x] `src/stores/exerciseStore.ts` — Zustand store
- [x] `src/hooks/useExercises.ts` — auto-fetch hook
- [x] `src/i18n/locales/{ca,es,en}/exercises.json` — 97 exercise names × 3 languages
- [x] `src/i18n/locales/{ca,es,en}/muscles.json` — 23 muscle groups × 3 languages
- [x] `src/i18n/index.ts` — exercises + muscles namespaces registered

### Step 4 — ✅ Complete
- [x] `src/types/planning.ts` — Mesocycle, SessionTemplate, LoadTarget types
- [x] `src/types/session.ts` — ExecutedSet, ExecutedSession types
- [x] `src/types/user.ts` — UserProfile, UserConfig types
- [x] `src/services/db/database.ts` — IndexedDB init with idb, 4 object stores, versioned schema
- [x] `src/services/db/configRepository.ts` — get/set/getAll config CRUD
- [x] `src/services/db/mesocycleRepository.ts` — save/get/getActive/list/update mesocycle CRUD
- [x] `src/services/db/sessionRepository.ts` — atomic session+sets save, queries by date/exercise
- [x] `src/hooks/useDB.ts` — React hook wrapping all repositories
- [x] `idb` dependency added to package.json

### Step 5 — ✅ Complete (updated in Fase 1 migration)
- [x] `src/stores/userStore.ts` — Zustand store for onboarding state, IndexedDB persistence (Claude key code removed in Fase 1)
- [x] `src/pages/Onboarding/index.tsx` — 2-step stepper container with progress indicator and navigation
- [x] `src/pages/Onboarding/Step1Profile.tsx` — Profile type selection (athlete/rehab/general)
- [x] ~~`src/pages/Onboarding/Step2ClaudeKey.tsx`~~ — Removed in Fase 1 migration

### Step 6 — ✅ Complete
- [x] `src/services/exercises/sessionGenerator.ts` — Pure session generation algorithm (filter, anti-repeat, weighted random, duration)
- [x] `src/data/progressionRules.ts` — Linear, undulating, block progression rules

### Step 7 — ✅ Complete
- [x] `src/data/presets.ts` — 5 training presets with muscle distribution, tags, profiles
- [x] `src/services/planning/planningAdjuster.ts` — Skip/unskip session, adjust load
- [x] `src/stores/planningStore.ts` — Zustand store for planning (generate, save, load, skip, adjust, deactivate)
- [x] `src/i18n/locales/{ca,es,en}/planning.json` — Planning namespace (3 languages)
- [x] `src/i18n/index.ts` — Planning namespace registered

### Step 8 — ✅ Complete
- [x] `src/stores/sessionStore.ts` — Zustand store for execution (start, logSet, skip, rest timer, finish, save to IndexedDB)
- [x] `src/components/session/ActiveExercise.tsx` — Exercise display: name, muscles, targets, instructions
- [x] `src/components/session/SetLogger.tsx` — Per-set input: reps actual + weight actual with +/- controls
- [x] `src/components/session/RestTimer.tsx` — Countdown timer with skip button
- [x] `src/components/session/SessionSummary.tsx` — Post-session: exercises done, volume, time, RPE slider, notes
- [x] `src/hooks/useSession.ts` — React hook composing session store
- [x] `src/pages/Session.tsx` — Full session page: active exercise → set logger → rest timer → summary → save
- [x] `src/i18n/locales/{ca,es,en}/common.json` — Expanded session namespace (20+ new keys × 3 languages)
- [x] `npm run build` passes with zero errors

### Step 9 — ✅ Complete
- [x] `src/i18n/locales/{ca,es,en}/stats.json` — Stats namespace (3 languages)
- [x] `src/i18n/locales/{ca,es,en}/common.json` — Dashboard keys added (3 languages)
- [x] `src/i18n/locales/{ca,es,en}/planning.json` — Plan creator keys added (3 languages)
- [x] `src/i18n/index.ts` — Stats namespace registered
- [x] `src/stores/userStore.ts` — Added loadUserConfig action
- [x] `src/services/db/sessionRepository.ts` — Added listSetsByDateRange, listAllSessions, listAllSets
- [x] `src/hooks/useDB.ts` — Added new session repository methods
- [x] `src/components/ui/BottomNav.tsx` — Bottom navigation bar (Dashboard/Planning/Session/Stats)
- [x] `src/components/ui/LanguageSelector.tsx` — Moved from bottom-right to top-right
- [x] `src/components/planning/PlanCreator.tsx` — Multi-step plan creation wizard (preset → config → generate → preview → save)
- [x] `src/components/planning/WeekView.tsx` — Weekly view with 7-day strip and session details
- [x] `src/components/planning/MonthView.tsx` — Monthly view with week navigation
- [x] `src/components/planning/SessionPreview.tsx` — Session template preview (compact and full modes)
- [x] `src/components/stats/VolumeChart.tsx` — Stacked area chart by muscle group (Recharts)
- [x] `src/components/stats/ProgressionChart.tsx` — Line chart for exercise progression (Recharts)
- [x] `src/components/stats/AdherenceChart.tsx` — Bar chart for weekly adherence (Recharts)
- [x] `src/pages/Dashboard.tsx` — Full dashboard: greeting, streak, today's session, weekly load, plan view, 4-week summary
- [x] `src/pages/Planning.tsx` — Plan management: create new plan or view active plan (week/month toggle)
- [x] `src/pages/Stats.tsx` — Stats page: period selector, volume/progression/adherence charts, PR table, export/import placeholders
- [x] `src/App.tsx` — Added BottomNav
- [x] `npm run build` passes with zero errors

### Step 10 — ✅ Complete
- [x] `vite-plugin-pwa` installed and configured in `vite.config.ts` (autoUpdate, manifest, workbox caching for exercises.json)
- [x] `src/services/db/exportImport.ts` — Export all IndexedDB data as versioned JSON, import with validation and replace
- [x] `src/components/data/ExportButton.tsx` — Export button with loading/error states
- [x] `src/components/data/ImportButton.tsx` — Import button with file picker, confirm dialog, loading/success/error states
- [x] `src/components/ui/Button.tsx` — Reusable button (primary/secondary/danger/ghost, sm/md/lg, loading)
- [x] `src/components/ui/Card.tsx` — Card wrapper component
- [x] `src/components/ui/Modal.tsx` — Portal-based modal with Escape key support
- [x] `src/components/ui/LoadingSpinner.tsx` — Animated SVG spinner
- [x] `src/pages/Stats.tsx` — Replaced placeholder export/import buttons with real components
- [x] `src/i18n/locales/{ca,es,en}/common.json` — Added data.exporting, data.importing, data.importConfirm, data.exportError, data.importError, data.importSuccess keys
- [x] `vercel.json` — Added CSP headers (script-src, style-src, connect-src for Gemini API, img-src, font-src)
- [x] `npm run build` passes with zero errors

### Step 11 — ✅ Complete
- [x] `package.json` — `npm run dev` now routes to `dev:api` (full-stack local mode)
- [x] `package.json` — Added `dev:frontend` script (`VITE_MOCK_API=false vite`) for frontend-only dev without mocked requests
- [x] `package.json` — Added `"dev:api": "vercel dev"` script
- [x] `msw@^2` installed as devDependency, `public/mockServiceWorker.js` generated via `npx msw init`
- [x] `src/mocks/fixtures/mesocycle.ts` — Realistic 4-week strength mesocycle fixture (push/pull/legs, 3 days/week, linear progression + deload week 4)
- [x] `src/mocks/handlers.ts` — MSW POST handler for `/api/generate-plan` with 300ms delay
- [x] `src/mocks/browser.ts` — MSW browser worker setup
- [x] `src/main.tsx` — Conditional MSW init: `DEV && VITE_MOCK_API === 'true'`
- [x] Env/docs alignment: `.env.example` and `README.md` updated for Gemini server-side flow, required `GEMINI_API_KEY`, optional `GEMINI_MODEL`, and default real API-first local behavior (`VITE_MOCK_API=false`)
- [x] `npm run build` passes with zero errors

### Step 12 — ✅ Complete
- [x] `.gitignore` — verified (node_modules, dist, .env, .vercel, IDE, OS files)
- [x] `git init` — repository initialized
- [x] Local git user — `uri-ustrell` / `uri.ustrell@gmail.com` (repo-level config)
- [x] Initial commit — 132 files, 43k lines (steps 1–11)
- [x] `develop` branch — created from `main` (git flow model: main/develop/feature/release/hotfix)
- [x] Remote — `git@github-personal:uri-ustrell/the-strength-period.git` (SSH alias for personal account)
- [x] Push `main` + `develop` to GitHub (user completes after repo creation)

### Step 13 — ❌ Reverted (Static Data API)
- Implemented and then reverted. Serverless function endpoints (`api/exercises.ts`, `api/presets.ts`, `api/i18n/[locale].ts`) + client-side localStorage cache added unnecessary infra cost.
- Static files on Vercel CDN are free and faster (no cold start, no function invocations).
- Exercise data (~97 enriched exercises), presets (5), and i18n (3 locales) are too small to justify serverless endpoints.
- Decision documented in Decision 5 above.

---

## Known Issues — Resolved

### Fixed — IndexedDB boolean index bug (2026-03-31)
- `getActiveMesocycle()` used `IDBKeyRange.only(true)` on the `by-active` index, but IndexedDB does not support boolean values as index keys (valid types: number, string, Date, ArrayBuffer, Array).
- `IDBKeyRange.only(true)` throws `DataError`, causing `saveGenerated()` to fail silently (caught by try/catch) — nothing saved to IDB and UI never updated.
- **Fix:** Changed `getActiveMesocycle()` to use `getAll()` + `find()` instead of the boolean index query. The `by-active` index remains in the schema (harmless, removing would require DB migration).

---

## Step 15 — User-Owned LLM Assistant (2026-04-08)

### Summary
Implemented the full LLM Assistant feature as an alternative plan creation path in the PlanCreator wizard. Users can generate a prompt + CSV exercise catalog, paste it into their own LLM (ChatGPT, Claude, Gemini), and import the resulting JSON plan back into the app.

### Files Created
- `src/services/planning/llmAssistantService.ts` — Service layer: LLM types, prompt template generation, CSV catalog generation, JSON validation with markdown-fence stripping, conversion to Mesocycle
- `src/components/planning/LLMAssistant.tsx` — UI component: personal notes (persisted in IndexedDB), prompt display with copy, CSV download, JSON paste textarea, validation results display, import button

### Files Modified
- `src/stores/planningStore.ts` — Added `setGeneratedPreview` action for direct mesocycle injection
- `src/components/planning/PlanCreator.tsx` — Added `'llm-assistant'` to Step union, "Use LLM Assistant" button on configure step, LLMAssistant rendering
- `src/i18n/locales/ca/planning.json` — Added `llm.*` keys (38 keys)
- `src/i18n/locales/es/planning.json` — Added `llm.*` keys (38 keys)
- `src/i18n/locales/en/planning.json` — Added `llm.*` keys (38 keys)

### Key Decisions
- Prompt template is always English (best LLM performance); UI chrome is i18n'd
- Personal notes persisted via existing `configRepository` KV store (`llmPersonalNotes` key)
- Validation includes 7 structural error rules and 4 warning rules per spec
- Markdown code fence stripping handles ```json and plain ``` fences
- CSV uses RFC 4180 format with proper escaping
