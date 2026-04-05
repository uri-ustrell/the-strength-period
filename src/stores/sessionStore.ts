import { create } from 'zustand'

import type { ExecutedSet, ExecutedSession } from '@/types/session'
import type { GeneratedSession } from '@/services/exercises/sessionGenerator'
import { saveSession, markTemplateCompleted } from '@/services/db/sessionRepository'

export type ExecutionMode = 'standard' | 'circuit'
const CIRCUIT_REST_BETWEEN_EXERCISES = 10
const CIRCUIT_REST_BETWEEN_ROUNDS = 120

interface SessionStore {
  // Session data
  generatedSession: GeneratedSession | null
  executedSets: ExecutedSet[]
  executionMode: ExecutionMode

  // Navigation
  currentExerciseIndex: number
  currentSetIndex: number
  // Circuit mode tracking
  currentRound: number
  totalRounds: number

  // Timer
  isResting: boolean
  restSecondsRemaining: number
  sessionStartedAt: string | null

  // UI state
  isFinished: boolean
  isSaving: boolean
  error: string | null

  // Actions
  setPreviewSession: (session: GeneratedSession) => void
  removeExerciseFromPreview: (index: number) => void
  startSession: (session?: GeneratedSession) => void
  setExecutionMode: (mode: ExecutionMode) => void
  logSet: (repsActual: number, weightActual?: number) => void
  skipExercise: () => void
  startRest: (seconds: number) => void
  tickRest: () => void
  finishSession: (globalRpe: number, notes?: string) => Promise<void>
  reset: () => void
}

const toDateString = (iso: string): string => iso.slice(0, 10)

