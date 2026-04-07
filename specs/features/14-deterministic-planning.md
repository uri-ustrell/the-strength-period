# Feature 14 — Deterministic Planning Engine

## Description

Replace the LLM-based planning engine (Gemini API via `/api/generate-plan`) with a fully on-device deterministic algorithm. The user configures everything through the wizard; the algorithm builds the mesocycle instantly with no network calls.

This is the core deliverable of Architecture Decision 2 (see `specs/STATUS.md`).

## Dependencies

- Step 2 ✅ (Exercises + Enrichment — 97 exercises, filter, loader)
- Step 4 ✅ (IndexedDB Persistence — mesocycle CRUD, config store)

## Acceptance Criteria

- [ ] `progressionMetric: 'weight' | 'reps' | 'seconds'` added to `Exercise` type and all enrichment entries
- [ ] `exerciseLoader.ts` merges `progressionMetric` from enrichment into loaded exercises
- [ ] New deterministic `generateMesocycle()` in `planningEngine.ts` — pure function, no network calls
- [ ] Anti-repeat constraint: no exercise appears in session N **and** session N+1
- [ ] No exercise from the same muscle group repeated within the same session
- [ ] Duration constraint: total estimated sets × avg set time ≤ user's available minutes
- [ ] `PROGRESSION_RULES` applied: weekly volume increase scaled by `weeklyProgression` (0–10), deload at week multiples of 4 at 60%
- [ ] PlanCreator wizard updated: remove "generating" spinner step, add "exercise selection" step
- [ ] Exercise selection step: per muscle group, show filtered exercises; user can toggle auto/manual
- [ ] Generation is synchronous (no loading state needed)
- [ ] Presets work as starting points (load → customize → generate)
- [ ] Custom presets (already in IndexedDB) work with the new flow
- [ ] `planningStore.generate()` calls the new synchronous engine
- [ ] `api/generate-plan.ts` is no longer called from the planning flow
- [ ] All i18n keys added in ca/es/en
- [ ] `npm run build` passes with zero errors
- [ ] All existing session/execution functionality (Step 8) continues to work unmodified

---

## Type Changes

### 1. Add `progressionMetric` to `Exercise` (`src/types/exercise.ts`)

```typescript
export type ProgressionMetric = 'weight' | 'reps' | 'seconds'
```

Added to `Exercise` type as a required field.

Assignment rules:
- **`'weight'`** — Weighted exercises (barbell, dumbbell, etc.) where the user progressively overloads by adding weight.
- **`'reps'`** — Bodyweight exercises where progression is adding reps.
- **`'seconds'`** — Isometric holds, stretches, and mobility drills where progression is holding longer.

Heuristic: if `equipment` includes only `'pes_corporal'` and `category` is `'stability'` or `'mobility'` → `'seconds'`. If `equipment` includes only `'pes_corporal'` and `category` is `'strength'` or `'cardio'` or `'plyometrics'` → `'reps'`. Otherwise → `'weight'`.

### 2. Add `ExerciseAssignment` to `SessionTemplate` (`src/types/planning.ts`)

```typescript
export type ExerciseAssignment = {
  muscleGroup: MuscleGroup
  exerciseId: string
  progressionMetric: ProgressionMetric
}
```

Optional field `exerciseAssignments?: ExerciseAssignment[]` on `SessionTemplate` for backwards compatibility.

### 3. `weeklyProgression` required in `UserConfig` (`src/types/user.ts`)

Change from optional to required with default value 5.

---

## Algorithm: Deterministic Mesocycle Generator

### Function Signature

```typescript
function generateMesocycle(
  presetId: string,
  config: UserConfig,
  availableExercises: Exercise[],
  options?: {
    weeks?: number
    muscleDistribution?: Record<string, number>
    progressionType?: ProgressionType
    weeklyProgression?: number
    exerciseSelections?: Record<string, string[]>
  }
): Mesocycle
```

Synchronous — returns `Mesocycle`, not `Promise<Mesocycle>`.

### Algorithm Rules

1. Resolve muscle distribution from options, preset, or equal distribution
2. Pre-filter exercise pool by user equipment + restrictions
3. Build candidate list per muscle group
4. Compute base sets per muscle group from time budget
5. For each week:
   - Compute week multiplier (progression + deload at week % 4 === 0)
   - Scale by `weeklyProgression` (0–10): `scaledIncrease = rule.weeklyVolumeIncrease * (weeklyProgression / 10)`
   - For each day: pick exercises with anti-repeat, compute load targets
   - Duration check: trim lowest-priority targets if over budget
6. Build and return `Mesocycle`

### Anti-Repeat Constraint
- Session N and session N+1 must not share any exercise ID
- If pool too small (1 exercise per group), constraint relaxes

