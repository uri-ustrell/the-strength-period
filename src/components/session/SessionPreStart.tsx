import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Trash2, Repeat, ListOrdered } from 'lucide-react'

import { useSessionStore } from '@/stores/sessionStore'

export const SessionPreStart = () => {
  const { t } = useTranslation(['common', 'exercises', 'muscles'])

  const generatedSession = useSessionStore((s) => s.generatedSession)
  const executionMode = useSessionStore((s) => s.executionMode)
  const setExecutionMode = useSessionStore((s) => s.setExecutionMode)
  const startSession = useSessionStore((s) => s.startSession)
  const removeExerciseFromPreview = useSessionStore((s) => s.removeExerciseFromPreview)

  const orderedExercises = useMemo(() => {
    if (!generatedSession) return []
    return [...generatedSession.exercises]
  }, [generatedSession])

  if (!generatedSession) return null

  const handleStart = () => {
    startSession()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-xl font-bold text-gray-900">{t('common:session.preview_title')}</h1>
        <p className="text-sm text-gray-500">
          {orderedExercises.length} {t('common:session.exercises_count')} · ~
          {generatedSession.estimatedDurationMinutes} {t('common:session.minutes')}
        </p>

        {/* Execution mode selector */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {t('common:session.order_mode')}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setExecutionMode('standard')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                executionMode === 'standard'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ListOrdered size={16} />
              <div className="text-left">
                <div>{t('common:execution_mode.standard')}</div>
                <div
                  className={`text-xs ${executionMode === 'standard' ? 'text-indigo-200' : 'text-gray-400'}`}
                >
                  {t('common:execution_mode.standard_desc')}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setExecutionMode('circuit')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                executionMode === 'circuit'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Repeat size={16} />
              <div className="text-left">
                <div>{t('common:execution_mode.circuit')}</div>
                <div
                  className={`text-xs ${executionMode === 'circuit' ? 'text-indigo-200' : 'text-gray-400'}`}
                >
                  {t('common:execution_mode.circuit_desc')}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Exercise list */}
        <div className="space-y-2">
          {orderedExercises.map((se, index) => {
            const repsDisplay = Array.isArray(se.reps)
              ? `${se.reps[0]}-${se.reps[1]}`
              : String(se.reps)
            const representativeImage =
              se.exercise.images.find((img) => img.isRepresentative) ?? se.exercise.images[0]
            return (
              <div key={`${se.exercise.id}-${index}`} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {representativeImage && (
                      <img
                        src={representativeImage.url}
                        alt={representativeImage.alt}
                        className="h-10 w-10 rounded-lg object-cover bg-indigo-50 shrink-0 mt-0.5"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {t(se.exercise.nameKey, { ns: 'exercises', defaultValue: se.exercise.id })}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {se.exercise.primaryMuscles.map((m) => (
                          <span
                            key={m}
                            className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600"
                          >
                            {t(`muscles:${m}`)}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-3 text-xs text-gray-500">
                        <span>
                          {se.sets} {t('common:session.sets').toLowerCase()}
                        </span>
                        <span>
                          {repsDisplay} {t('common:session.reps').toLowerCase()}
                        </span>
                        {se.weightKg !== undefined && <span>{se.weightKg}kg</span>}
                        <span>
                          {se.restSeconds}s {t('common:session.rest').toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {orderedExercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExerciseFromPreview(index)}
                      className="ml-2 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      aria-label={t('common:session.remove_exercise')}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Start button */}
        <button
          type="button"
          onClick={handleStart}
          disabled={orderedExercises.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 text-white font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Play size={20} fill="white" />
          {t('common:session.start')}
        </button>
      </div>
    </div>
  )
}
