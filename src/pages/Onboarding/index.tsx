import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { Step3Context } from '@/pages/Onboarding/Step3Context'
import { useUserStore } from '@/stores/userStore'

/**
 * Onboarding.
 *
 * A single context step: pick equipment,
 * training days and minutes per session, then finish.
 */
export const Onboarding = () => {
  const { t } = useTranslation('onboarding')
  const navigate = useNavigate()

  const completeOnboarding = useUserStore((s) => s.completeOnboarding)
  const equipment = useUserStore((s) => s.equipment)
  const trainingDays = useUserStore((s) => s.trainingDays)

  const canFinish = equipment.length > 0 && trainingDays.length > 0

  const handleFinish = async () => {
    if (!canFinish) return
    await completeOnboarding()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <LanguageSelector />
      <div className="mx-auto max-w-lg">
        <div className="mb-4 text-center">
          <h1 className="text-lg font-semibold text-accent">{t('title')}</h1>
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <Step3Context />
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={handleFinish}
            disabled={!canFinish}
            className="inline-flex items-center gap-1 rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('finish')}
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