### Duration Constraint
```
estimatedMinutes = Σ (sets × estimatedSeriesDurationSeconds + restSeconds × (sets - 1)) / 60
```
If over `minutesPerSession × 1.1`: remove lowest-priority muscle group targets until within budget.

### Progression Logic

- `weeklyProgression = 0`: maintenance (multiplier stays 1.0)
- `weeklyProgression = 10`: full progression rate
- Deload at multiples of 4 weeks at 60%
- RPE increases over weeks: base 6, +0.2–0.3 per week, capped at 10
- For `'weight'`: fixed rep range [8,12], RPE increases
- For `'reps'`: reps increase with multiplier
- For `'seconds'`: hold duration increases with multiplier
- Undulating: odd sessions ×1.15, even sessions ×0.85 within each week

---

## Wizard Steps (PlanCreator.tsx)

### New Flow
```
preset → configure → muscles → exercises → preview
```

Removes the `generating` spinner step. Adds `exercises` step.

### Exercises Step
- Toggle: "Auto-select all" (default ON) — algorithm picks randomly
- When OFF: per-muscle-group accordion with exercise checklist
  - Filtered by user equipment + restrictions
  - At least 1 exercise per group required
- "Generate plan" button runs deterministic engine → instant → preview

### Muscles Step Changes
- Remove "Let AI decide" toggle
- Replace AI-referencing copy with algorithm description

---

## Files to Modify

```
src/types/exercise.ts                  ← Add ProgressionMetric
src/types/planning.ts                  ← Add ExerciseAssignment
src/types/user.ts                      ← weeklyProgression required
src/data/exerciseEnrichment.ts         ← Add progressionMetric to all entries
src/services/exercises/exerciseLoader.ts ← Merge progressionMetric
src/services/planning/planningEngine.ts  ← REWRITE: deterministic algorithm
src/stores/planningStore.ts            ← Sync generate()
src/components/planning/PlanCreator.tsx  ← New wizard flow
src/i18n/locales/ca/planning.json      ← New keys
src/i18n/locales/es/planning.json      ← New keys
src/i18n/locales/en/planning.json      ← New keys
```

## Files NOT Modified
```
src/services/planning/planningAdjuster.ts
src/services/exercises/sessionGenerator.ts
src/services/exercises/exerciseFilter.ts
src/stores/sessionStore.ts
src/hooks/useSession.ts
src/pages/Session.tsx
src/data/progressionRules.ts
src/data/presets.ts
api/generate-plan.ts
```

---

## i18n Keys (planning namespace)

| Key | CA | ES | EN |
|-----|----|----|-----|
| `select_exercises` | `Selecciona exercicis` | `Selecciona ejercicios` | `Select exercises` |
| `select_exercises_desc` | `Tria exercicis per cada grup muscular, o deixa que l'algorisme triï.` | `Elige ejercicios para cada grupo muscular, o deja que el algoritmo elija.` | `Pick exercises for each muscle group, or let the algorithm choose.` |
| `auto_select_all` | `Selecció automàtica` | `Selección automática` | `Auto-select all` |
| `auto_select_all_desc` | `L'algorisme triarà exercicis variats del teu catàleg filtrat.` | `El algoritmo elegirá ejercicios variados de tu catálogo filtrado.` | `The algorithm will pick varied exercises from your filtered catalog.` |
| `manual_select` | `Selecció manual` | `Selección manual` | `Manual selection` |
| `no_exercises_for_muscle` | `Cap exercici disponible per a {{muscle}}` | `Ningún ejercicio disponible para {{muscle}}` | `No exercises available for {{muscle}}` |
| `exercises_selected` | `{{count}} exercicis seleccionats` | `{{count}} ejercicios seleccionados` | `{{count}} exercises selected` |
| `min_one_exercise` | `Selecciona almenys 1 exercici per grup` | `Selecciona al menos 1 ejercicio por grupo` | `Select at least 1 exercise per group` |
| `generate_instant` | `Genera el pla` | `Genera el plan` | `Generate plan` |
| `plan_generated` | `Pla generat correctament` | `Plan generado correctamente` | `Plan generated successfully` |
| `algorithm_distributes` | `L'algorisme distribuirà el volum d'entrenament proporcionalment.` | `El algoritmo distribuirá el volumen de entrenamiento proporcionalmente.` | `The algorithm will distribute training volume proportionally.` |
| `candidates_count` | `{{count}} exercicis disponibles` | `{{count}} ejercicios disponibles` | `{{count}} exercises available` |

## Implementation Order

1. Type changes (exercise.ts, planning.ts, user.ts)
2. Enrichment data (exerciseEnrichment.ts + exerciseLoader.ts)
3. Algorithm (planningEngine.ts rewrite)
4. Store update (planningStore.ts)
5. Wizard (PlanCreator.tsx)
6. i18n keys
7. Verify build
