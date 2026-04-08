import { useTranslation } from 'react-i18next'

import type { Equipment, DayOfWeek, RestrictionCondition } from '@/types/exercise'
import { ALL_RESTRICTION_CONDITIONS } from '@/types/exercise'
import { useUserStore } from '@/stores/userStore'
import { WeightSelector } from '@/components/ui/WeightSelector'

const ALL_EQUIPMENT: Equipment[] = [
  'pes_corporal',
  'manueles',
  'barra',
  'banda_elastica',
  'pilates',
  'trx',
]

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
  const activeRestrictions = useUserStore((s) => s.activeRestrictions)
  const setActiveRestrictions = useUserStore((s) => s.setActiveRestrictions)
  const availableWeights = useUserStore((s) => s.availableWeights)
  const setAvailableWeights = useUserStore((s) => s.setAvailableWeights)

  const toggleEquipment = (item: Equipment) => {
    if (equipment.includes(item)) {
      setEquipment(equipment.filter((e) => e !== item))
    } else {
      setEquipment([...equipment, item])
    }
  }

  const toggleDay = (day: DayOfWeek) => {
    if (trainingDays.includes(day)) {
      setTrainingDays(trainingDays.filter((d) => d !== day))
    } else {
      setTrainingDays([...trainingDays, day].sort((a, b) => a - b))
    }
  }

  const toggleRestriction = (key: RestrictionCondition) => {
    if (activeRestrictions.includes(key)) {
      setActiveRestrictions(activeRestrictions.filter((r) => r !== key))
    } else {
      setActiveRestrictions([...activeRestrictions, key])
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('step3.title')}
        </h2>
        <p className="mt-1 text-gray-500">{t('step3.subtitle')}</p>
      </div>

      {/* Equipment */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          {t('step3.equipment')}
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALL_EQUIPMENT.map((item) => {
            const selected = equipment.includes(item)
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleEquipment(item)}
                className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                  selected
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                }`}
              >
                {t(`step3.equipmentOptions.${item}`)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Training days */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          {t('step3.trainingDays')}
        </h3>
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
                {t(`step3.dayNames.${day}`)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Minutes per session */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
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
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              {mins}′
            </button>
          ))}
        </div>
      </div>

      {/* Restrictions */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          {t('step3.restrictions')}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {ALL_RESTRICTION_CONDITIONS.map((key) => {
            const selected = activeRestrictions.includes(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleRestriction(key)}
                className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                  selected
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-600 hover:border-red-300'
                }`}
              >
                {t(`step3.restrictionOptions.${key}`)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Available Weights */}
      {(equipment.includes('manueles') || equipment.includes('barra')) && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-gray-700">
            {t('step3.availableWeights')}
          </h3>
          <p className="mb-3 text-xs text-gray-400">{t('step3.availableWeightsHint')}</p>
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
