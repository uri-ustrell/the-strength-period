import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, X, ChevronDown, ChevronUp } from 'lucide-react'

import type { Preset } from '@/data/presets'
import type { CustomPreset } from '@/data/presets'
import type { UserConfig } from '@/types/user'
import type { MuscleGroup, Exercise, ExerciseTag, DayOfWeek } from '@/types/exercise'
import { PRESETS } from '@/data/presets'
import { getConfig, setConfig } from '@/services/db/configRepository'
import { usePlanningStore } from '@/stores/planningStore'
import { useUserStore } from '@/stores/userStore'
import { useExercises } from '@/hooks/useExercises'
import { filterExercises } from '@/services/exercises/exerciseFilter'
import { SessionPreview } from '@/components/planning/SessionPreview'
import { LLMAssistant } from '@/components/planning/LLMAssistant'
import { ALL_MUSCLE_GROUPS } from '@/data/muscleGroups'
import {
  presetToMuscleGroupPriorities,
  buildMuscleDistribution,
  prioritiesToMuscleDistribution,
} from '@/services/planning/muscleDistribution'
import type { MuscleGroupPriority } from '@/services/planning/muscleDistribution'

type Step = 'preset' | 'configure' | 'muscles' | 'exercises' | 'preview' | 'llm-assistant'

interface Props {
  onComplete?: () => void
}

