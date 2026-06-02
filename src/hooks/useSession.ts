import { useShallow } from 'zustand/react/shallow'

import { useSessionStore } from '@/stores/sessionStore'

/**
 * Granular selectors so each consumer only re-renders on the slice it actually
 * uses. The previous implementation subscribed to the whole store, which made
 * `Session`, `ActiveExercise` and `SetLogger` re-render every second during the
 * rest countdown — wasting battery and causing visual jank on slow devices.
 *
 * Note: `restSecondsRemaining` and `isResting` are intentionally NOT part of
 * the shallow group below because they change every tick. They are exposed via
 * separate selectors and only the `RestTimer` branch of `Session` actually
 * reads them, so the rest of the tree stays stable during a rest interval.
 */
export function useSession() {
  const state = useSessionStore(
    useShallow((s) => ({
      generatedSession: s.generatedSession,
      executedSets: s.executedSets,
      executionMode: s.executionMode,
      currentExerciseIndex: s.currentExerciseIndex,
      currentSetIndex: s.currentSetIndex,
      currentRound: s.currentRound,
      totalRounds: s.totalRounds,
      sessionStartedAt: s.sessionStartedAt,
      isFinished: s.isFinished,
      isSaving: s.isSaving,
      error: s.error,
      lastFinishedSessionId: s.lastFinishedSessionId,
      lastFinishedSessionDateISO: s.lastFinishedSessionDateISO,
      lastFinishedSessionCompletedAtISO: s.lastFinishedSessionCompletedAtISO,
    }))
  )

  // Tick-frequency slices live on their own selectors. `Session` only consumes
  // `isResting` (a boolean that flips ~once per set, not per second). The
  // per-second `restSecondsRemaining` is read directly by `RestTimer` so the
  // rest of the page tree stays stable during a rest interval.
  const isResting = useSessionStore((s) => s.isResting)

  // Zustand action references are stable across renders, so we can grab them
  // once without useCallback wrappers.
  const setPreviewSession = useSessionStore((s) => s.setPreviewSession)
  const removeExerciseFromPreview = useSessionStore((s) => s.removeExerciseFromPreview)
  const startSession = useSessionStore((s) => s.startSession)
  const setExecutionMode = useSessionStore((s) => s.setExecutionMode)
  const logSet = useSessionStore((s) => s.logSet)
  const skipSet = useSessionStore((s) => s.skipSet)
  const updateCurrentExerciseWeight = useSessionStore((s) => s.updateCurrentExerciseWeight)
  const skipRest = useSessionStore((s) => s.skipRest)
  const finishEarly = useSessionStore((s) => s.finishEarly)
  const finishSession = useSessionStore((s) => s.finishSession)
  const reset = useSessionStore((s) => s.reset)

  const currentExercise = state.generatedSession?.exercises[state.currentExerciseIndex] ?? null

  return {
    ...state,
    isResting,
    currentExercise,
    setPreviewSession,
    removeExerciseFromPreview,
    startSession,
    setExecutionMode,
    logSet,
    skipSet,
    updateCurrentExerciseWeight,
    skipRest,
    finishEarly,
    finishSession,
    reset,
  }
}
