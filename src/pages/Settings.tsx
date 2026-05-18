import { ArrowLeft, Check } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { EquipmentChipSelector } from '@/components/onboarding/EquipmentChipSelector'
import { WeightSelector } from '@/components/ui/WeightSelector'
import { useUserStore } from '@/stores/userStore'
import type { DayOfWeek } from '@/types/exercise'
import { FEEDBACK_CONFIRM_MS } from '@/utils/uiTiming'

const MINUTES_OPTIONS = [15, 30, 45, 60, 90]

const ALL_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7]

export const SettingsPage = () => {
  const { t } = useTranslation(['common', 'onboarding'])
  const navigate = useNavigate()

  const loadUserConfig = useUserStore((s) => s.loadUserConfig)
  const equipment = useUserStore((s) => s.equipment)
  const setEquipment = useUserStore((s) => s.setEquipment)
  const trainingDays = useUserStore((s) => s.trainingDays)
  const setTrainingDays = useUserStore((s) => s.setTrainingDays)
  const minutesPerSession = useUserStore((s) => s.minutesPerSession)
  const setMinutesPerSession = useUserStore((s) => s.setMinutesPerSession)
  const availableWeights = useUserStore((s) => s.availableWeights)
  const setAvailableWeights = useUserStore((s) => s.setAvailableWeights)
  const audioOptIn = useUserStore((s) => s.audioOptIn)
  const setAudioOptIn = useUserStore((s) => s.setAudioOptIn)
  const completeOnboarding = useUserStore((s) => s.completeOnboarding)

  const [saved, setSaved] = useState(false)
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadUserConfig()
  }, [loadUserConfig])

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current)
    }
  }, [])

  const toggleDay = (day: DayOfWeek) => {
    if (trainingDays.includes(day)) {
      setTrainingDays(trainingDays.filter((d) => d !== day))
    } else {
      setTrainingDays([...trainingDays, day].sort((a, b) => a - b))
    }
  }

  const handleSave = useCallback(async () => {
    await completeOnboarding()
    setSaved(true)
    if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current)
    navigateTimerRef.current = setTimeout(() => {
      navigate(-1)
    }, FEEDBACK_CONFIRM_MS)
  }, [completeOnboarding, navigate])

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* Header */}
      <div className="bg-surface px-5 pt-6 pb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg p-1 text-text-muted/70 hover:text-text-primary"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-text-primary">{t('common:nav.settings')}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-6 px-5 pt-4">
        {/* Equipment */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wide">
            {t('onboarding:step3.equipment')}
          </h2>
          <EquipmentChipSelector selected={equipment} onChange={setEquipment} />
        </section>

        {/* Training days */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wide">
            {t('onboarding:step3.trainingDays')}
          </h2>
          <div className="flex gap-2">
            {ALL_DAYS.map((day) => {
              const selected = trainingDays.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    selected
                      ? 'bg-accent text-white'
                      : 'bg-surface-elevated text-text-muted hover:bg-accent/20'
                  }`}
                >
                  {t(`onboarding:step3.dayNames.${day}`)}
                </button>
              )
            })}
          </div>
        </section>

        {/* Minutes per session */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wide">
            {t('onboarding:step3.minutesPerSession')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {MINUTES_OPTIONS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setMinutesPerSession(mins)}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                  minutesPerSession === mins
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border-subtle text-text-muted hover:border-accent/40'
                }`}
              >
                {mins}′
              </button>
            ))}
          </div>
        </section>

        {/* Available Weights */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-text-muted uppercase tracking-wide">
            {t('common:available_weights.title')}
          </h2>
          <p className="mb-3 text-xs text-text-muted/70">{t('common:available_weights.subtitle')}</p>
          <WeightSelector
            equipment={equipment}
            availableWeights={availableWeights}
            onChange={setAvailableWeights}
          />
        </section>

        {/* Audio opt-in */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={audioOptIn}
              onChange={(e) => setAudioOptIn(e.target.checked)}
              className="mt-1"
              data-testid="settings-audio-opt-in"
            />
            <span>
              <span className="block text-sm font-semibold text-text-primary">
                {t('common:settings.audio.title', { defaultValue: 'So' })}
              </span>
              <span className="block text-xs text-text-muted">
                {t('common:settings.audio.description', {
                  defaultValue: 'Activa tons curts en finalitzar el descans i la sessió.',
                })}
              </span>
            </span>
          </label>
        </section>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-white font-medium hover:brightness-110 transition-colors"
        >
          <Check size={18} />
          {saved ? t('common:settings.saved') : t('common:settings.save')}
        </button>
      </div>
    </div>
  )
}
