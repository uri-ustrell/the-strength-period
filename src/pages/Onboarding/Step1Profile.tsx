import { useTranslation } from 'react-i18next'
import { User, HeartPulse, Dumbbell } from 'lucide-react'

import type { UserProfile } from '@/types/user'
import { useUserStore } from '@/stores/userStore'

const profiles: { key: UserProfile; icon: typeof User }[] = [
  { key: 'athlete', icon: Dumbbell },
  { key: 'rehab', icon: HeartPulse },
  { key: 'general', icon: User },
]

export const Step1Profile = () => {
  const { t } = useTranslation('onboarding')
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('step1.title')}
        </h2>
        <p className="mt-1 text-gray-500">{t('step1.subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {profiles.map(({ key, icon: Icon }) => {
          const selected = profile === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setProfile(key)}
              className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                selected
                  ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600'
                  : 'border-gray-200 bg-white hover:border-indigo-300'
              }`}
            >
              <Icon
                className={`h-10 w-10 ${
                  selected ? 'text-indigo-600' : 'text-gray-400'
                }`}
              />
              <div>
                <p
                  className={`font-semibold ${
                    selected ? 'text-indigo-900' : 'text-gray-900'
                  }`}
                >
                  {t(`step1.${key}.title`)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {t(`step1.${key}.description`)}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
