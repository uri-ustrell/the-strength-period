# Feature 06 — Session Generation Engine

## Dependencies
Step 2 (Exercises) must be complete.

## Acceptance Criteria
- [ ] Pure function: takes template + exercises + recent history + restrictions → returns generated session
- [ ] Filters by primary/secondary muscle groups
- [ ] Filters by available equipment
- [ ] Excludes exercises matching active restrictions (action: 'avoid')
- [ ] Anti-repetition: penalizes exercises used in last 3 days
- [ ] Weighted random selection for variety
- [ ] Duration estimate based on sets × estimated series duration + rest
- [ ] Works without Claude API (pure algorithmic)

## Files to Create

```
src/types/session.ts                        ← (may already exist from DATA_MODEL)
src/services/exercises/sessionGenerator.ts  ← Core algorithm
src/data/progressionRules.ts                ← Linear, undulating, block rules
```

## sessionGenerator.ts API

```typescript
interface GeneratedSession {
  templateId: string
  exercises: SelectedExercise[]
  estimatedDurationMinutes: number
}

interface SelectedExercise {
  exercise: Exercise
  sets: number
  reps: number | [number, number]
  weightKg?: number
  rpe?: number
  restSeconds: number
}

function generateSession(
  template: SessionTemplate,
  allExercises: Exercise[],
  recentExerciseIds: string[],   // last 3 days
  userEquipment: Equipment[],
  userRestrictions: string[]
): GeneratedSession
```

## Algorithm

```
For each MuscleGroupTarget in template:
  1. Filter exercises where primaryMuscles OR secondaryMuscles includes target.muscleGroup
  2. Filter where exercise.equipment intersects userEquipment
  3. Exclude where exercise.restrictions match userRestrictions with action='avoid'
  4. Separate into "fresh" (not in recentExerciseIds) and "recent"
  5. Use fresh pool if >= 2 candidates, else fallback to all candidates
  6. Weighted random select: prefer exercises matching more template tags, prefer appropriate level
  7. Assign load from target.loadTarget (sets, reps, weight/rpe, rest)

Calculate total duration:
  sum(exercise.estimatedSeriesDurationSeconds × sets + restSeconds × (sets-1)) for all exercises
  Convert to minutes, round up
```

## progressionRules.ts

```typescript
type ProgressionRule = {
  type: ProgressionType
  weeklyVolumeIncrease: number    // percentage (e.g., 0.05 = 5%)
  deloadWeek: number              // every N weeks
  deloadPercentage: number        // percentage of max (e.g., 0.7 = 70%)
}

const PROGRESSION_RULES: Record<ProgressionType, ProgressionRule>
```
