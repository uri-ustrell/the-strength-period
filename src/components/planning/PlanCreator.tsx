import { ArrowLeft, Check, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaithfulExercisesStep } from '@/components/planning/FaithfulExercisesStep'
import { LLMAssistant } from '@/components/planning/LLMAssistant'
import { PresetPreviewModal } from '@/components/planning/PresetPreviewModal'
import { SessionPreview } from '@/components/planning/SessionPreview'
import { WeekProgressionTable } from '@/components/planning/WeekProgressionTable'
import { ALL_EQUIPMENT } from '@/data/equipmentCatalog'
import { ALL_MUSCLE_GROUPS } from '@/data/muscleGroups'
import type { CustomPreset, Preset } from '@/data/presets'
import { hasExerciseRichSessions, PRESETS } from '@/data/presets'
import { useExercises } from '@/hooks/useExercises'
import { getConfig, setConfig } from '@/services/db/configRepository'
import { filterExercises } from '@/services/exercises/exerciseFilter'
import type { MuscleGroupPriority } from '@/services/planning/muscleDistribution'
import {
  presetToMuscleGroupPriorities,
  prioritiesToMuscleDistribution,
} from '@/services/planning/muscleDistribution'
import {
  buildDefaultProgressionRates,
  migrateSliderToRates,
  normalizeFourTemplates,
  resizeProgressionRates,
} from '@/services/planning/presetTemplates'
import { validatePresetExercises } from '@/services/planning/presetValidation'
import { usePlanningStore } from '@/stores/planningStore'
import { useUserStore } from '@/stores/userStore'
import type { DayOfWeek, Equipment, ExerciseTag, MuscleGroup } from '@/types/exercise'
import type { PresetSessionTemplate, WeekProgressionRate } from '@/types/planning'
import type { UserConfig } from '@/types/user'

type Step = 'preset' | 'exercises' | 'configure' | 'preview' | 'llm-assistant'

interface Props {
  onComplete?: () => void
}

