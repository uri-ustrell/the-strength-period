import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Equipment } from '@/types/exercise'
import { useUserStore } from '@/stores/userStore'

const ALL_EQUIPMENT: Equipment[] = [
  'pes_corporal',
  'manueles',
  'barra',
  'banda_elastica',
  'pilates',
  'trx',
]

const MINUTES_OPTIONS = [15, 30, 45, 60, 90]

const RESTRICTION_KEYS = [
  'knee',
  'ankle',
  'back',
  'shoulder',
  'hip',
  'wrist',
] as const

export const Step3Context = () => {
  const { t } = useTranslation('onboarding')
  const equipment = useUserStore((s) => s.equipment)
  const setEquipment = useUserStore((s) => s.setEquipment)
  const availableDaysPerWeek = useUserStore((s) => s.availableDaysPerWeek)
  const setAvailableDaysPerWeek = useUserStore((s) => s.setAvailableDaysPerWeek)
  const minutesPerSession = useUserStore((s) => s.minutesPerSession)
  const setMinutesPerSession = useUserStore((s) => s.setMinutesPerSession)
  const activeRestrictions = useUserStore((s) => s.activeRestrictions)
  const setActiveRestrictions = useUserStore((s) => s.setActiveRestrictions)

  const [otherRestrictions, setOtherRestrictions] = useState('')

  const toggleEquipment = (item: Equipment) => {
    if (equipment.includes(item)) {
      setEquipment(equipment.filter((e) => e !== item))
    } else {
      setEquipment([...equipment, item])
    }
  }

  const toggleRestriction = (key: string) => {
    if (activeRestrictions.includes(key)) {
      setActiveRestrictions(activeRestrictions.filter((r) => r !== key))
    } else {
      setActiveRestrictions([...activeRestrictions, key])
    }
  }

  const handleOtherRestrictionsBlur = () => {
    const trimmed = otherRestrictions.trim()
    const withoutCustom = activeRestrictions.filter((r) =>
      RESTRICTION_KEYS.includes(r as typeof RESTRICTION_KEYS[number])
    )
    if (trimmed) {
      setActiveRestrictions([...withoutCustom, trimmed])
    } else {
      setActiveRestrictions(withoutCustom)
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

      {/* Days per week */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          {t('step3.daysPerWeek')}
        </h3>
        <div className="flex gap-2">
          {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setAvailableDaysPerWeek(day)}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                availableDaysPerWeek === day
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-indigo-100'
              }`}
            >
              {day}
            </button>
          ))}
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {RESTRICTION_KEYS.map((key) => {
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
        <div className="mt-3">
          <label
            htmlFor="other-restrictions"
            className="block text-sm text-gray-600"
          >
            {t('step3.otherRestrictions')}
          </label>
          <textarea
            id="other-restrictions"
            value={otherRestrictions}
            onChange={(e) => setOtherRestrictions(e.target.value)}
            onBlur={handleOtherRestrictionsBlur}
            placeholder={t('step3.otherRestrictionsPlaceholder')}
            rows={2}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>
  )
}
