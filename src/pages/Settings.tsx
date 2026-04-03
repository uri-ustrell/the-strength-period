import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, User, HeartPulse, Dumbbell } from 'lucide-react'

import type { UserProfile } from '@/types/user'
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

const profiles: { key: UserProfile; icon: typeof User }[] = [
  { key: 'athlete', icon: Dumbbell },
  { key: 'rehab', icon: HeartPulse },
  { key: 'general', icon: User },
]

export const SettingsPage = () => {
  const { t } = useTranslation(['common', 'onboarding'])
  const navigate = useNavigate()

  const loadUserConfig = useUserStore((s) => s.loadUserConfig)
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)
  const equipment = useUserStore((s) => s.equipment)
  const setEquipment = useUserStore((s) => s.setEquipment)
  const availableDaysPerWeek = useUserStore((s) => s.availableDaysPerWeek)
  const setAvailableDaysPerWeek = useUserStore((s) => s.setAvailableDaysPerWeek)
  const minutesPerSession = useUserStore((s) => s.minutesPerSession)
  const setMinutesPerSession = useUserStore((s) => s.setMinutesPerSession)
  const activeRestrictions = useUserStore((s) => s.activeRestrictions)
  const setActiveRestrictions = useUserStore((s) => s.setActiveRestrictions)
  const completeOnboarding = useUserStore((s) => s.completeOnboarding)

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadUserConfig()
  }, [loadUserConfig])

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
        {/* Profile type */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {t('onboarding:step1.title')}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {profiles.map(({ key, icon: Icon }) => {
              const selected = profile === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProfile(key)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <Icon size={24} className={selected ? 'text-indigo-600' : 'text-gray-400'} />
                  <span className={`text-xs font-medium ${selected ? 'text-indigo-900' : 'text-gray-600'}`}>
                    {t(`onboarding:step1.${key}.title`)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Equipment */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {t('onboarding:step3.equipment')}
          </h2>
          <div className="grid grid-cols-2 gap-2">
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
                  {t(`onboarding:step3.equipmentOptions.${item}`)}
                </button>
              )
            })}
          </div>
        </section>

        {/* Days per week */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {t('onboarding:step3.daysPerWeek')}
          </h2>
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

        {/* Restrictions */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {t('onboarding:step3.restrictions')}
          </h2>
          <div className="grid grid-cols-2 gap-2">
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
                  {t(`onboarding:step3.restrictionOptions.${key}`)}
                </button>
              )
            })}
          </div>
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
