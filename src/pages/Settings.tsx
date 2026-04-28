import { ArrowLeft, Check } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { EquipmentChipSelector } from '@/components/onboarding/EquipmentChipSelector'
import { WeightSelector } from '@/components/ui/WeightSelector'
import { useUserStore } from '@/stores/userStore'
import type { DayOfWeek } from '@/types/exercise'

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
  const completeOnboarding = useUserStore((s) => s.completeOnboarding)

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadUserConfig()
  }, [loadUserConfig])

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
    setTimeout(() => setSaved(false), 2000)
  }, [completeOnboarding])

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">{t('common:nav.settings')}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-6 px-5 pt-4">
        {/* Equipment */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {t('onboarding:step3.equipment')}
          </h2>
          <EquipmentChipSelector selected={equipment} onChange={setEquipment} />
        </section>

        {/* Training days */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
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
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-indigo-100'
                  }`}
                >
                  {t(`onboarding:step3.dayNames.${day}`)}
                </button>
              )
            })}
          </div>
        </section>

        {/* Minutes per session */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
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
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                }`}
              >
                {mins}′
              </button>
            ))}
          </div>
        </section>

        {/* Available Weights */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {t('common:available_weights.title')}
          </h2>
          <p className="mb-3 text-xs text-gray-400">{t('common:available_weights.subtitle')}</p>
          <WeightSelector
            equipment={equipment}
            availableWeights={availableWeights}
            onChange={setAvailableWeights}
          />
        </section>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors"
        >
          <Check size={18} />
          {saved ? t('common:settings.saved') : t('common:settings.save')}
        </button>
      </div>
    </div>
  )
}
