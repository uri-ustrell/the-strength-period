import { create } from 'zustand'
import { playRestEndChime } from '@/services/audio/sessionAudio'
import { markTemplateCompleted, saveSession } from '@/services/db/sessionRepository'
import type { GeneratedSession } from '@/services/exercises/sessionGenerator'
import type { NavigationInput } from '@/services/session/sessionNavigation'
import { computeNextAfterLog, computeNextAfterSkip } from '@/services/session/sessionNavigation'
import type { ExecutedSession, ExecutedSet } from '@/types/session'

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
  /** Epoch ms when the current rest interval ends. Null when not resting. Drives a
   *  background-safe countdown: tickRest recomputes from Date.now() so the timer
   *  catches up after the tab was throttled or backgrounded. */
  restEndsAt: number | null
  sessionStartedAt: string | null

  // UI state
  isFinished: boolean
  isSaving: boolean
  error: string | null
  /** When `finishSession` is in flight or has failed once, we keep the generated
   *  IDs/timestamps here so a retry doesn't duplicate the row in IDB with a fresh
   *  UUID and a slightly later `completedAt`. Cleared on success or on `reset`. */
  pendingSessionDraft: { sessionId: string; completedAt: string } | null
  /**
   * Step 16 Phase E sub-phase E1 — last successfully finished session id.
   * Persists across the cleared `pendingSessionDraft` so the page-level
   * earn-acknowledgement effect can identify which session to diff against.
   * Cleared by `reset`. `null` until at least one session has been saved
   * via `finishSession`.
   */
  lastFinishedSessionId: string | null
  /** ISO `YYYY-MM-DD` of `lastFinishedSessionId`. Derived from `completedAt`. */
  lastFinishedSessionDateISO: string | null
  /**
   * Step 16 Phase E sub-phase E1 (W5 fix) — full ISO timestamp of the moment
   * the session flipped to finished (mint time). Carried alongside
   * `lastFinishedSessionId` so the page-level synthesized `ExecutedSession`
   * can use the real `completedAt` instead of midnight-UTC of the date
   * string. Cleared by `reset`.
   */
  lastFinishedSessionCompletedAtISO: string | null

  // Actions
  setPreviewSession: (session: GeneratedSession) => void
  removeExerciseFromPreview: (index: number) => void
  startSession: (session?: GeneratedSession) => void
  setExecutionMode: (mode: ExecutionMode) => void
  logSet: (repsActual: number, weightActual?: number, isWarmup?: boolean) => void
  skipSet: () => void
  updateCurrentExerciseWeight: (newWeight: number) => void
  startRest: (seconds: number) => void
  tickRest: () => void
  skipRest: () => void
  finishEarly: () => void
  finishSession: (globalRpe: number, notes?: string) => Promise<void>
  reset: () => void
}

const toDateString = (iso: string): string => iso.slice(0, 10)

/**
 * Step 16 Phase E sub-phase E1 (N1 fix) — at the moment `isFinished` flips to
 * true (auto-finish via the last set, or `finishEarly`) we mint the session id
 * + `completedAt` and expose them on the store so the page-level
 * earn-acknowledgement pipeline can render synchronously, BEFORE the user
 * taps Save & close. The same draft is later reused inside `finishSession`
 * so the eventually-persisted IDB row carries the same id the ack frame
 * keyed off — no duplicate row, no id drift.
 */
const buildFinishMeta = () => {
  const completedAt = new Date().toISOString()
  const sessionId = crypto.randomUUID()
  return {
    pendingSessionDraft: { sessionId, completedAt },
    lastFinishedSessionId: sessionId,
    lastFinishedSessionDateISO: toDateString(completedAt),
    lastFinishedSessionCompletedAtISO: completedAt,
  }
}

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
  restEndsAt: null,
  sessionStartedAt: null,
  isFinished: false,
  isSaving: false,
  error: null,
  pendingSessionDraft: null,
  lastFinishedSessionId: null,
  lastFinishedSessionDateISO: null,
  lastFinishedSessionCompletedAtISO: null,
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  setPreviewSession: (session) => {
    // Reset all transient session state when a new preview is loaded so we can't
    // inherit isFinished/executedSets/etc. from a previous run that would otherwise
    // skip straight to the summary screen.
    set({
      ...initialState,
      generatedSession: session,
    })
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

  logSet: (repsActual, weightActual, isWarmup) => {
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
      ...(isWarmup ? { isWarmup: true } : {}),
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
      restEndsAt:
        nav.isResting && nav.restSecondsRemaining > 0
          ? Date.now() + nav.restSecondsRemaining * 1000
          : null,
      ...(nav.isFinished ? buildFinishMeta() : {}),
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
      restEndsAt:
        nav.isResting && nav.restSecondsRemaining > 0
          ? Date.now() + nav.restSecondsRemaining * 1000
          : null,
      ...(nav.isFinished ? buildFinishMeta() : {}),
    })
  },

  startRest: (seconds) => {
    set({
      isResting: true,
      restSecondsRemaining: seconds,
      restEndsAt: Date.now() + seconds * 1000,
    })
  },

  tickRest: () => {
    const { restEndsAt } = get()
    if (restEndsAt === null) return
    const remaining = Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000))
    if (remaining <= 0) {
      // Fire the rest-end chime BEFORE clearing the rest state. The
      // RestTimer component would otherwise unmount on the same tick that
      // sees `secondsRemaining === 0`, so a render-driven chime never gets
      // a chance to fire (the RetroPlatformer C9 audio surface depends on
      // this). The audio service short-circuits when the variant is not
      // `retro-platformer`, so classic remains silent.
      playRestEndChime()
      set({ isResting: false, restSecondsRemaining: 0, restEndsAt: null })
    } else {
      set({ restSecondsRemaining: remaining })
    }
  },

  skipRest: () => {
    set({ isResting: false, restSecondsRemaining: 0, restEndsAt: null })
  },

  finishEarly: () => {
    set({
      isFinished: true,
      isResting: false,
      restEndsAt: null,
      restSecondsRemaining: 0,
      ...buildFinishMeta(),
    })
  },

  finishSession: async (globalRpe, notes) => {
    const state = get()
    const { generatedSession, executedSets, sessionStartedAt } = state

    if (!generatedSession || !sessionStartedAt) return

    // Reuse the draft from a previous failed attempt so we never write two rows
    // with different IDs but the same logical session.
    const draft = state.pendingSessionDraft ?? {
      sessionId: crypto.randomUUID(),
      completedAt: new Date().toISOString(),
    }

    set({ isSaving: true, error: null, pendingSessionDraft: draft })

    try {
      const setsWithSessionId = executedSets.map((s) => ({
        ...s,
        sessionId: draft.sessionId,
      }))

      const session: ExecutedSession = {
        id: draft.sessionId,
        sessionTemplateId: generatedSession.templateId,
        date: toDateString(draft.completedAt),
        startedAt: sessionStartedAt,
        completedAt: draft.completedAt,
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

      set({
        isSaving: false,
        pendingSessionDraft: null,
        lastFinishedSessionId: draft.sessionId,
        lastFinishedSessionDateISO: toDateString(draft.completedAt),
        lastFinishedSessionCompletedAtISO: draft.completedAt,
      })
    } catch (err) {
      set({ error: (err as Error).message, isSaving: false })
    }
  },

  reset: () => set({ ...initialState }),
}))
