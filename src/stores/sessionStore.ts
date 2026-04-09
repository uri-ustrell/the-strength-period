import { create } from 'zustand'

import type { ExecutedSet, ExecutedSession } from '@/types/session'
import type { GeneratedSession } from '@/services/exercises/sessionGenerator'
import { saveSession, markTemplateCompleted } from '@/services/db/sessionRepository'
import { computeNextAfterLog, computeNextAfterSkip } from '@/services/session/sessionNavigation'
import type { NavigationInput } from '@/services/session/sessionNavigation'

export type ExecutionMode = 'standard' | 'circuit'

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
  skipSet: () => void
  updateCurrentExerciseWeight: (newWeight: number) => void
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

  updateCurrentExerciseWeight: (newWeight) => {
    const { generatedSession, currentExerciseIndex } = get()
    if (!generatedSession) return
    const exercises = [...generatedSession.exercises]
    const current = exercises[currentExerciseIndex]
    if (!current) return
    exercises[currentExerciseIndex] = { ...current, weightKg: newWeight }
    set({ generatedSession: { ...generatedSession, exercises } })
  },

  logSet: (repsActual, weightActual) => {
    const state = get()
    const {
      generatedSession,
      currentExerciseIndex,
      currentSetIndex,
      executedSets,
      executionMode,
      currentRound,
    } = state

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

    const navInput: NavigationInput = {
      executionMode,
      currentExerciseIndex,
      currentSetIndex,
      currentRound,
      totalExercises: generatedSession.exercises.length,
      currentExerciseSets: currentExercise.sets,
      allExerciseSets: generatedSession.exercises.map((e) => e.sets),
    }

    const nav = computeNextAfterLog(navInput, currentExercise.restSeconds)

    set({
      executedSets: updatedSets,
      currentExerciseIndex: nav.currentExerciseIndex,
      currentSetIndex: nav.currentSetIndex,
      currentRound: nav.currentRound,
      isFinished: nav.isFinished,
      isResting: nav.isResting,
      restSecondsRemaining: nav.restSecondsRemaining,
    })
  },

  skipSet: () => {
    const { generatedSession, currentExerciseIndex, currentSetIndex, executionMode, currentRound } =
      get()
    if (!generatedSession) return

    const currentExercise = generatedSession.exercises[currentExerciseIndex]
    if (!currentExercise) return

    const navInput: NavigationInput = {
      executionMode,
      currentExerciseIndex,
      currentSetIndex,
      currentRound,
      totalExercises: generatedSession.exercises.length,
      currentExerciseSets: currentExercise.sets,
      allExerciseSets: generatedSession.exercises.map((e) => e.sets),
    }

    const nav = computeNextAfterSkip(navInput)

    set({
      currentExerciseIndex: nav.currentExerciseIndex,
      currentSetIndex: nav.currentSetIndex,
      currentRound: nav.currentRound,
      isFinished: nav.isFinished,
      isResting: nav.isResting,
      restSecondsRemaining: nav.restSecondsRemaining,
    })
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

      const { templateId, mesocycleId } = generatedSession
      if (mesocycleId && mesocycleId !== 'quick') {
        await markTemplateCompleted(mesocycleId, templateId)
      }

      set({ isSaving: false })
    } catch (err) {
      set({ error: (err as Error).message, isSaving: false })
    }
  },

  reset: () => set({ ...initialState }),
}))
