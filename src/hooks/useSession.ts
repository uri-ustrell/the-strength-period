import { useCallback } from 'react'

import { useSessionStore } from '@/stores/sessionStore'
import type { GeneratedSession } from '@/services/exercises/sessionGenerator'
import type { ExecutionMode } from '@/stores/sessionStore'

export function useSession() {
  const store = useSessionStore()

  const setPreviewSession = useCallback(
    (session: GeneratedSession) => {
      store.setPreviewSession(session)
    },
    [store.setPreviewSession],
  )

  const startSession = useCallback(
    (session?: GeneratedSession) => {
      store.startSession(session)
    },
    [store.startSession],
  )

  const logSet = useCallback(
    (repsActual: number, weightActual?: number) => {
      store.logSet(repsActual, weightActual)
    },
    [store.logSet],
  )

  const skipRest = useCallback(() => {
    useSessionStore.setState({ isResting: false, restSecondsRemaining: 0 })
  }, [])

  const setExecutionMode = useCallback(
    (mode: ExecutionMode) => {
      store.setExecutionMode(mode)
    },
    [store.setExecutionMode],
  )

  const currentExercise =
    store.generatedSession?.exercises[store.currentExerciseIndex] ?? null

  return {
    // State
    generatedSession: store.generatedSession,
    executedSets: store.executedSets,
    executionMode: store.executionMode,
    currentExerciseIndex: store.currentExerciseIndex,
    currentSetIndex: store.currentSetIndex,
    currentRound: store.currentRound,
    totalRounds: store.totalRounds,
    isResting: store.isResting,
    restSecondsRemaining: store.restSecondsRemaining,
    sessionStartedAt: store.sessionStartedAt,
    isFinished: store.isFinished,
    isSaving: store.isSaving,
    error: store.error,
    currentExercise,

    // Actions
    setPreviewSession,
    removeExerciseFromPreview: store.removeExerciseFromPreview,
    startSession,
    logSet,
    skipSet: store.skipSet,
    updateCurrentExerciseWeight: store.updateCurrentExerciseWeight,
    tickRest: store.tickRest,
    skipRest,
    setExecutionMode,
    finishSession: store.finishSession,
    reset: store.reset,
  }
}
