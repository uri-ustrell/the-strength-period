# Feature 02 — Exercises + Enrichment

## Dependencies
Step 1 (Scaffold) must be complete.

## Acceptance Criteria
- [ ] free-exercise-db JSON available at `/public/exercises/exercises.json`
- [ ] All exercise types defined in `src/types/exercise.ts`
- [ ] Muscle group taxonomy in `src/data/muscleGroups.ts`
- [ ] 80+ exercises enriched with tags, restrictions, i18n keys in `src/data/exerciseEnrichment.ts`
- [ ] Exercise loader merges base JSON with enrichment data
- [ ] Exercise filter works by: muscle group, equipment, restrictions, tags, level
- [ ] Zustand exercise store loads and caches exercises
- [ ] Exercise names translated to ca/es/en (80 priority exercises)
- [ ] Muscle group names translated to ca/es/en

## Key Design: Exercises Never Go to IndexedDB
Exercises are static data loaded from `/public` and enriched in memory. IndexedDB only stores user-generated data (plans, executions, sessions).

## Files to Create

```
public/exercises/exercises.json       ← free-exercise-db download
src/types/exercise.ts                 ← MuscleGroup, Equipment, ExerciseTag, Restriction, Exercise
src/data/muscleGroups.ts              ← Full taxonomy with i18n keys
src/data/exerciseEnrichment.ts        ← Map: exercise ID → tags, restrictions, nameKey
src/services/exercises/exerciseLoader.ts  ← Load JSON + merge enrichment
src/services/exercises/exerciseFilter.ts  ← Filter by criteria
src/stores/exerciseStore.ts           ← Zustand store
src/hooks/useExercises.ts             ← React hook
src/i18n/locales/ca/exercises.json    ← Exercise name translations
src/i18n/locales/es/exercises.json
src/i18n/locales/en/exercises.json
src/i18n/locales/ca/muscles.json      ← Muscle group translations
src/i18n/locales/es/muscles.json
src/i18n/locales/en/muscles.json
```

## Exercise Enrichment Priority
Focus on exercises that serve the 5 presets:
1. Lower body (glutis, quads, isquiotibials, calves) — runners
2. Core (abdominal, oblics, lumbar, stabilizers)
3. Mobility (hip, ankle, thoracic)
4. Upper body (basic compound: push, pull)
5. Rehab-specific (eccentric, stability, band exercises)

## exerciseLoader.ts Logic

```typescript
async function loadExercises(): Promise<Exercise[]> {
  // 1. Fetch /exercises/exercises.json
  // 2. For each exercise in enrichment map:
  //    - Merge tags, restrictions, nameKey, category, estimatedDuration
  //    - Map free-exercise-db muscles to our MuscleGroup taxonomy
  //    - Map free-exercise-db equipment to our Equipment enum
  // 3. Return enriched exercises (only those in enrichment map)
}
```

## exerciseFilter.ts API

```typescript
function filterExercises(
  exercises: Exercise[],
  filters: {
    muscleGroups?: MuscleGroup[]
    equipment?: Equipment[]
    excludeRestrictions?: string[]
    tags?: ExerciseTag[]
    level?: ('beginner' | 'intermediate' | 'expert')[]
    category?: Exercise['category'][]
    excludeIds?: string[]
  }
): Exercise[]
```
