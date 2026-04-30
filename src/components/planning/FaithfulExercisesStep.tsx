import { ArrowDown, ArrowLeft, ArrowUp, Copy, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  blankExerciseEntry,
  blankSessionTemplate,
  MAX_TEMPLATES,
  MIN_TEMPLATES,
  nextAvailableTemplateKey,
  TEMPLATE_KEYS,
} from '@/services/planning/presetTemplates'
import { ALL_MUSCLE_GROUPS, muscleGroupNameKeys } from '@/data/muscleGroups'
import type { Exercise, MuscleGroup } from '@/types/exercise'
import type { PresetExerciseEntry, PresetSessionTemplate, TemplateKey } from '@/types/planning'

interface Props {
  editablePresetSessions: PresetSessionTemplate[]
  onSessionsChange: (sessions: PresetSessionTemplate[]) => void
  exercises: Exercise[]
  filteredExercisePool: Exercise[]
  onBack: () => void
  onGenerate: () => void
  /** When provided, parent is notified whenever the "all templates have ≥1 exercise" status changes. */
  onCompleteChange?: (isComplete: boolean) => void
  /** When provided, replaces the default "Generate" CTA with this label. */
  generateLabelKey?: string
  /** Disable the generate CTA from the parent (used when save validation fails). */
  generateDisabled?: boolean
  /** Exercise IDs that no longer exist in the catalog. Highlights affected rows + tabs. */
  missingExerciseIds?: string[]
  headerExtra?: React.ReactNode
}