export const PlanCreator = ({ onComplete }: Props) => {
  const { t, i18n } = useTranslation(['planning', 'common', 'exercises', 'muscles', 'onboarding'])
  const { exercises } = useExercises()

  const equipment = useUserStore((s) => s.equipment)
  const userTrainingDays = useUserStore((s) => s.trainingDays)
  const userMinutes = useUserStore((s) => s.minutesPerSession)
  const availableWeightsState = useUserStore((s) => s.availableWeights)

  const generate = usePlanningStore((s) => s.generate)
  const saveGenerated = usePlanningStore((s) => s.saveGenerated)
  const discardGenerated = usePlanningStore((s) => s.discardGenerated)
  const generatedPreview = usePlanningStore((s) => s.generatedPreview)
  const setGeneratedPreview = usePlanningStore((s) => s.setGeneratedPreview)
  const error = usePlanningStore((s) => s.error)
  const storeMissingIds = usePlanningStore((s) => s.missingExerciseIds)

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
  const [weeklyProgressionRates, setWeeklyProgressionRates] = useState<WeekProgressionRate[]>(() =>
    buildDefaultProgressionRates(8)
  )

  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([])
  const [presetName, setPresetName] = useState('')
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [sourceIsBuiltIn, setSourceIsBuiltIn] = useState(false)
  const [dirty, setDirty] = useState(false)
  const suppressDirtyRef = useRef(false)

  // Preview modal (built-in preset selection)
  const [previewPreset, setPreviewPreset] = useState<Preset | null>(null)

  // Faithful mode state: editable preset sessions
  const [editablePresetSessions, setEditablePresetSessions] = useState<PresetSessionTemplate[]>([])

  // Gates for the new wizard order (preset → exercises → configure → preview)
  const [templatesComplete, setTemplatesComplete] = useState(false)
  const [missingExerciseIds, setMissingExerciseIds] = useState<string[]>([])

  // Derived: is this preset in faithful mode? (always true now for built-in & custom presets)
  const isFaithfulMode = useMemo(
    () => hasExerciseRichSessions(selectedPreset) || editablePresetSessions.length > 0,
    [selectedPreset, editablePresetSessions]
  )

  // Preset filter state
  const [presetSearch, setPresetSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<ExerciseTag[]>([])
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment[]>(() => [...equipment])

  // Collect all unique tags from presets for the tag filter
  const allPresetTags = useMemo(() => {
    const tags = new Set<ExerciseTag>()
    for (const p of PRESETS) {
      for (const tag of p.requiredTags) tags.add(tag)
    }
    return Array.from(tags)
  }, [])

  const filteredPresets = useMemo(() => {
    const eqSet = new Set(equipmentFilter)
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
      // Equipment filter: check if preset exercises use only equipment in the filter
      if (eqSet.size > 0 && p.sessions && p.sessions.length > 0) {
        const presetExerciseIds = new Set<string>()
        for (const s of p.sessions) {
          for (const e of s.exercises) presetExerciseIds.add(e.exerciseId)
        }
        const presetExercises = exercises.filter((ex) => presetExerciseIds.has(ex.id))
        if (presetExercises.length > 0) {
          const usesUnavailableEquipment = presetExercises.some((ex) =>
            ex.equipment.some((eq) => eq !== 'pes_corporal' && !eqSet.has(eq))
          )
          if (usesUnavailableEquipment) return false
        }
      }
      return true
    })
  }, [presetSearch, selectedTags, equipmentFilter, exercises, t])
  useEffect(() => {
    const loadCustomPresets = async () => {
      const stored = (await getConfig('customPresets')) as CustomPreset[] | null
      if (!stored) return
      let mutated = false
      const migrated: CustomPreset[] = stored.map((cp) => {
        if (!cp.weeklyProgressionRates && cp.weeklyProgression !== undefined) {
          mutated = true
          const rates = migrateSliderToRates(cp.weeklyProgression, cp.durationWeeks)
          // eslint-disable-next-line no-console
          console.info(
            `[migration] CustomPreset ${cp.id} migrated weeklyProgression → weeklyProgressionRates`
          )
          return { ...cp, weeklyProgressionRates: rates }
        }
        return cp
      })
      if (mutated) {
        await setConfig('customPresets', migrated)
      }
      setCustomPresets(migrated)
    }
    loadCustomPresets()
  }, [])

  // Resize progression rates when `weeks` changes (preserve edited values).
  useEffect(() => {
    setWeeklyProgressionRates((prev) => {
      if (prev.length === weeks) return prev
      return resizeProgressionRates(prev, weeks)
    })
  }, [weeks])

  // Mark working copy as dirty whenever a tracked field changes.
  useEffect(() => {
    if (suppressDirtyRef.current) {
      suppressDirtyRef.current = false
      return
    }
    if (step === 'preset' || step === 'preview') return
    setDirty(true)
  }, [
    editablePresetSessions,
    weeklyProgressionRates,
    presetName,
    weeks,
    daysPerWeek,
    minutesPerSess,
    muscleGroupPriorities,
    step,
  ])

  const guardedNavigate = (action: () => void) => {
    if (dirty) {
      const confirmed = window.confirm(
        `${t('planning:preset_unsaved_changes_title')}\n\n${t('planning:preset_unsaved_changes_body')}`
      )
      if (!confirmed) return
    }
    action()
  }

  const resetWizard = () => {
    suppressDirtyRef.current = true
    setStep('preset')
    setSelectedPreset(null)
    setEditingPresetId(null)
    setSourceIsBuiltIn(false)
    setPresetName('')
    setEditablePresetSessions([])
    setDirty(false)
  }
  // Reserved for future exit-with-confirmation hooks (Feature 17 QA polish)
  void guardedNavigate
  void resetWizard

  const filteredExercisePool = useMemo(() => {
    return filterExercises(exercises, {
      equipment,
    })
  }, [exercises, equipment])

  const availableMuscleGroups = useMemo(() => {
    return ALL_MUSCLE_GROUPS.filter((mg) =>
      filteredExercisePool.some(
        (ex) => ex.primaryMuscles.includes(mg) || ex.secondaryMuscles.includes(mg)
      )
    )
  }, [filteredExercisePool])

  // Reserve hook for future autofill from distribution (Feature 17 QA-7 B7)
  void availableMuscleGroups

  const handleSelectPreset = (preset: Preset) => {
    // Open the preview modal first (QA-4). The modal's two CTAs decide whether
    // we run "Start now" (zero extra steps) or "Personalitza" (enter wizard).
    setPreviewPreset(preset)
  }

  const enterWizardWithPreset = (preset: Preset) => {
    suppressDirtyRef.current = true
    setSelectedPreset(preset)
    const initialWeeks = preset.durationOptions[0] ?? 8
    setWeeks(initialWeeks)
    if (preset.weeklyProgressionRates && preset.weeklyProgressionRates.length > 0) {
      setWeeklyProgressionRates(resizeProgressionRates(preset.weeklyProgressionRates, initialWeeks))
    } else if (preset.weeklyProgression !== undefined) {
      setWeeklyProgressionRates(migrateSliderToRates(preset.weeklyProgression, initialWeeks))
    } else {
      setWeeklyProgressionRates(buildDefaultProgressionRates(initialWeeks))
    }
    setMuscleGroupPriorities(presetToMuscleGroupPriorities(preset))
    if (preset.sessions && preset.sessions.length > 0) {
      setEditablePresetSessions(normalizeFourTemplates(preset.sessions))
    } else {
      setEditablePresetSessions(normalizeFourTemplates(undefined))
    }
    setEditingPresetId(null)
    setSourceIsBuiltIn(true)
    setPresetName('')
    setMissingExerciseIds([])
    setDirty(false)
    setStep('exercises')
  }

  const handleStartNow = (preset: Preset) => {
    // QA-4 "Comença ara": generate + save with zero extra steps using UserConfig defaults.
    const initialWeeks = preset.durationOptions[0] ?? 8
    const ratesSource =
      preset.weeklyProgressionRates && preset.weeklyProgressionRates.length > 0
        ? preset.weeklyProgressionRates
        : preset.weeklyProgression !== undefined
          ? migrateSliderToRates(preset.weeklyProgression, initialWeeks)
          : buildDefaultProgressionRates(initialWeeks)
    const rates = resizeProgressionRates(ratesSource, initialWeeks)
    const sessions = normalizeFourTemplates(preset.sessions)

    // Validate before launching
    const validation = validatePresetExercises(sessions, exercises)
    if (!validation.ok) {
      setMissingExerciseIds(validation.missingIds)
      // Fall back to opening the wizard so user can fix the missing IDs
      enterWizardWithPreset(preset)
      setStep('exercises')
      setPreviewPreset(null)
      return
    }

    const trainingDays = userTrainingDays.length > 0 ? userTrainingDays : ([1, 3, 5] as DayOfWeek[])
    const config: UserConfig = {
      language: i18n.language as 'ca' | 'es' | 'en',
      equipment,
      trainingDays,
      minutesPerSession: userMinutes,
      onboardingCompleted: true,
      availableWeights: availableWeightsState,
    }
    generate(preset.id, config, exercises, {
      weeks: initialWeeks,
      weeklyProgressionRates: rates,
      presetSessions: sessions,
    })
    setPreviewPreset(null)
    // Move to preview step so the generated mesocycle is visible; user can save from there.
    setSelectedPreset(preset)
    setEditablePresetSessions(sessions)
    setWeeks(initialWeeks)
    setWeeklyProgressionRates(rates)
    setSourceIsBuiltIn(true)
    setStep('preview')
  }

  const handleCustomize = (preset: Preset) => {
    setPreviewPreset(null)
    enterWizardWithPreset(preset)
  }

  const handleSelectCustomPreset = (cp: CustomPreset, editing = false) => {
    suppressDirtyRef.current = true
    setSelectedPreset(null)
    setWeeks(cp.durationWeeks)
    if (cp.weeklyProgressionRates && cp.weeklyProgressionRates.length > 0) {
      setWeeklyProgressionRates(resizeProgressionRates(cp.weeklyProgressionRates, cp.durationWeeks))
    } else if (cp.weeklyProgression !== undefined) {
      setWeeklyProgressionRates(migrateSliderToRates(cp.weeklyProgression, cp.durationWeeks))
    } else {
      setWeeklyProgressionRates(buildDefaultProgressionRates(cp.durationWeeks))
    }

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

    setEditablePresetSessions(normalizeFourTemplates(cp.sessions))

    setSourceIsBuiltIn(false)
    if (editing) {
      setEditingPresetId(cp.id)
      setPresetName(cp.name)
    } else {
      setEditingPresetId(cp.id)
      setPresetName(cp.name)
    }
    setMissingExerciseIds([])
    setDirty(false)
    setStep('exercises')
  }

  const handleCreateFromScratch = () => {
    suppressDirtyRef.current = true
    const id = `custom_${crypto.randomUUID()}`
    const blankPreset: CustomPreset = {
      id,
      name: '',
      durationWeeks: 8,
      muscleDistribution: {},
      weeklyProgressionRates: buildDefaultProgressionRates(8),
      createdAt: new Date().toISOString(),
    }
    handleSelectCustomPreset(blankPreset, true)
    setEditingPresetId(null) // not yet persisted
  }

  const handleDeleteCustomPreset = async (id: string) => {
    if (!window.confirm(t('planning:delete_preset_confirm'))) return
    const updated = customPresets.filter((p) => p.id !== id)
    await setConfig('customPresets', updated)
    setCustomPresets(updated)
  }

  const handleSaveAsPreset = async () => {
    const name = presetName.trim()
    if (!name) return

    const muscleDistribution = prioritiesToMuscleDistribution(muscleGroupPriorities)

    const sessionsCopy =
      editablePresetSessions.length > 0
        ? editablePresetSessions.map((s) => ({
            ...s,
            exercises: s.exercises.map((e) => ({ ...e })),
          }))
        : selectedPreset?.sessions
          ? normalizeFourTemplates(selectedPreset.sessions)
          : undefined

    if (editingPresetId && !sourceIsBuiltIn) {
      // Update existing custom preset (edit-in-place)
      const updated = customPresets.map((cp) =>
        cp.id === editingPresetId
          ? {
              ...cp,
              name,
              durationWeeks: weeks,
              muscleDistribution,
              sessions: sessionsCopy,
              weeklyProgressionRates,
              progressionType: selectedPreset?.progressionType ?? cp.progressionType ?? 'linear',
              weeklyProgression: undefined,
            }
          : cp
      )
      await setConfig('customPresets', updated)
      setCustomPresets(updated)
    } else {
      // Auto-fork built-in preset OR create from scratch -> new CustomPreset
      const newPreset: CustomPreset = {
        id: `custom_${crypto.randomUUID()}`,
        name,
        durationWeeks: weeks,
        muscleDistribution,
        sessions: sessionsCopy,
        weeklyProgressionRates,
        progressionType: selectedPreset?.progressionType ?? 'linear',
        createdAt: new Date().toISOString(),
      }
      const updated = [...customPresets, newPreset]
      await setConfig('customPresets', updated)
      setCustomPresets(updated)
      setEditingPresetId(newPreset.id)
      setSourceIsBuiltIn(false)
      setSelectedPreset(null)
    }

    setDirty(false)
  }

  const handleGenerate = () => {
    // Faithful-only path now that built-in & custom presets always carry sessions.
    const validation = validatePresetExercises(editablePresetSessions, exercises)
    if (!validation.ok) {
      setMissingExerciseIds(validation.missingIds)
      // Stay on exercises so the user can fix the offending rows
      setStep('exercises')
      return
    }
    setMissingExerciseIds([])

    let trainingDays: DayOfWeek[] = userTrainingDays
    if (daysPerWeek !== userTrainingDays.length) {
      const spacing = 7 / daysPerWeek
      trainingDays = Array.from(
        { length: daysPerWeek },
        (_, i) => Math.min(7, Math.max(1, Math.round(1 + i * spacing))) as DayOfWeek
      )
    }

    const config: UserConfig = {
      language: i18n.language as 'ca' | 'es' | 'en',
      equipment,
      trainingDays,
      minutesPerSession: minutesPerSess,
      onboardingCompleted: true,
      availableWeights: availableWeightsState,
    }

    generate(selectedPreset?.id ?? 'forca_general', config, exercises, {
      weeks,
      weeklyProgressionRates,
      presetSessions: editablePresetSessions,
    })
    setStep('preview')
  }

  const handleSave = async () => {
    await saveGenerated(exercises)
    onComplete?.()
  }

  const handleDiscard = () => {
    discardGenerated()
    setStep('preset')
    setSelectedPreset(null)
  }

  if (step === 'preset') {
    return (
      <div className="space-y-4">
        {previewPreset && (
          <PresetPreviewModal
            preset={previewPreset}
            exercises={exercises}
            estimatedMinutesPerSession={userMinutes}
            onStartNow={() => handleStartNow(previewPreset)}
            onCustomize={() => handleCustomize(previewPreset)}
            onClose={() => setPreviewPreset(null)}
          />
        )}
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

        {/* Equipment filter */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">
            {t('planning:equipment_filter')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_EQUIPMENT.map((eq) => {
              const active = equipmentFilter.includes(eq)
              return (
                <button
                  key={eq}
                  type="button"
                  onClick={() =>
                    setEquipmentFilter((prev) =>
                      active ? prev.filter((e) => e !== eq) : [...prev, eq]
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    active
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                  }`}
                >
                  {t(`onboarding:equipment.${eq}`)}
                </button>
              )
            })}
          </div>
        </div>

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
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectCustomPreset(cp, true)
                      }}
                      className="rounded-full p-1 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50"
                      aria-label={t('planning:edit_preset')}
                    >
                      <span className="text-xs font-medium">{t('planning:edit_preset')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCustomPreset(cp.id)
                      }}
                      className="rounded-full p-1 text-gray-300 hover:text-red-500 hover:bg-red-50"
                      aria-label={t('planning:delete_preset')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Create from scratch */}
        <button
          type="button"
          onClick={handleCreateFromScratch}
          className="w-full rounded-xl border-2 border-dashed border-indigo-300 p-4 text-left transition-colors hover:border-indigo-500 hover:bg-indigo-50"
        >
          <h3 className="font-medium text-sm text-indigo-700">
            {t('planning:create_from_scratch')}
          </h3>
          <p className="mt-1 text-xs text-gray-500">{t('planning:create_from_scratch_desc')}</p>
        </button>
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
            onClick={() => setStep(isFaithfulMode ? 'exercises' : 'preset')}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {editingPresetId
              ? t('planning:editing_preset', { name: presetName || '…' })
              : t('planning:configure')}
          </h2>
        </div>

        {/* Inline preset name (working copy) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('planning:preset_name_label')}
          </label>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder={t('planning:preset_name_placeholder')}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {!presetName.trim() && (
            <p className="mt-1 text-xs text-gray-400">{t('planning:preset_name_required')}</p>
          )}
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
          <WeekProgressionTable
            weeks={weeks}
            rates={weeklyProgressionRates}
            onChange={setWeeklyProgressionRates}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleSaveAsPreset}
            disabled={!presetName.trim()}
            className="rounded-lg bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 disabled:opacity-50"
          >
            {t('planning:save_as_preset')}
          </button>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={exercises.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {t('planning:generate_instant')}
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

  if (step === 'exercises') {
    if (editablePresetSessions.length === 0) {
      // Empty state: no preset selected (e.g. orphan navigation). Send back to preset.
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{t('planning:empty_template_body')}</p>
          <button
            type="button"
            onClick={() => setStep('preset')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {t('planning:back_to_presets')}
          </button>
        </div>
      )
    }
    return (
      <FaithfulExercisesStep
        editablePresetSessions={editablePresetSessions}
        onSessionsChange={setEditablePresetSessions}
        exercises={exercises}
        filteredExercisePool={filteredExercisePool}
        onBack={() => setStep('preset')}
        onGenerate={() => setStep('configure')}
        onCompleteChange={setTemplatesComplete}
        generateLabelKey="planning:next"
        generateDisabled={!templatesComplete}
        missingExerciseIds={missingExerciseIds}
      />
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
      onboardingCompleted: true,
      availableWeights: availableWeightsState,
    }

    const positives = weeklyProgressionRates.map((r) => r.progressionPct).filter((p) => p >= 0)
    const llmWeeklyProgression =
      positives.length > 0
        ? Math.max(
            0,
            Math.min(10, Math.round(positives.reduce((a, b) => a + b, 0) / positives.length))
          )
        : 5

    return (
      <LLMAssistant
        preset={selectedPreset}
        config={llmConfig}
        weeks={weeks}
        daysPerWeek={daysPerWeek}
        minutesPerSession={minutesPerSess}
        weeklyProgression={llmWeeklyProgression}
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
            {i18n?.exists(generatedPreview.name) ? t(generatedPreview.name) : generatedPreview.name}{' '}
            — {generatedPreview.durationWeeks} {t('planning:weeks')}
          </span>
        </div>

        {error === 'PRESET_EXERCISES_MISSING' && storeMissingIds.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              {t('planning:error_missing_exercises', { count: storeMissingIds.length })}
            </p>
            <ul className="mt-2 list-disc pl-5 text-xs text-red-700">
              {storeMissingIds.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        )}

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