const initialState = {
  generatedSession: null,
  executedSets: [],
  executionMode: 'standard' as ExecutionMode,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  currentRound: 0,
  totalRounds: 0,
  isResting: false,
  restSecondsRemaining: 0,
  sessionStartedAt: null,
  isFinished: false,
  isSaving: false,
  error: null,
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  setPreviewSession: (session) => {
    set({ generatedSession: session, executionMode: 'standard' })
  },

  removeExerciseFromPreview: (index) => {
    const session = get().generatedSession
    if (!session) return
    const exercises = session.exercises.filter((_, i) => i !== index)
    const totalSeconds = exercises.reduce((sum, se) => {
      const seriesTime = se.exercise.estimatedSeriesDurationSeconds * se.sets
      const restTime = se.restSeconds * Math.max(0, se.sets - 1)
      return sum + seriesTime + restTime
    }, 0)
    set({
      generatedSession: {
        ...session,
        exercises,
        estimatedDurationMinutes: Math.ceil(totalSeconds / 60),
      },
    })
  },

  startSession: (session?) => {
    const toStart = session ?? get().generatedSession
    if (!toStart) return
    const mode = get().executionMode
    const maxSets = Math.max(...toStart.exercises.map((e) => e.sets), 1)
    set({
      ...initialState,
      generatedSession: toStart,
      executionMode: mode,
      sessionStartedAt: new Date().toISOString(),
      totalRounds: maxSets,
    })
  },

  setExecutionMode: (mode) => set({ executionMode: mode }),

  logSet: (repsActual, weightActual) => {
    const state = get()
    const { generatedSession, currentExerciseIndex, currentSetIndex, executedSets, executionMode, currentRound } = state

    if (!generatedSession) return

    const currentExercise = generatedSession.exercises[currentExerciseIndex]
    if (!currentExercise) return

    const repsPlanned = Array.isArray(currentExercise.reps)
      ? currentExercise.reps[1]
      : currentExercise.reps

    const newSet: ExecutedSet = {
      id: crypto.randomUUID(),
      sessionId: '',
      sessionTemplateId: generatedSession.templateId,
      date: toDateString(new Date().toISOString()),
      exerciseId: currentExercise.exercise.id,
      setNumber: currentSetIndex + 1,
      repsPlanned,
      repsActual,
      weightKgPlanned: currentExercise.weightKg,
      weightKgActual: weightActual,
      completedAt: new Date().toISOString(),
    }

    const updatedSets = [...executedSets, newSet]

    if (executionMode === 'circuit') {
      // Circuit mode: move to next exercise, short rest
      const isLastExercise = currentExerciseIndex + 1 >= generatedSession.exercises.length
      const nextRound = currentRound + (isLastExercise ? 1 : 0)
      const maxSets = Math.max(...generatedSession.exercises.map((e) => e.sets))

      if (isLastExercise && nextRound >= maxSets) {
        // All rounds complete
        set({ executedSets: updatedSets, isFinished: true, isResting: false })
      } else if (isLastExercise) {
        // End of round → long rest, back to first exercise
        set({
          executedSets: updatedSets,
          currentExerciseIndex: 0,
          currentSetIndex: nextRound,
          currentRound: nextRound,
          isResting: true,
          restSecondsRemaining: CIRCUIT_REST_BETWEEN_ROUNDS,
        })
      } else {
        // Move to next exercise in round → short rest
        set({
          executedSets: updatedSets,
          currentExerciseIndex: currentExerciseIndex + 1,
          isResting: true,
          restSecondsRemaining: CIRCUIT_REST_BETWEEN_EXERCISES,
        })
      }
    } else {
      // Standard mode: finish all sets of current exercise before moving
      const isLastSet = currentSetIndex + 1 >= currentExercise.sets
      const isLastExercise = currentExerciseIndex + 1 >= generatedSession.exercises.length

      if (isLastSet && isLastExercise) {
        set({
          executedSets: updatedSets,
          currentSetIndex: currentSetIndex + 1,
          isFinished: true,
          isResting: false,
        })
      } else if (isLastSet) {
        set({
          executedSets: updatedSets,
          currentExerciseIndex: currentExerciseIndex + 1,
          currentSetIndex: 0,
          isResting: false,
        })
      } else {
        set({
          executedSets: updatedSets,
          currentSetIndex: currentSetIndex + 1,
          isResting: true,
          restSecondsRemaining: currentExercise.restSeconds,
        })
      }
    }
  },

  skipExercise: () => {
    const { generatedSession, currentExerciseIndex } = get()
    if (!generatedSession) return

    const isLastExercise = currentExerciseIndex + 1 >= generatedSession.exercises.length

    if (isLastExercise) {
      set({ isFinished: true, isResting: false })
    } else {
      set({
        currentExerciseIndex: currentExerciseIndex + 1,
        currentSetIndex: 0,
        isResting: false,
        restSecondsRemaining: 0,
      })
    }
  },

  startRest: (seconds) => {
    set({ isResting: true, restSecondsRemaining: seconds })
  },

  tickRest: () => {
    const { restSecondsRemaining } = get()
    if (restSecondsRemaining <= 1) {
      set({ isResting: false, restSecondsRemaining: 0 })
    } else {
      set({ restSecondsRemaining: restSecondsRemaining - 1 })
    }
  },

  finishSession: async (globalRpe, notes) => {
    const state = get()
    const { generatedSession, executedSets, sessionStartedAt } = state

    if (!generatedSession || !sessionStartedAt) return

    set({ isSaving: true, error: null })

    try {
      const sessionId = crypto.randomUUID()
      const now = new Date().toISOString()

      const setsWithSessionId = executedSets.map((s) => ({
        ...s,
        sessionId,
      }))

      const session: ExecutedSession = {
        id: sessionId,
        sessionTemplateId: generatedSession.templateId,
        date: toDateString(now),
        startedAt: sessionStartedAt,
        completedAt: now,
        sets: setsWithSessionId,
        globalRpe,
        notes,
        skipped: false,
      }

      await saveSession(session, setsWithSessionId)

      const templateId = generatedSession.templateId
      const mesocycleId = templateId.split('_')[0]
      if (mesocycleId) {
        await markTemplateCompleted(mesocycleId, templateId)
      }

      set({ isSaving: false })
    } catch (err) {
      set({ error: (err as Error).message, isSaving: false })
    }
  },

  reset: () => set({ ...initialState }),
}))