export const FaithfulExercisesStep = ({
  editablePresetSessions,
  onSessionsChange,
  exercises,
  filteredExercisePool,
  onBack,
  onGenerate,
  onCompleteChange,
  generateLabelKey,
  generateDisabled,
  missingExerciseIds,
  headerExtra,
}: Props) => {
  const { t } = useTranslation(['planning', 'exercises'])

  const firstKey = editablePresetSessions[0]?.templateKey ?? 'A'
  const [activeKey, setActiveKey] = useState<TemplateKey>(firstKey)
  const [pickerForRow, setPickerForRow] = useState<number | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerMuscle, setPickerMuscle] = useState<MuscleGroup | null>(null)
  const [copyMenuOpen, setCopyMenuOpen] = useState(false)

  const missingSet = useMemo(() => new Set(missingExerciseIds ?? []), [missingExerciseIds])

  const isComplete = useMemo(
    () =>
      editablePresetSessions.length >= MIN_TEMPLATES &&
      editablePresetSessions.every((s) => s.exercises.length > 0),
    [editablePresetSessions]
  )

  useEffect(() => {
    onCompleteChange?.(isComplete)
  }, [isComplete, onCompleteChange])

  // If the active tab is no longer present (deletion), snap to the first remaining tab.
  useEffect(() => {
    const exists = editablePresetSessions.some((s) => s.templateKey === activeKey)
    if (!exists && editablePresetSessions[0]) {
      setActiveKey(editablePresetSessions[0].templateKey)
      setCopyMenuOpen(false)
      setPickerForRow(null)
    }
  }, [editablePresetSessions, activeKey])

  const tabHasMissing = (key: TemplateKey): boolean => {
    const session = editablePresetSessions.find((s) => s.templateKey === key)
    if (!session) return false
    return session.exercises.some((e) => missingSet.has(e.exerciseId))
  }

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>()
    for (const ex of exercises) map.set(ex.id, ex)
    return map
  }, [exercises])

  const activeIdx = useMemo(
    () => editablePresetSessions.findIndex((s) => s.templateKey === activeKey),
    [editablePresetSessions, activeKey]
  )
  const activeSession = activeIdx >= 0 ? editablePresetSessions[activeIdx] : undefined

  const pickerCandidates = useMemo(() => {
    const q = pickerSearch.toLowerCase().trim()
    return filteredExercisePool.filter((ex) => {
      if (pickerMuscle && !ex.primaryMuscles.includes(pickerMuscle)) return false
      if (!q) return true
      return t(ex.nameKey).toLowerCase().includes(q)
    })
  }, [pickerSearch, pickerMuscle, filteredExercisePool, t])

  const availableMuscleGroups = useMemo<MuscleGroup[]>(() => {
    const present = new Set<MuscleGroup>()
    for (const ex of filteredExercisePool) {
      for (const m of ex.primaryMuscles) present.add(m)
    }
    return ALL_MUSCLE_GROUPS.filter((m) => present.has(m))
  }, [filteredExercisePool])

  const updateActiveSession = (mut: (s: PresetSessionTemplate) => PresetSessionTemplate) => {
    if (activeIdx < 0) return
    const updated = editablePresetSessions.map((s, i) => (i === activeIdx ? mut(s) : s))
    onSessionsChange(updated)
  }

  const updateExercise = (rowIdx: number, mut: (e: PresetExerciseEntry) => PresetExerciseEntry) => {
    updateActiveSession((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => (i === rowIdx ? mut(e) : e)),
    }))
  }

  const handleAddExercise = () => {
    updateActiveSession((s) => ({ ...s, exercises: [...s.exercises, blankExerciseEntry()] }))
  }

  const handleRemoveExercise = (rowIdx: number) => {
    updateActiveSession((s) => ({
      ...s,
      exercises: s.exercises.filter((_, i) => i !== rowIdx),
    }))
  }

  const handleMoveExercise = (rowIdx: number, dir: -1 | 1) => {
    updateActiveSession((s) => {
      const next = [...s.exercises]
      const target = rowIdx + dir
      if (target < 0 || target >= next.length) return s
      const a = next[rowIdx]
      const b = next[target]
      if (!a || !b) return s
      next[rowIdx] = b
      next[target] = a
      return { ...s, exercises: next }
    })
  }

  const canDeleteTemplate = editablePresetSessions.length > MIN_TEMPLATES
  const canAddTemplate = editablePresetSessions.length < MAX_TEMPLATES

  const handleDeleteActiveTemplate = () => {
    if (!canDeleteTemplate || !activeSession) return
    const confirmed = window.confirm(
      t('planning:delete_template_confirm', {
        name: activeSession.name || activeSession.templateKey,
      })
    )
    if (!confirmed) return
    const updated = editablePresetSessions.filter(
      (s) => s.templateKey !== activeSession.templateKey
    )
    onSessionsChange(updated)
  }

  const handleAddTemplate = () => {
    if (!canAddTemplate) return
    const nextKey = nextAvailableTemplateKey(editablePresetSessions)
    if (!nextKey) return
    const updated = [...editablePresetSessions, blankSessionTemplate(nextKey)]
    onSessionsChange(updated)
    setActiveKey(nextKey)
  }

  const handleCopyTo = (targetKey: TemplateKey) => {
    if (!activeSession) return
    const cloned = activeSession.exercises.map((e) => ({ ...e }))
    const updated = editablePresetSessions.map((s) =>
      s.templateKey === targetKey ? { ...s, exercises: cloned } : s
    )
    onSessionsChange(updated)
    setCopyMenuOpen(false)
  }

  const handleSelectFromPicker = (exerciseId: string) => {
    if (pickerForRow === null) return
    updateExercise(pickerForRow, (e) => ({ ...e, exerciseId }))
    setPickerForRow(null)
    setPickerSearch('')
    setPickerMuscle(null)
  }

  const handleNameChange = (newName: string) => {
    updateActiveSession((s) => ({ ...s, name: newName }))
  }

  const otherKeys = editablePresetSessions.map((s) => s.templateKey).filter((k) => k !== activeKey)
  // Render tabs in canonical A→D order so deleting a middle tab does not reorder the rest.
  const visibleTabKeys = TEMPLATE_KEYS.filter((k) =>
    editablePresetSessions.some((s) => s.templateKey === k)
  )

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

      {headerExtra}

      <div className="flex items-stretch border-b border-gray-200">
        {visibleTabKeys.map((key) => {
          const session = editablePresetSessions.find((s) => s.templateKey === key)
          const label = session?.name || key
          const active = key === activeKey
          const isEmpty = (session?.exercises.length ?? 0) === 0
          const hasMissing = tabHasMissing(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveKey(key)}
              className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                active
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{label}</span>
              {hasMissing && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-red-500"
                  aria-label="missing exercises"
                />
              )}
              {!hasMissing && isEmpty && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400"
                  aria-label="empty template"
                />
              )}
            </button>
          )
        })}
        <button
          type="button"
          onClick={handleAddTemplate}
          disabled={!canAddTemplate}
          title={canAddTemplate ? t('planning:add_template') : t('planning:max_templates_warning')}
          aria-label={t('planning:add_template')}
          className="px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:text-gray-300 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
        </button>
      </div>

      {activeSession && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={activeSession.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={activeSession.templateKey}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label={t('planning:template_name')}
            />
            {otherKeys.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCopyMenuOpen((o) => !o)}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Copy size={14} />
                  {t('planning:copy_to')}
                </button>
                {copyMenuOpen && (
                  <div className="absolute right-0 mt-1 z-10 rounded-lg border border-gray-200 bg-white shadow-md py-1 min-w-[100px]">
                    {otherKeys.map((k) => {
                      const target = editablePresetSessions.find((s) => s.templateKey === k)
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleCopyTo(k)}
                          className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {target?.name || k}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleDeleteActiveTemplate}
              disabled={!canDeleteTemplate}
              title={
                canDeleteTemplate
                  ? t('planning:delete_template')
                  : t('planning:min_templates_warning')
              }
              aria-label={t('planning:delete_template')}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {activeSession.exercises.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                <p className="text-sm font-medium text-gray-600">
                  {t('planning:empty_template_title')}
                </p>
                <p className="mt-1 text-xs text-gray-400">{t('planning:empty_template_body')}</p>
              </div>
            )}
            {activeSession.exercises.map((entry, rowIdx) => {
              const exercise = exerciseMap.get(entry.exerciseId)
              const isPicking = pickerForRow === rowIdx
              const repsIsRange = Array.isArray(entry.reps)
              const isMissing = missingSet.has(entry.exerciseId)

              return (
                <div
                  key={`row-${rowIdx}-${entry.exerciseId}`}
                  className={`rounded-lg border p-3 space-y-2 ${
                    isMissing ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  {isMissing && (
                    <p className="text-xs font-medium text-red-700">
                      {t('planning:error_missing_exercises_row')}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPickerForRow(isPicking ? null : rowIdx)
                        setPickerSearch('')
                        setPickerMuscle(null)
                      }}
                      className="flex-1 text-left text-sm font-medium text-gray-800 hover:text-indigo-700 truncate"
                    >
                      {exercise
                        ? t(exercise.nameKey)
                        : entry.exerciseId || t('planning:add_exercise')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveExercise(rowIdx, -1)}
                      disabled={rowIdx === 0}
                      className="rounded p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      aria-label="up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveExercise(rowIdx, 1)}
                      disabled={rowIdx === activeSession.exercises.length - 1}
                      className="rounded p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      aria-label="down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(rowIdx)}
                      className="rounded p-1 text-gray-400 hover:text-red-600"
                      aria-label={t('planning:remove_exercise')}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {isPicking && (
                    <div className="rounded-lg border border-indigo-200 bg-white p-2 space-y-2">
                      {availableMuscleGroups.length > 0 && (
                        <div
                          role="toolbar"
                          aria-label={t('planning:faithful.filter_by_muscle')}
                          className="-mx-2 px-2 flex gap-1.5 overflow-x-auto pb-1"
                        >
                          {availableMuscleGroups.map((m) => {
                            const selected = pickerMuscle === m
                            return (
                              <button
                                key={m}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setPickerMuscle(selected ? null : m)}
                                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                                  selected
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                {t(muscleGroupNameKeys[m])}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      <input
                        type="text"
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        placeholder={t('planning:faithful.search_exercise')}
                        className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                        {pickerCandidates.length === 0 ? (
                          <p className="text-xs text-gray-400 py-1">
                            {t('planning:faithful.no_results')}
                          </p>
                        ) : (
                          pickerCandidates.slice(0, 20).map((cand) => {
                            const primary = cand.primaryMuscles[0]
                            return (
                              <button
                                key={cand.id}
                                type="button"
                                onClick={() => handleSelectFromPicker(cand.id)}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-gray-700 hover:bg-indigo-50"
                              >
                                {primary && (
                                  <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
                                    {t(muscleGroupNameKeys[primary])}
                                  </span>
                                )}
                                <span className="truncate">{t(cand.nameKey)}</span>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500">
                        {t('planning:faithful.sets')}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={entry.sets}
                        onChange={(e) =>
                          updateExercise(rowIdx, (x) => ({
                            ...x,
                            sets: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                          }))
                        }
                        className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="block text-xs text-gray-500">
                          {t('planning:faithful.reps')}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateExercise(rowIdx, (x) => {
                              if (Array.isArray(x.reps)) {
                                return { ...x, reps: x.reps[0] }
                              }
                              return { ...x, reps: [x.reps, x.reps + 2] as [number, number] }
                            })
                          }
                          className="text-[10px] uppercase tracking-wide text-indigo-600 hover:text-indigo-800"
                        >
                          {repsIsRange ? t('planning:reps_fixed') : t('planning:reps_range')}
                        </button>
                      </div>
                      {repsIsRange && Array.isArray(entry.reps) ? (
                        <div className="mt-0.5 flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={entry.reps[0]}
                            onChange={(e) => {
                              const lo = Math.max(1, Number(e.target.value) || 1)
                              updateExercise(rowIdx, (x) => {
                                const cur = Array.isArray(x.reps) ? x.reps : [lo, lo + 2]
                                const hi = Math.max(lo, cur[1] ?? lo)
                                return { ...x, reps: [lo, hi] as [number, number] }
                              })
                            }}
                            className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-gray-400">–</span>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={entry.reps[1]}
                            onChange={(e) => {
                              const hi = Math.max(1, Number(e.target.value) || 1)
                              updateExercise(rowIdx, (x) => {
                                const cur = Array.isArray(x.reps) ? x.reps : [hi, hi]
                                const lo = Math.min(hi, cur[0] ?? hi)
                                return { ...x, reps: [lo, hi] as [number, number] }
                              })
                            }}
                            className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={typeof entry.reps === 'number' ? entry.reps : entry.reps[0]}
                          onChange={(e) =>
                            updateExercise(rowIdx, (x) => ({
                              ...x,
                              reps: Math.max(1, Number(e.target.value) || 1),
                            }))
                          }
                          className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500">
                        {t('planning:faithful.rest')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={600}
                        step={5}
                        value={entry.restSeconds}
                        onChange={(e) =>
                          updateExercise(rowIdx, (x) => ({
                            ...x,
                            restSeconds: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500">kg</label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={entry.initialLoadKg ?? ''}
                        placeholder={t('planning:initial_load_auto')}
                        onChange={(e) => {
                          const raw = e.target.value
                          updateExercise(rowIdx, (x) => {
                            if (raw === '') {
                              const next: PresetExerciseEntry = { ...x }
                              delete next.initialLoadKg
                              return next
                            }
                            const v = Number(raw)
                            if (!Number.isFinite(v) || v <= 0) return x
                            return { ...x, initialLoadKg: v }
                          })
                        }}
                        className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleAddExercise}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-indigo-300 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            <Plus size={14} />
            {t('planning:add_exercise')}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={!isComplete || generateDisabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t(generateLabelKey ?? 'planning:next')}
      </button>
    </div>
  )
}
