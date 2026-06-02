import { useTranslation } from 'react-i18next'
import { EquipmentChipSelector } from '@/components/onboarding/EquipmentChipSelector'
import { WeightSelector } from '@/components/ui/WeightSelector'
import { useUserStore } from '@/stores/userStore'
import type { DayOfWeek } from '@/types/exercise'

const MINUTES_OPTIONS = [15, 30, 45, 60, 90]

const ALL_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7]

export const Step3Context = () => {
  const { t } = useTranslation('onboarding')
  const equipment = useUserStore((s) => s.equipment)
  const setEquipment = useUserStore((s) => s.setEquipment)
  const trainingDays = useUserStore((s) => s.trainingDays)
  const setTrainingDays = useUserStore((s) => s.setTrainingDays)
  const minutesPerSession = useUserStore((s) => s.minutesPerSession)
  const setMinutesPerSession = useUserStore((s) => s.setMinutesPerSession)
  const availableWeights = useUserStore((s) => s.availableWeights)
  const setAvailableWeights = useUserStore((s) => s.setAvailableWeights)

  const toggleDay = (day: DayOfWeek) => {
    if (trainingDays.includes(day)) {
      setTrainingDays(trainingDays.filter((d) => d !== day))
    } else {
      setTrainingDays([...trainingDays, day].sort((a, b) => a - b))
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">{t('step3.title')}</h2>
        <p className="mt-1 text-text-muted">{t('step3.subtitle')}</p>
      </div>

      {/* Equipment */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">{t('step3.equipment')}</h3>
        <EquipmentChipSelector selected={equipment} onChange={setEquipment} />
      </div>

      {/* Training days */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">{t('step3.trainingDays')}</h3>
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
                {t(`step3.dayNames.${day}`)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Minutes per session */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">
          {t('step3.minutesPerSession')}
        </h3>
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
      </div>

      {/* Available Weights */}
      {(equipment.includes('manueles') || equipment.includes('barra')) && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-text-primary">
            {t('step3.availableWeights')}
          </h3>
          <p className="mb-3 text-xs text-text-muted/70">{t('step3.availableWeightsHint')}</p>
          <WeightSelector
            equipment={equipment}
            availableWeights={availableWeights}
            onChange={setAvailableWeights}
            namespace="onboarding"
          />
        </div>
      )}
    </div>
  )
}
