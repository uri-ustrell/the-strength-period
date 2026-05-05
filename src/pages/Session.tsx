import { Repeat, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { SessionExecution } from '@/components/session/SessionExecution'
import { SessionPreStart } from '@/components/session/SessionPreStart'
import { SessionSummary } from '@/components/session/SessionSummary'
import { useSession } from '@/hooks/useSession'
import { buildSessionExecutionModel } from '@/services/session/buildSessionExecutionModel'
import { useSessionStore } from '@/stores/sessionStore'

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
