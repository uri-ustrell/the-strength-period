import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaithfulExercisesStep } from '@/components/planning/FaithfulExercisesStep'
import { LLMAssistant } from '@/components/planning/LLMAssistant'
import { ConfigureStep } from '@/components/planning/steps/ConfigureStep'
import { PresetSelectStep } from '@/components/planning/steps/PresetSelectStep'
import { PreviewStep } from '@/components/planning/steps/PreviewStep'
import type { CustomPreset, Preset } from '@/data/presets'
import { hasExerciseRichSessions } from '@/data/presets'
import { useExercises } from '@/hooks/useExercises'
import { getConfig, setConfig } from '@/services/db/configRepository'
import { filterExercises } from '@/services/exercises/exerciseFilter'
import { migrateSliderToRates, normalizeTemplates } from '@/services/planning/presetTemplates'
import { validatePresetExercises } from '@/services/planning/presetValidation'
import { usePlanCreatorStore } from '@/stores/planCreatorStore'
import { usePlanningStore } from '@/stores/planningStore'
import { useUserStore } from '@/stores/userStore'
import type { DayOfWeek } from '@/types/exercise'
import type { UserConfig } from '@/types/user'

interface Props {
  onComplete?: () => void
}

/** Spread `daysPerWeek` training days evenly across the week when it differs from the profile. */
const resolveTrainingDays = (userDays: DayOfWeek[], daysPerWeek: number): DayOfWeek[] => {
  if (daysPerWeek === userDays.length) return userDays
  const spacing = 7 / daysPerWeek
  return Array.from(
    { length: daysPerWeek },
    (_, i) => Math.min(7, Math.max(1, Math.round(1 + i * spacing))) as DayOfWeek
  )
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

  // Wizard machine state + transitions live in a scoped store (see planCreatorStore).
  const step = usePlanCreatorStore((s) => s.step)
  const selectedPreset = usePlanCreatorStore((s) => s.selectedPreset)
  const weeks = usePlanCreatorStore((s) => s.weeks)
  const daysPerWeek = usePlanCreatorStore((s) => s.daysPerWeek)
  const minutesPerSession = usePlanCreatorStore((s) => s.minutesPerSession)
  const weeklyProgressionRates = usePlanCreatorStore((s) => s.weeklyProgressionRates)
  const presetName = usePlanCreatorStore((s) => s.presetName)
  const editingPresetId = usePlanCreatorStore((s) => s.editingPresetId)
  const sourceIsBuiltIn = usePlanCreatorStore((s) => s.sourceIsBuiltIn)
  const editablePresetSessions = usePlanCreatorStore((s) => s.editablePresetSessions)
  const missingExerciseIds = usePlanCreatorStore((s) => s.missingExerciseIds)

  const setStep = usePlanCreatorStore((s) => s.setStep)
  const setWeeks = usePlanCreatorStore((s) => s.setWeeks)
  const setDaysPerWeek = usePlanCreatorStore((s) => s.setDaysPerWeek)
  const setMinutes = usePlanCreatorStore((s) => s.setMinutes)
  const setRates = usePlanCreatorStore((s) => s.setRates)
  const setPresetName = usePlanCreatorStore((s) => s.setPresetName)
  const editSessions = usePlanCreatorStore((s) => s.editSessions)
  const setMissingExerciseIds = usePlanCreatorStore((s) => s.setMissingExerciseIds)
  const loadPreset = usePlanCreatorStore((s) => s.loadPreset)
  const loadCustomPreset = usePlanCreatorStore((s) => s.loadCustomPreset)
  const createFromScratch = usePlanCreatorStore((s) => s.createFromScratch)
  const startNowPreview = usePlanCreatorStore((s) => s.startNowPreview)
  const presetSaved = usePlanCreatorStore((s) => s.presetSaved)
  const presetUpdated = usePlanCreatorStore((s) => s.presetUpdated)
  const discard = usePlanCreatorStore((s) => s.discard)

  // Loaded data + exercises-step completion gate stay local — they aren't wizard
  // machine state.
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([])
  const [templatesComplete, setTemplatesComplete] = useState(false)

  // Seed defaults from the user profile and start from a fresh `preset` step on
  // mount. Read the profile via getState so this runs exactly once (mirroring the
  // previous useState initializers) without reactive deps.
  useEffect(() => {
    const { trainingDays, minutesPerSession: mins } = useUserStore.getState()
    usePlanCreatorStore.getState().initWizard({
      daysPerWeek: trainingDays.length,
      minutesPerSession: mins,
    })
  }, [])

  // Always true for built-in & custom presets (they carry session templates).
  const isFaithfulMode = useMemo(
    () => hasExerciseRichSessions(selectedPreset) || editablePresetSessions.length > 0,
    [selectedPreset, editablePresetSessions]
  )

  useEffect(() => {
    const loadCustomPresets = async () => {
      const stored = (await getConfig('customPresets')) as CustomPreset[] | null
      if (!stored) return
      let mutated = false
      const migrated: CustomPreset[] = stored.map((cp) => {
        if (!cp.weeklyProgressionRates && cp.weeklyProgression !== undefined) {
          mutated = true
          const rates = migrateSliderToRates(cp.weeklyProgression, cp.durationWeeks)
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.info(
              `[migration] CustomPreset ${cp.id} migrated weeklyProgression → weeklyProgressionRates`
            )
          }
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

  const filteredExercisePool = useMemo(() => {
    return filterExercises(exercises, { equipment })
  }, [exercises, equipment])

  const handleStartNow = (preset: Preset) => {
    // QA-4 "Comença ara": generate + save with zero extra steps using UserConfig defaults.
    const sessions = normalizeTemplates(preset.sessions)
    const validation = validatePresetExercises(sessions, exercises)
    if (!validation.ok) {
      // Fall back to opening the wizard so the user can fix the missing IDs.
      loadPreset(preset)
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
    // startNowPreview re-derives weeks/rates/sessions and moves to the preview
    // step; read the resolved values back to generate from exactly that setup.
    startNowPreview(preset)
    const next = usePlanCreatorStore.getState()
    generate(preset.id, config, exercises, {
      weeks: next.weeks,
      weeklyProgressionRates: next.weeklyProgressionRates,
      presetSessions: next.editablePresetSessions,
    })
  }

  const handleSelectCustomPreset = (cp: CustomPreset) => {
    loadCustomPreset(cp)
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

    const sessionsCopy =
      editablePresetSessions.length > 0
        ? editablePresetSessions.map((s) => ({
            ...s,
            exercises: s.exercises.map((e) => ({ ...e })),
          }))
        : selectedPreset?.sessions
          ? normalizeTemplates(selectedPreset.sessions)
          : undefined

    if (editingPresetId && !sourceIsBuiltIn) {
      // Update existing custom preset (edit-in-place)
      const updated = customPresets.map((cp) =>
        cp.id === editingPresetId
          ? {
              ...cp,
              name,
              durationWeeks: weeks,
              sessions: sessionsCopy,
              weeklyProgressionRates,
              progressionType: selectedPreset?.progressionType ?? cp.progressionType ?? 'linear',
              weeklyProgression: undefined,
            }
          : cp
      )
      await setConfig('customPresets', updated)
      setCustomPresets(updated)
      presetUpdated()
    } else {
      // Auto-fork built-in preset OR create from scratch -> new CustomPreset
      const newPreset: CustomPreset = {
        id: `custom_${crypto.randomUUID()}`,
        name,
        durationWeeks: weeks,
        sessions: sessionsCopy,
        weeklyProgressionRates,
        progressionType: selectedPreset?.progressionType ?? 'linear',
        createdAt: new Date().toISOString(),
      }
      const updated = [...customPresets, newPreset]
      await setConfig('customPresets', updated)
      setCustomPresets(updated)
      presetSaved(newPreset.id)
    }
  }

  const handleGenerate = () => {
    // Faithful-only path now that built-in & custom presets always carry sessions.
    const validation = validatePresetExercises(editablePresetSessions, exercises)
    if (!validation.ok) {
      // Stay on exercises so the user can fix the offending rows
      setMissingExerciseIds(validation.missingIds)
      setStep('exercises')
      return
    }
    setMissingExerciseIds([])

    const config: UserConfig = {
      language: i18n.language as 'ca' | 'es' | 'en',
      equipment,
      trainingDays: resolveTrainingDays(userTrainingDays, daysPerWeek),
      minutesPerSession,
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
    discard()
  }

  if (step === 'preset') {
    return (
      <PresetSelectStep
        exercises={exercises}
        userEquipment={equipment}
        userTrainingDays={userTrainingDays}
        customPresets={customPresets}
        onSelectPreset={handleStartNow}
        onSelectCustomPreset={handleSelectCustomPreset}
        onDeleteCustomPreset={handleDeleteCustomPreset}
        onCreateFromScratch={createFromScratch}
      />
    )
  }

  if (step === 'configure') {
    return (
      <ConfigureStep
        presetName={presetName}
        weeks={weeks}
        daysPerWeek={daysPerWeek}
        minutesPerSession={minutesPerSession}
        weeklyProgressionRates={weeklyProgressionRates}
        editablePresetSessions={editablePresetSessions}
        editingPresetId={editingPresetId}
        generateDisabled={exercises.length === 0}
        llmDisabled={filteredExercisePool.length === 0}
        onBack={() => setStep(isFaithfulMode ? 'exercises' : 'preset')}
        onPresetNameChange={setPresetName}
        onWeeksChange={setWeeks}
        onDaysChange={setDaysPerWeek}
        onMinutesChange={setMinutes}
        onRatesChange={setRates}
        onSaveAsPreset={handleSaveAsPreset}
        onGenerate={handleGenerate}
        onUseLLM={() => setStep('llm-assistant')}
      />
    )
  }

  if (step === 'exercises') {
    if (editablePresetSessions.length === 0) {
      // Empty state: no preset selected (e.g. orphan navigation). Send back to preset.
      return (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">{t('planning:empty_template_body')}</p>
          <button
            type="button"
            onClick={() => setStep('preset')}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            {t('planning:back_to_presets')}
          </button>
        </div>
      )
    }
    return (
      <FaithfulExercisesStep
        editablePresetSessions={editablePresetSessions}
        onSessionsChange={editSessions}
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
    const positives = weeklyProgressionRates.map((r) => r.progressionPct).filter((p) => p >= 0)
    const llmWeeklyProgression =
      positives.length > 0
        ? Math.max(
            0,
            Math.min(10, Math.round(positives.reduce((a, b) => a + b, 0) / positives.length))
          )
        : 5

    const llmConfig: UserConfig = {
      language: 'ca',
      equipment,
      trainingDays: resolveTrainingDays(userTrainingDays, daysPerWeek),
      minutesPerSession,
      onboardingCompleted: true,
      availableWeights: availableWeightsState,
    }

    return (
      <LLMAssistant
        preset={selectedPreset}
        config={llmConfig}
        weeks={weeks}
        daysPerWeek={daysPerWeek}
        minutesPerSession={minutesPerSession}
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
    return (
      <PreviewStep
        generatedPreview={generatedPreview}
        error={error}
        storeMissingIds={storeMissingIds}
        weeklyProgressionRates={weeklyProgressionRates}
        exercises={exercises}
        onRetry={() => setStep('exercises')}
        onDiscard={handleDiscard}
        onModify={() => setStep('exercises')}
        onSave={handleSave}
      />
    )
  }

  return null
}
