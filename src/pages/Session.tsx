import { Repeat, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { EarnAcknowledgement } from '@/components/session/EarnAcknowledgement'
import { SessionExecution } from '@/components/session/SessionExecution'
import { SessionPreStart } from '@/components/session/SessionPreStart'
import { SessionSummary } from '@/components/session/SessionSummary'
import { useSession } from '@/hooks/useSession'
import { listAllSessions, listAllSets } from '@/services/db/sessionRepository'
import { closeSessionAudio } from '@/services/audio/sessionAudio'
import { buildSessionCompletionTotemPayload } from '@/services/session/buildSessionCompletionTotemPayload'
import { buildSessionExecutionModel } from '@/services/session/buildSessionExecutionModel'
import { buildTotemInventoryModel } from '@/services/stats/buildTotemInventoryModel'
import { usePlanningStore } from '@/stores/planningStore'
import { useSessionStore } from '@/stores/sessionStore'
import type { ExecutedSession, ExecutedSet } from '@/types/session'

export const Session = () => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const {
    generatedSession,
    executedSets,
    executionMode,
    currentExerciseIndex,
    currentSetIndex,
    currentRound,
    totalRounds,
    isResting,
    sessionStartedAt,
    isFinished,
    isSaving,
    error,
    currentExercise,
    lastFinishedSessionId,
    lastFinishedSessionDateISO,
    lastFinishedSessionCompletedAtISO,
    logSet,
    skipSet,
    updateCurrentExerciseWeight,
    skipRest,
    finishEarly,
    finishSession,
    reset,
  } = useSession()

  // Read the per-second rest countdown directly from the store so the model
  // memo sees fresh values without forcing the whole page tree to subscribe
  // to it (the inner `RestTimer` already drives its own subscription).
  const restSecondsRemaining = useSessionStore((s) => s.restSecondsRemaining)

  const sessionExecutionModel = useMemo(
    () =>
      buildSessionExecutionModel({
        generatedSession,
        executedSets,
        executionMode,
        currentExerciseIndex,
        currentSetIndex,
        currentRound,
        totalRounds,
        isResting,
        restSecondsRemaining,
        sessionStartedAt,
        isFinished,
        nowMs: Date.now(),
      }),
    [
      generatedSession,
      executedSets,
      executionMode,
      currentExerciseIndex,
      currentSetIndex,
      currentRound,
      totalRounds,
      isResting,
      restSecondsRemaining,
      sessionStartedAt,
      isFinished,
    ]
  )

  const sessionExecutionActions = useMemo(
    () => ({ logSet, skipSet, skipRest, updateCurrentExerciseWeight }),
    [logSet, skipSet, skipRest, updateCurrentExerciseWeight]
  )

  const handleFinish = useCallback(
    async (globalRpe: number, notes?: string) => {
      await finishSession(globalRpe, notes)
      // If the IDB write failed, `finishSession` keeps `pendingSessionDraft`
      // and surfaces `error`. We MUST NOT reset/navigate here — that would
      // wipe the executed sets + draft and the session would be irrecoverable.
      // The `SessionSummary` already renders the error banner and the user
      // can retry by tapping Save again.
      if (useSessionStore.getState().error) return
      reset()
      navigate('/dashboard')
    },
    [finishSession, reset, navigate]
  )

  const handleDiscard = useCallback(() => {
    reset()
    navigate('/dashboard')
  }, [reset, navigate])

  const handleCancelClick = useCallback(() => {
    setShowCancelConfirm(true)
  }, [])

  const handleCancelConfirm = useCallback(() => {
    reset()
    navigate('/dashboard')
  }, [reset, navigate])

  const handleFinishEarly = useCallback(() => {
    finishEarly()
    setShowCancelConfirm(false)
  }, [finishEarly])

  // Release the cached `AudioContext`(s) the session audio service may
  // have allocated when the user navigates away from this page.
  useEffect(() => {
    return () => {
      closeSessionAudio()
    }
  }, [])

  // Step 16 Phase E sub-phase E1 — earn-acknowledgement payload pipeline.
  // Lazy-load the full session/set history exactly when `isFinished` flips to
  // true. The totem inventory model is time-window-agnostic (Phase D), so the
  // ack frame must be diffed against the entire history, not a window.
  const activeMesocycle = usePlanningStore((s) => s.activeMesocycle)
  const loadActiveMesocycle = usePlanningStore((s) => s.loadActive)
  const [allSessionsHistory, setAllSessionsHistory] = useState<ExecutedSession[]>([])
  const [allSetsHistory, setAllSetsHistory] = useState<ExecutedSet[]>([])
  /**
   * Step 16 Phase E sub-phase E1 (W4 fix) — gates the ack payload until the
   * IDB history fetch resolves. Without this, returning users see a brief
   * (~10–50 ms) false-positive flicker where entry-tier totems
   * (`first-session`, etc.) appear as "newly earned" because `totemsBefore`
   * is computed from an empty `allSessionsHistory` on the same render tick
   * `isFinished` flips to true.
   */
  const [historyLoaded, setHistoryLoaded] = useState(false)

  useEffect(() => {
    if (!isFinished) {
      setHistoryLoaded(false)
      return
    }
    let cancelled = false
    const fetchAll = async () => {
      if (!activeMesocycle) {
        await loadActiveMesocycle()
      }
      const [sessions, sets] = await Promise.all([listAllSessions(), listAllSets()])
      if (cancelled) return
      setAllSessionsHistory(sessions)
      setAllSetsHistory(sets)
      setHistoryLoaded(true)
    }
    fetchAll()
    return () => {
      cancelled = true
    }
  }, [isFinished, activeMesocycle, loadActiveMesocycle])

  // N1 fix: the just-finished session has not yet been persisted to IDB at the
  // moment `isFinished` flips, so `allSessionsHistory` (loaded from IDB) does
  // NOT contain it. Synthesize an in-memory `ExecutedSession` from the live
  // store state and merge it into the inputs for `totemsAfter` only \u2014 so the
  // ack frame can render BEFORE the user taps Save & close.
  const synthesizedJustFinished = useMemo<ExecutedSession | null>(() => {
    if (
      !isFinished ||
      !lastFinishedSessionId ||
      !lastFinishedSessionDateISO ||
      !generatedSession ||
      !sessionStartedAt
    ) {
      return null
    }
    return {
      id: lastFinishedSessionId,
      sessionTemplateId: generatedSession.templateId,
      date: lastFinishedSessionDateISO,
      startedAt: sessionStartedAt,
      // W5 fix: prefer the live mint timestamp from the store so future
      // time-of-day evaluators get the actual completion moment instead of
      // midnight UTC of the date string. Defensive fallback only.
      completedAt:
        lastFinishedSessionCompletedAtISO ??
        new Date(`${lastFinishedSessionDateISO}T00:00:00.000Z`).toISOString(),
      sets: executedSets.map((s) => ({ ...s, sessionId: lastFinishedSessionId })),
      skipped: false,
    }
  }, [
    isFinished,
    lastFinishedSessionId,
    lastFinishedSessionDateISO,
    lastFinishedSessionCompletedAtISO,
    generatedSession,
    sessionStartedAt,
    executedSets,
  ])

  const totemsAfter = useMemo(
    () =>
      buildTotemInventoryModel({
        executedSessions: synthesizedJustFinished
          ? [...allSessionsHistory, synthesizedJustFinished]
          : allSessionsHistory,
        executedSets: synthesizedJustFinished
          ? [...allSetsHistory, ...synthesizedJustFinished.sets]
          : allSetsHistory,
        mesocycles: activeMesocycle ? [activeMesocycle] : [],
        nowMs: Date.now(),
      }),
    [allSessionsHistory, allSetsHistory, activeMesocycle, synthesizedJustFinished]
  )

  const totemsBefore = useMemo(
    () =>
      buildTotemInventoryModel({
        executedSessions: allSessionsHistory.filter((s) => s.id !== lastFinishedSessionId),
        executedSets: allSetsHistory.filter((x) => x.sessionId !== lastFinishedSessionId),
        mesocycles: activeMesocycle ? [activeMesocycle] : [],
        nowMs: Date.now(),
      }),
    [allSessionsHistory, allSetsHistory, activeMesocycle, lastFinishedSessionId]
  )

  const totemAckPayload = useMemo(() => {
    // W4 fix: don't render the ack until the IDB history fetch resolves,
    // otherwise `totemsBefore` is computed from an empty list and entry-tier
    // totems flicker as false-positive newly earned for returning users.
    if (!historyLoaded) return null
    if (!lastFinishedSessionId || !lastFinishedSessionDateISO) return null
    return buildSessionCompletionTotemPayload({
      totemsBefore,
      totemsAfter,
      sessionId: lastFinishedSessionId,
      dateISO: lastFinishedSessionDateISO,
    })
  }, [historyLoaded, totemsBefore, totemsAfter, lastFinishedSessionId, lastFinishedSessionDateISO])

  const primaryName = useMemo(() => {
    if (!totemAckPayload) return ''
    const entry = totemsAfter.totems.find((x) => x.id === totemAckPayload.primaryTotemId)
    return entry ? t(entry.nameI18nKey) : ''
  }, [totemAckPayload, totemsAfter, t])

  const secondaryNames = useMemo<readonly string[]>(() => {
    if (!totemAckPayload) return []
    return totemAckPayload.newlyEarnedIds.slice(1).map((id) => {
      const entry = totemsAfter.totems.find((x) => x.id === id)
      return entry ? t(entry.nameI18nKey) : ''
    })
  }, [totemAckPayload, totemsAfter, t])

  if (!generatedSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6">
        <p className="text-gray-500">{t('session.no_session')}</p>
        <button
          type="button"
          onClick={() => navigate('/planning')}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white active:bg-indigo-700"
        >
          {t('session.go_planning')}
        </button>
      </div>
    )
  }

  if (!sessionStartedAt) {
    return <SessionPreStart />
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pb-24">
        <SessionSummary
          executedSets={executedSets}
          sessionStartedAt={sessionStartedAt}
          isSaving={isSaving}
          onFinish={handleFinish}
          onDiscard={handleDiscard}
          topAccessory={
            <EarnAcknowledgement
              payload={totemAckPayload}
              primaryName={primaryName}
              secondaryNames={secondaryNames}
            />
          }
        />
        {error && <p className="mt-3 text-center text-sm text-red-600">{t('errors.db_error')}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Cancel button */}
        <div className="flex items-center justify-between">
          {/* Circuit round indicator (read-only) */}
          {executionMode === 'circuit' ? (
            <div className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5">
              <Repeat size={14} className="text-indigo-600" />
              <span className="text-sm font-medium text-indigo-700">
                {t('execution_mode.circuit_round', {
                  current: currentRound + 1,
                  total: totalRounds,
                })}
              </span>
            </div>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleCancelClick}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <X size={16} />
            {t('session_control.cancel')}
          </button>
        </div>

        {/* Cancel confirmation dialog */}
        {showCancelConfirm && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
            <p className="text-sm text-red-800">{t('session_control.discard_confirm')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 rounded-lg bg-white border border-gray-300 py-2 text-sm font-medium text-gray-700"
              >
                {t('session_control.keep_training')}
              </button>
              {executedSets.length > 0 && (
                <button
                  type="button"
                  onClick={handleFinishEarly}
                  className="flex-1 rounded-lg bg-indigo-100 py-2 text-sm font-medium text-indigo-700"
                >
                  {t('session_control.save_partial')}
                </button>
              )}
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white"
              >
                {t('session_control.discard')}
              </button>
            </div>
          </div>
        )}

        {currentExercise && (
          <SessionExecution model={sessionExecutionModel} actions={sessionExecutionActions} />
        )}

        {error && <p className="text-center text-sm text-red-600">{t('errors.generic')}</p>}
      </div>
    </div>
  )
}