export const PlanCreator = ({ onComplete }: Props) => {
  const { t } = useTranslation(['planning', 'common', 'exercises', 'muscles'])
  const { exercises } = useExercises()

  const equipment = useUserStore((s) => s.equipment)
  const userTrainingDays = useUserStore((s) => s.trainingDays)
  const userMinutes = useUserStore((s) => s.minutesPerSession)
  const activeRestrictions = useUserStore((s) => s.activeRestrictions)
  const availableWeightsState = useUserStore((s) => s.availableWeights)

  const generate = usePlanningStore((s) => s.generate)
  const saveGenerated = usePlanningStore((s) => s.saveGenerated)
  const discardGenerated = usePlanningStore((s) => s.discardGenerated)
  const generatedPreview = usePlanningStore((s) => s.generatedPreview)
  const setGeneratedPreview = usePlanningStore((s) => s.setGeneratedPreview)
  const error = usePlanningStore((s) => s.error)

  const [step, setStep] = useState<Step>('preset')
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)
  const [weeks, setWeeks] = useState(8)
  const [daysPerWeek, setDaysPerWeek] = useState(userTrainingDays.length)
  const [minutesPerSess, setMinutesPerSess] = useState(userMinutes)
  const [muscleGroupPriorities, setMuscleGroupPriorities] = useState<
    Record<MuscleGroup, MuscleGroupPriority | null>
  >(() => {
    const initial: Record<string, MuscleGroupPriority | null> = {}
    for (const mg of ALL_MUSCLE_GROUPS) {
      initial[mg] = 'medium'
    }
    return initial as Record<MuscleGroup, MuscleGroupPriority | null>
  })
  const [weeklyProgression, setWeeklyProgression] = useState(5)

  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([])
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState('')

  // Exercise step state
  const [autoSelectExercises, setAutoSelectExercises] = useState(true)
  const [exerciseSelections, setExerciseSelections] = useState<Record<string, string[]>>({})
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  // Preset filter state
  const [presetSearch, setPresetSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<ExerciseTag[]>([])

  // Collect all unique tags from presets for the tag filter
  const allPresetTags = useMemo(() => {
    const tags = new Set<ExerciseTag>()
    for (const p of PRESETS) {
      for (const tag of p.requiredTags) tags.add(tag)
    }
    return Array.from(tags)
  }, [])

  const filteredPresets = useMemo(() => {
    return PRESETS.filter((p) => {
      if (presetSearch.trim()) {
        const name = t(p.nameKey).toLowerCase()
        const desc = t(p.descriptionKey).toLowerCase()
        const q = presetSearch.toLowerCase()
        if (!name.includes(q) && !desc.includes(q)) return false
      }
      if (selectedTags.length > 0) {
        if (!selectedTags.some((tag) => p.requiredTags.includes(tag))) return false
      }
      return true
    })
  }, [presetSearch, selectedTags, t])
  useEffect(() => {
    const loadCustomPresets = async () => {
      const stored = (await getConfig('customPresets')) as CustomPreset[] | null
      if (stored) setCustomPresets(stored)
    }
    loadCustomPresets()
  }, [])

  const filteredExercisePool = useMemo(() => {
    return filterExercises(exercises, {
      equipment,
      excludeRestrictions: activeRestrictions,
    })
  }, [exercises, equipment, activeRestrictions])

  const availableMuscleGroups = useMemo(() => {
    return ALL_MUSCLE_GROUPS.filter((mg) =>
      filteredExercisePool.some(
        (ex) => ex.primaryMuscles.includes(mg) || ex.secondaryMuscles.includes(mg)
      )
    )
  }, [filteredExercisePool])

  const activeMuscleGroups = useMemo(() => {
    return Object.entries(muscleGroupPriorities)
      .filter(([mg, p]) => p !== null && availableMuscleGroups.includes(mg as MuscleGroup))
      .map(([mg]) => mg as MuscleGroup)
  }, [muscleGroupPriorities, availableMuscleGroups])

  const exercisesByMuscle = useMemo(() => {
    const map: Record<string, Exercise[]> = {}
    for (const mg of activeMuscleGroups) {
      map[mg] = filteredExercisePool.filter(
        (ex) => ex.primaryMuscles.includes(mg) || ex.secondaryMuscles.includes(mg)
      )
    }
    return map
  }, [activeMuscleGroups, filteredExercisePool])

  const handleSelectPreset = (preset: Preset | null) => {
    setSelectedPreset(preset)
    if (preset) {
      setWeeks(preset.durationOptions[0] ?? 8)
    }
    setMuscleGroupPriorities(presetToMuscleGroupPriorities(preset))
    setStep('configure')
  }

  const handleSelectCustomPreset = (cp: CustomPreset) => {
    setSelectedPreset(null)
    setWeeks(cp.durationWeeks)

    const priorities: Record<string, MuscleGroupPriority | null> = {}
    for (const mg of ALL_MUSCLE_GROUPS) {
      priorities[mg] = null
    }
    for (const [mg, pct] of Object.entries(cp.muscleDistribution)) {
      if (ALL_MUSCLE_GROUPS.includes(mg as MuscleGroup)) {
        if (pct >= 25) priorities[mg] = 'high'
        else if (pct >= 10) priorities[mg] = 'medium'
        else priorities[mg] = 'low'
      }
    }
    setMuscleGroupPriorities(priorities as Record<MuscleGroup, MuscleGroupPriority | null>)
    setStep('configure')
  }

  const handleDeleteCustomPreset = async (id: string) => {
    const updated = customPresets.filter((p) => p.id !== id)
    await setConfig('customPresets', updated)
    setCustomPresets(updated)
  }

  const handleSaveAsPreset = async () => {
    const name = presetName.trim()
    if (!name) return

    const muscleDistribution = prioritiesToMuscleDistribution(muscleGroupPriorities)

    const newPreset: CustomPreset = {
      id: `custom_${crypto.randomUUID()}`,
      name,
      durationWeeks: weeks,
      muscleDistribution,
      createdAt: new Date().toISOString(),
    }

    const updated = [...customPresets, newPreset]
    await setConfig('customPresets', updated)
    setCustomPresets(updated)
    setShowSavePreset(false)
    setPresetName('')
  }

  const handleGenerate = () => {
    const muscleDistribution = buildMuscleDistribution(muscleGroupPriorities)

    // Build trainingDays from daysPerWeek override
    let trainingDays: DayOfWeek[] = userTrainingDays
    if (daysPerWeek !== userTrainingDays.length) {
      // Generate evenly spaced days
      const spacing = 7 / daysPerWeek
      trainingDays = Array.from(
        { length: daysPerWeek },
        (_, i) => Math.min(7, Math.max(1, Math.round(1 + i * spacing))) as DayOfWeek
      )
    }

    const config: UserConfig = {
      language: 'ca',
      equipment,
      trainingDays,
      minutesPerSession: minutesPerSess,
      activeRestrictions,
      onboardingCompleted: true,
      availableWeights: availableWeightsState,
    }

    generate(selectedPreset?.id ?? 'forca_general', config, exercises, {
      weeks,
      muscleDistribution,
      weeklyProgression,
      exerciseSelections: autoSelectExercises ? undefined : exerciseSelections,
    })
    setStep('preview')
  }

  const handleSave = async () => {
    await saveGenerated()
    onComplete?.()
  }

  const handleDiscard = () => {
    discardGenerated()
    setStep('preset')
    setSelectedPreset(null)
  }

  const toggleExerciseSelection = (mg: string, exId: string) => {
    setExerciseSelections((prev) => {
      const current = prev[mg] ?? []
      const next = current.includes(exId) ? current.filter((id) => id !== exId) : [...current, exId]
      return { ...prev, [mg]: next }
    })
  }

  const toggleGroupExpanded = (mg: string) => {
    setExpandedGroups((prev) => ({ ...prev, [mg]: !prev[mg] }))
  }

  if (step === 'preset') {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{t('planning:selectPreset')}</h2>

        {/* Search filter */}
        <input
          type="text"
          value={presetSearch}
          onChange={(e) => setPresetSearch(e.target.value)}
          placeholder={t('planning:search_presets')}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />

        {/* Tag filter */}
        {allPresetTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allPresetTags.map((tag) => {
              const active = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setSelectedTags((prev) =>
                      active ? prev.filter((t) => t !== tag) : [...prev, tag]
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    active
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                  }`}
                >
                  {t(`planning:preset_tags.${tag}`)}
                </button>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {filteredPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="rounded-xl border-2 border-gray-200 p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50"
            >
              <h3 className="font-medium text-sm text-gray-900">{t(preset.nameKey)}</h3>
              <p className="mt-1 text-xs text-gray-500">{t(preset.descriptionKey)}</p>
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleSelectPreset(null)}
            className="rounded-xl border-2 border-dashed border-gray-300 p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50"
          >
            <h3 className="font-medium text-sm text-gray-900">{t('planning:custom')}</h3>
            <p className="mt-1 text-xs text-gray-500">{t('planning:custom_desc')}</p>
          </button>
        </div>

        {customPresets.length > 0 && (
          <>
            <h3 className="text-sm font-medium text-gray-500 mt-4">
              {t('planning:saved_presets')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {customPresets.map((cp) => (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => handleSelectCustomPreset(cp)}
                  className="rounded-xl border-2 border-gray-200 p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50 relative group"
                >
                  <h3 className="font-medium text-sm text-gray-900">{cp.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {cp.durationWeeks} {t('planning:weeks')}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCustomPreset(cp.id)
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded-full p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                    aria-label={t('planning:delete_preset')}
                  >
                    <X size={14} />
                  </button>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  if (step === 'configure') {
    const durationOptions = selectedPreset?.durationOptions ?? [4, 6, 8, 12]
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep('preset')}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{t('planning:configure')}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('planning:selectDuration')}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {durationOptions.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeeks(w)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    weeks === w
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {w} {t('planning:weeks')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('planning:days_per_week')}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaysPerWeek(d)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    daysPerWeek === d
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('planning:minutes_per_session')}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[30, 45, 60, 75, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutesPerSess(m)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    minutesPerSess === m
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {m} {t('common:dashboard.minutes')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('planning:weekly_progression')}
          </label>
          <p className="text-xs text-gray-400 mt-0.5">{t('planning:weekly_progression_desc')}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-gray-400 w-20">
              {t('planning:progression_maintenance')}
            </span>
            <input
              type="range"
              min={0}
              max={10}
              value={weeklyProgression}
              onChange={(e) => setWeeklyProgression(Number(e.target.value))}
              className="flex-1 accent-indigo-600"
            />
            <span className="text-xs text-gray-400 w-16 text-right">
              {t('planning:progression_aggressive')}
            </span>
          </div>
          <div className="mt-1 text-center text-sm font-medium text-indigo-600">
            {weeklyProgression}/10
          </div>
        </div>

        <button
          type="button"
          onClick={() => setStep('muscles')}
          disabled={exercises.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {t('planning:next')}
        </button>

        <div className="flex items-center gap-3">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400">{t('planning:llm.or_separator')}</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        <button
          type="button"
          onClick={() => setStep('llm-assistant')}
          disabled={filteredExercisePool.length === 0}
          className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-indigo-200 py-3 text-indigo-700 font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50"
        >
          <span>✨ {t('planning:llm.use_llm')}</span>
          <span className="text-xs font-normal text-gray-500">
            {t('planning:llm.use_llm_desc')}
          </span>
        </button>
      </div>
    )
  }

  if (step === 'muscles') {
    const handlePriorityChange = (mg: MuscleGroup, value: string) => {
      setMuscleGroupPriorities((prev) => ({
        ...prev,
        [mg]: value === 'off' ? null : (value as MuscleGroupPriority),
      }))
    }

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep('configure')}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('planning:select_muscle_groups')}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('planning:muscle_group_explanation')}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400">{t('planning:muscle_group_helper')}</p>

        {/* Muscle group grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availableMuscleGroups.map((mg) => {
            const priority = muscleGroupPriorities[mg]
            return (
              <div
                key={mg}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
              >
                <span className="text-sm text-gray-700">{t(`muscles:${mg}`)}</span>
                <select
                  value={priority ?? 'off'}
                  onChange={(e) => handlePriorityChange(mg, e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="high">{t('planning:muscle_priority_high')}</option>
                  <option value="medium">{t('planning:muscle_priority_medium')}</option>
                  <option value="low">{t('planning:muscle_priority_low')}</option>
                  <option value="off">{t('planning:muscle_priority_off')}</option>
                </select>
              </div>
            )
          })}
        </div>

        <div className="space-y-2">
          {!showSavePreset ? (
            <button
              type="button"
              onClick={() => setShowSavePreset(true)}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {t('planning:save_as_preset')}
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={t('planning:preset_name_placeholder')}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleSaveAsPreset}
                disabled={!presetName.trim()}
                className="rounded-lg bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 disabled:opacity-50"
              >
                {t('planning:save')}
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400">{t('planning:algorithm_distributes')}</p>

        <button
          type="button"
          onClick={() => setStep('exercises')}
          disabled={exercises.length === 0 || !Object.values(muscleGroupPriorities).some(Boolean)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {t('planning:next')}
        </button>
      </div>
    )
  }

  if (step === 'exercises') {
    const canGenerate =
      autoSelectExercises ||
      activeMuscleGroups.every((mg) => (exerciseSelections[mg]?.length ?? 0) > 0)

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep('muscles')}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('planning:select_exercises')}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('planning:select_exercises_desc')}</p>
          </div>
        </div>

        {/* Auto/Manual toggle */}
        <div className="space-y-2">
          <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 cursor-pointer">
            <input
              type="radio"
              checked={autoSelectExercises}
              onChange={() => setAutoSelectExercises(true)}
              className="mt-0.5 h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                {t('planning:auto_select_all')}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">{t('planning:auto_select_all_desc')}</p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 cursor-pointer">
            <input
              type="radio"
              checked={!autoSelectExercises}
              onChange={() => setAutoSelectExercises(false)}
              className="mt-0.5 h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                {t('planning:manual_select')}
              </span>
            </div>
          </label>
        </div>

        {/* Manual exercise selection */}
        {!autoSelectExercises && (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {activeMuscleGroups.map((mg) => {
              const mgExercises = exercisesByMuscle[mg] ?? []
              const selected = exerciseSelections[mg] ?? []
              const isExpanded = expandedGroups[mg] ?? false

              return (
                <div key={mg} className="rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => toggleGroupExpanded(mg)}
                    className="flex w-full items-center justify-between px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {t(`muscles:${mg}`)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {mgExercises.length > 0
                          ? t('planning:candidates_count', { count: mgExercises.length })
                          : t('planning:no_exercises_for_muscle', { muscle: t(`muscles:${mg}`) })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selected.length > 0 && (
                        <span className="text-xs text-indigo-600 font-medium">
                          {t('planning:exercises_selected', { count: selected.length })}
                        </span>
                      )}
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-3 py-2 space-y-1">
                      {mgExercises.length === 0 ? (
                        <p className="text-xs text-gray-400 py-1">
                          {t('planning:no_exercises_for_muscle', { muscle: t(`muscles:${mg}`) })}
                        </p>
                      ) : (
                        mgExercises.map((ex) => (
                          <label
                            key={ex.id}
                            className="flex items-center gap-2 py-1 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(ex.id)}
                              onChange={() => toggleExerciseSelection(mg, ex.id)}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700">{t(ex.nameKey)}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!autoSelectExercises && !canGenerate && (
          <p className="text-xs text-amber-600">{t('planning:min_one_exercise')}</p>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {t('planning:generate_instant')}
        </button>
      </div>
    )
  }

  if (step === 'llm-assistant') {
    // Build trainingDays from daysPerWeek override
    let trainingDays: DayOfWeek[] = userTrainingDays
    if (daysPerWeek !== userTrainingDays.length) {
      const spacing = 7 / daysPerWeek
      trainingDays = Array.from(
        { length: daysPerWeek },
        (_, i) => Math.min(7, Math.max(1, Math.round(1 + i * spacing))) as DayOfWeek
      )
    }

    const llmConfig: UserConfig = {
      language: 'ca',
      equipment,
      trainingDays,
      minutesPerSession: minutesPerSess,
      activeRestrictions,
      onboardingCompleted: true,
      availableWeights: availableWeightsState,
    }

    return (
      <LLMAssistant
        preset={selectedPreset}
        config={llmConfig}
        weeks={weeks}
        daysPerWeek={daysPerWeek}
        minutesPerSession={minutesPerSess}
        weeklyProgression={weeklyProgression}
        filteredExercises={filteredExercisePool}
        onImport={(mesocycle) => {
          setGeneratedPreview(mesocycle)
          setStep('preview')
        }}
        onBack={() => setStep('configure')}
      />
    )
  }

  if (step === 'preview') {
    if (error) {
      return (
        <div className="space-y-4 text-center py-12">
          <p className="text-red-500">{t('planning:errorGenerating')}</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            type="button"
            onClick={() => setStep('exercises')}
            className="rounded-lg bg-gray-100 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            {t('planning:retry')}
          </button>
        </div>
      )
    }

    if (!generatedPreview) {
      return (
        <div className="space-y-4 text-center py-12">
          <p className="text-gray-500">{t('planning:errorGenerating')}</p>
          <button
            type="button"
            onClick={() => setStep('exercises')}
            className="rounded-lg bg-gray-100 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            {t('planning:back')}
          </button>
        </div>
      )
    }

    const weekMap = new Map<number, typeof generatedPreview.sessions>()
    for (const session of generatedPreview.sessions) {
      const w = session.weekNumber
      if (!weekMap.has(w)) weekMap.set(w, [])
      weekMap.get(w)!.push(session)
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t('planning:preview')}</h2>
          <span className="text-sm text-gray-500">
            {generatedPreview.name} — {generatedPreview.durationWeeks} {t('planning:weeks')}
          </span>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {Array.from(weekMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([weekNum, sessions]) => (
              <div key={weekNum} className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="font-medium text-gray-900 mb-2">
                  {t('planning:week')} {weekNum}
                </h3>
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <SessionPreview key={session.id} session={session} compact />
                  ))}
                </div>
              </div>
            ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDiscard}
            className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('planning:discard')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Check size={16} />
            {t('planning:save_plan')}
          </button>
        </div>
      </div>
    )
  }

  return null
}
