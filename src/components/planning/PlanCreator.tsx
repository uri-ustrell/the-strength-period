import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, ArrowLeft, Check, Loader2, X } from 'lucide-react'

import type { Preset } from '@/data/presets'
import type { CustomPreset } from '@/data/presets'
import type { UserConfig } from '@/types/user'
import type { MuscleGroup } from '@/types/exercise'
import { PRESETS, getPresetsForProfile } from '@/data/presets'
import { getConfig, setConfig } from '@/services/db/configRepository'
import { usePlanningStore } from '@/stores/planningStore'
import { useUserStore } from '@/stores/userStore'
import { useExercises } from '@/hooks/useExercises'
import { SessionPreview } from '@/components/planning/SessionPreview'

const MAIN_MUSCLE_GROUPS: MuscleGroup[] = [
  'quadriceps', 'isquiotibials', 'glutis', 'bessons',
  'pectoral', 'dorsal', 'deltoides',
  'biceps', 'triceps',
  'abdominal', 'lumbar',
  'adductors', 'psoes',
]

type MuscleGroupPriority = 'high' | 'medium' | 'low'

type Step = 'preset' | 'configure' | 'muscles' | 'generating' | 'preview'

interface Props {
  onComplete?: () => void
}

export const PlanCreator = ({ onComplete }: Props) => {
  const { t } = useTranslation(['planning', 'common'])
  const { exercises } = useExercises()

  const profile = useUserStore((s) => s.profile)
  const equipment = useUserStore((s) => s.equipment)
  const userDays = useUserStore((s) => s.availableDaysPerWeek)
  const userMinutes = useUserStore((s) => s.minutesPerSession)
  const activeRestrictions = useUserStore((s) => s.activeRestrictions)

  const generate = usePlanningStore((s) => s.generate)
  const saveGenerated = usePlanningStore((s) => s.saveGenerated)
  const discardGenerated = usePlanningStore((s) => s.discardGenerated)
  const generatedPreview = usePlanningStore((s) => s.generatedPreview)
  const isGenerating = usePlanningStore((s) => s.isGenerating)
  const error = usePlanningStore((s) => s.error)

  const [step, setStep] = useState<Step>('preset')
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)
  const [weeks, setWeeks] = useState(8)
  const [daysPerWeek, setDaysPerWeek] = useState(userDays)
  const [minutesPerSess, setMinutesPerSess] = useState(userMinutes)
  const [muscleGroupPriorities, setMuscleGroupPriorities] = useState<Record<MuscleGroup, MuscleGroupPriority | null>>(
    () => {
      const initial: Record<string, MuscleGroupPriority | null> = {}
      for (const mg of MAIN_MUSCLE_GROUPS) {
        initial[mg] = 'medium'
      }
      return initial as Record<MuscleGroup, MuscleGroupPriority | null>
    },
  )
  const [aiDecides, setAiDecides] = useState(false)

  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([])
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState('')

  useEffect(() => {
    const loadCustomPresets = async () => {
      const stored = await getConfig('customPresets') as CustomPreset[] | null
      if (stored) setCustomPresets(stored)
    }
    loadCustomPresets()
  }, [])

  const presetsForProfile = profile ? getPresetsForProfile(profile) : PRESETS

  const presetToMuscleGroupPriorities = (preset: Preset | null): Record<MuscleGroup, MuscleGroupPriority | null> => {
    const priorities: Record<string, MuscleGroupPriority | null> = {}
    for (const mg of MAIN_MUSCLE_GROUPS) {
      priorities[mg] = preset ? null : 'medium'
    }
    if (preset) {
      for (const [mg, pct] of Object.entries(preset.muscleDistribution)) {
        if (MAIN_MUSCLE_GROUPS.includes(mg as MuscleGroup)) {
          if (pct >= 25) priorities[mg] = 'high'
          else if (pct >= 10) priorities[mg] = 'medium'
          else priorities[mg] = 'low'
        }
      }
    }
    return priorities as Record<MuscleGroup, MuscleGroupPriority | null>
  }

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
    for (const mg of MAIN_MUSCLE_GROUPS) {
      priorities[mg] = null
    }
    for (const [mg, pct] of Object.entries(cp.muscleDistribution)) {
      if (MAIN_MUSCLE_GROUPS.includes(mg as MuscleGroup)) {
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

    const priorityWeights: Record<MuscleGroupPriority, number> = { high: 3, medium: 2, low: 1 }
    const selectedMuscles = Object.entries(muscleGroupPriorities).filter(([, p]) => p !== null) as [string, MuscleGroupPriority][]
    const totalWeight = selectedMuscles.reduce((sum, [, p]) => sum + priorityWeights[p], 0)
    const muscleDistribution: Partial<Record<MuscleGroup, number>> = {}
    for (const [mg, priority] of selectedMuscles) {
      (muscleDistribution as Record<string, number>)[mg] = Math.round((priorityWeights[priority] / totalWeight) * 100)
    }

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

  const handleGenerate = async () => {
    if (!profile) return
    setStep('generating')

    let muscleDistribution: Record<string, number> = {}

    if (!aiDecides) {
      const priorityWeights: Record<MuscleGroupPriority, number> = { high: 3, medium: 2, low: 1 }
      const selectedMuscles = Object.entries(muscleGroupPriorities).filter(([, p]) => p !== null) as [string, MuscleGroupPriority][]
      const totalWeight = selectedMuscles.reduce((sum, [, p]) => sum + priorityWeights[p], 0)
      for (const [mg, priority] of selectedMuscles) {
        muscleDistribution[mg] = Math.round((priorityWeights[priority] / totalWeight) * 100)
      }
    }

    const config: UserConfig = {
      profile,
      language: 'ca',
      equipment,
      availableDaysPerWeek: daysPerWeek,
      minutesPerSession: minutesPerSess,
      activeRestrictions,
      onboardingCompleted: true,
    }

    await generate(
      selectedPreset?.id ?? 'forca_general',
      config,
      exercises,
      { weeks, muscleDistribution },
    )
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

  if (step === 'preset') {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{t('planning:selectPreset')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {presetsForProfile.map((preset) => (
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
            <h3 className="text-sm font-medium text-gray-500 mt-4">{t('planning:saved_presets')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {customPresets.map((cp) => (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => handleSelectCustomPreset(cp)}
                  className="rounded-xl border-2 border-gray-200 p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50 relative group"
                >
                  <h3 className="font-medium text-sm text-gray-900">{cp.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">{cp.durationWeeks} {t('planning:weeks')}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteCustomPreset(cp.id) }}
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
          <button type="button" onClick={() => setStep('preset')} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{t('planning:configure')}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('planning:selectDuration')}</label>
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
            <label className="block text-sm font-medium text-gray-700">{t('planning:days_per_week')}</label>
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
            <label className="block text-sm font-medium text-gray-700">{t('planning:minutes_per_session')}</label>
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

        <button
          type="button"
          onClick={() => setStep('muscles')}
          disabled={exercises.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {t('planning:next')}
        </button>
      </div>
    )
  }

  if (step === 'muscles') {
    const handlePriorityChange = (mg: MuscleGroup, value: string) => {
      setMuscleGroupPriorities((prev) => ({
        ...prev,
        [mg]: value === 'off' ? null : value as MuscleGroupPriority,
      }))
    }

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setStep('configure')} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('planning:select_muscle_groups')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('planning:muscle_group_explanation')}</p>
          </div>
        </div>

        {/* AI decides toggle */}
        <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={aiDecides}
            onChange={(e) => setAiDecides(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">{t('planning:ai_decides_muscles')}</span>
            <p className="text-xs text-gray-500 mt-0.5">{t('planning:ai_decides_muscles_desc')}</p>
          </div>
        </label>

        {/* Helper microcopy */}
        {!aiDecides && (
          <p className="text-xs text-gray-400">{t('planning:muscle_group_helper')}</p>
        )}

        {/* Muscle group grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${aiDecides ? 'opacity-40 pointer-events-none' : ''}`}>
          {MAIN_MUSCLE_GROUPS.map((mg) => {
            const priority = muscleGroupPriorities[mg]
            return (
              <div key={mg} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
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

        {!aiDecides && (
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
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={exercises.length === 0 || (!aiDecides && !Object.values(muscleGroupPriorities).some(Boolean))}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Sparkles size={18} />
          {t('planning:generate_plan')}
        </button>
      </div>
    )
  }

  if (step === 'generating' || isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
        <p className="mt-4 text-gray-500">{t('planning:generating')}</p>
      </div>
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
            onClick={() => setStep('configure')}
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
            onClick={() => setStep('configure')}
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
