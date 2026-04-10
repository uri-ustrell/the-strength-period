import { ArrowLeft, ArrowRightLeft, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Exercise } from '@/types/exercise'
import type { PresetExerciseEntry, PresetSessionTemplate } from '@/types/planning'

interface Props {
  editablePresetSessions: PresetSessionTemplate[]
  onSessionsChange: (sessions: PresetSessionTemplate[]) => void
  exercises: Exercise[]
  filteredExercisePool: Exercise[]
  onBack: () => void
  onGenerate: () => void
}

export const FaithfulExercisesStep = ({
  editablePresetSessions,
  onSessionsChange,
  exercises,
  filteredExercisePool,
  onBack,
  onGenerate,
}: Props) => {
  const { t } = useTranslation(['planning', 'exercises'])

  const [expandedSessions, setExpandedSessions] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {}
    for (let i = 0; i < editablePresetSessions.length; i++) {
      initial[i] = i === 0
    }
    return initial
  })

  const [swappingExercise, setSwappingExercise] = useState<{
    sessionIdx: number
    exerciseIdx: number
  } | null>(null)
  const [swapSearch, setSwapSearch] = useState('')

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>()
    for (const ex of exercises) {
      map.set(ex.id, ex)
    }
    return map
  }, [exercises])

  const swapCandidates = useMemo(() => {
    if (!swappingExercise) return []
    const q = swapSearch.toLowerCase().trim()
    return filteredExercisePool.filter((ex) => {
      if (!q) return true
      const name = t(ex.nameKey).toLowerCase()
      return name.includes(q)
    })
  }, [swappingExercise, swapSearch, filteredExercisePool, t])

  const toggleSession = (idx: number) => {
    setExpandedSessions((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  const updateExerciseField = (
    sessionIdx: number,
    exerciseIdx: number,
    field: keyof Pick<PresetExerciseEntry, 'sets' | 'restSeconds' | 'reps'>,
    value: number
  ) => {
    const updated = editablePresetSessions.map((session, si) => {
      if (si !== sessionIdx) return session
      return {
        ...session,
        exercises: session.exercises.map((ex, ei) => {
          if (ei !== exerciseIdx) return ex
          return { ...ex, [field]: value }
        }),
      }
    })
    onSessionsChange(updated)
  }

  const handleSwapExercise = (newExerciseId: string) => {
    if (!swappingExercise) return
    const { sessionIdx, exerciseIdx } = swappingExercise
    const newExercise = exerciseMap.get(newExerciseId)
    if (!newExercise) return

    const updated = editablePresetSessions.map((session, si) => {
      if (si !== sessionIdx) return session
      return {
        ...session,
        exercises: session.exercises.map((ex, ei) => {
          if (ei !== exerciseIdx) return ex
          return { ...ex, exerciseId: newExerciseId }
        }),
      }
    })
    onSessionsChange(updated)
    setSwappingExercise(null)
    setSwapSearch('')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('planning:faithful.exercises_title')}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('planning:faithful.exercises_desc')}</p>
        </div>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {editablePresetSessions.map((session, sessionIdx) => {
          const isExpanded = expandedSessions[sessionIdx] ?? false
          const label =
            session.label ?? t('planning:faithful.session_label', { index: sessionIdx + 1 })

          return (
            <div
              key={session.label ?? `session-${sessionIdx}`}
              className="rounded-xl border border-gray-200 bg-white"
            >
              <button
                type="button"
                onClick={() => toggleSession(sessionIdx)}
                className="flex w-full items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{label}</span>
                  {session.isDeload && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {t('planning:faithful.deload_session')}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {session.exercises.length} {t('planning:select_exercises').toLowerCase()}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                  {session.exercises.map((entry, exerciseIdx) => {
                    const exercise = exerciseMap.get(entry.exerciseId)
                    const exerciseKey = `${sessionIdx}-${entry.exerciseId}-${exerciseIdx}`
                    const isSwapping =
                      swappingExercise?.sessionIdx === sessionIdx &&
                      swappingExercise?.exerciseIdx === exerciseIdx

                    return (
                      <div
                        key={exerciseKey}
                        className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800">
                            {exercise ? t(exercise.nameKey) : entry.exerciseId}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (isSwapping) {
                                setSwappingExercise(null)
                                setSwapSearch('')
                              } else {
                                setSwappingExercise({ sessionIdx, exerciseIdx })
                              }
                            }}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            {isSwapping ? <X size={12} /> : <ArrowRightLeft size={12} />}
                            {t('planning:faithful.swap_exercise')}
                          </button>
                        </div>

                        {/* Editable fields */}
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                          <div>
                            <label
                              htmlFor={`sets-${sessionIdx}-${exerciseIdx}`}
                              className="block text-xs text-gray-500"
                            >
                              {t('planning:faithful.sets')}
                            </label>
                            <input
                              id={`sets-${sessionIdx}-${exerciseIdx}`}
                              type="number"
                              min={1}
                              max={10}
                              value={entry.sets}
                              onChange={(e) =>
                                updateExerciseField(
                                  sessionIdx,
                                  exerciseIdx,
                                  'sets',
                                  Math.max(1, Number(e.target.value) || 1)
                                )
                              }
                              className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`reps-${sessionIdx}-${exerciseIdx}`}
                              className="block text-xs text-gray-500"
                            >
                              {t('planning:faithful.reps')}
                            </label>
                            <input
                              id={`reps-${sessionIdx}-${exerciseIdx}`}
                              type="number"
                              min={1}
                              max={100}
                              value={Array.isArray(entry.reps) ? entry.reps[0] : entry.reps}
                              onChange={(e) =>
                                updateExerciseField(
                                  sessionIdx,
                                  exerciseIdx,
                                  'reps',
                                  Math.max(1, Number(e.target.value) || 1)
                                )
                              }
                              className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`rest-${sessionIdx}-${exerciseIdx}`}
                              className="block text-xs text-gray-500"
                            >
                              {t('planning:faithful.rest')}
                            </label>
                            <input
                              id={`rest-${sessionIdx}-${exerciseIdx}`}
                              type="number"
                              min={0}
                              max={600}
                              step={5}
                              value={entry.restSeconds}
                              onChange={(e) =>
                                updateExerciseField(
                                  sessionIdx,
                                  exerciseIdx,
                                  'restSeconds',
                                  Math.max(0, Number(e.target.value) || 0)
                                )
                              }
                              className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          {entry.tempo && (
                            <div>
                              <span className="block text-xs text-gray-500">
                                {t('planning:faithful.tempo')}
                              </span>
                              <span className="mt-0.5 block text-sm text-gray-600">
                                {entry.tempo}
                              </span>
                            </div>
                          )}
                          {entry.rpe !== undefined && (
                            <div>
                              <span className="block text-xs text-gray-500">
                                {t('planning:faithful.rpe')}
                              </span>
                              <span className="mt-0.5 block text-sm text-gray-600">
                                {entry.rpe}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Swap panel */}
                        {isSwapping && (
                          <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-2 space-y-2">
                            <input
                              type="text"
                              value={swapSearch}
                              onChange={(e) => setSwapSearch(e.target.value)}
                              placeholder={t('planning:faithful.search_exercise')}
                              className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <div className="max-h-32 overflow-y-auto space-y-0.5">
                              {swapCandidates.length === 0 ? (
                                <p className="text-xs text-gray-400 py-1">
                                  {t('planning:faithful.no_results')}
                                </p>
                              ) : (
                                swapCandidates.slice(0, 20).map((candidate) => (
                                  <button
                                    key={candidate.id}
                                    type="button"
                                    onClick={() => handleSwapExercise(candidate.id)}
                                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-gray-700 hover:bg-indigo-100 transition-colors"
                                  >
                                    {t(candidate.nameKey)}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onGenerate}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors"
      >
        {t('planning:generate_instant')}
      </button>
    </div>
  )
}
