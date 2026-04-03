# Feature 08 — Execution Mode (Real-time Workout)

## Dependencies
Steps 4 (IndexedDB), 6 (Session Engine), 7 (Planning Engine) must be complete.

## Acceptance Criteria
- [ ] Session store tracks: current exercise index, current set, timer state, elapsed time
- [ ] Active exercise display: name, muscle group, instructions, target sets/reps/weight
- [ ] Set logger: per-set input for reps actual + weight actual + completion toggle
- [ ] Rest timer: auto-starts on set completion, countdown with configurable duration
- [ ] Exercise navigation: next exercise, skip exercise
- [ ] Post-session summary: exercises done, total volume, total time
- [ ] Post-session inputs: RPE slider (1-10), notes text field
- [ ] On "Save & Close": batch write ExecutedSets + session header to IndexedDB, mark template completed in mesocycle
- [ ] Mobile-first layout (session page is primarily mobile)

## Files to Create

```
src/stores/sessionStore.ts
src/components/session/ActiveExercise.tsx
src/components/session/SetLogger.tsx
src/components/session/RestTimer.tsx
src/components/session/SessionSummary.tsx
src/pages/Session.tsx
src/hooks/useSession.ts
```

## sessionStore.ts State

```typescript
interface SessionState {
  // Session data
  generatedSession: GeneratedSession | null
  executedSets: ExecutedSet[]
  
  // Navigation
  currentExerciseIndex: number
  currentSetIndex: number
  
  // Timer
  isResting: boolean
  restSecondsRemaining: number
  sessionStartedAt: string | null
  
  // Actions
  startSession: (session: GeneratedSession) => void
  logSet: (repsActual: number, weightActual?: number) => void
  skipExercise: () => void
  nextExercise: () => void
  startRest: (seconds: number) => void
  tickRest: () => void
  finishSession: (globalRpe: number, notes?: string) => Promise<void>
  reset: () => void
}
```

## Session Flow

```
1. User clicks "Start Session" (from Dashboard or Planning)
2. Session page loads with first exercise
3. For each exercise:
   a. Show exercise info (name, muscles, instructions, target)
   b. For each set:
      - User enters reps + weight
      - Marks set complete
      - Rest timer auto-starts
      - Timer counts down, then advances to next set
   c. After all sets → auto-advance to next exercise
   d. User can skip exercise at any time
4. After last exercise → show SessionSummary
5. User enters RPE (1-10) and optional notes
6. "Save & Close" → batch write to IndexedDB → redirect to Dashboard
```

## IndexedDB Writes on Session End

1. **executedSets store:** All ExecutedSets in a single transaction
2. **sessions store:** Session header
3. **mesocycles store:** Update the template → set `completed = true`
