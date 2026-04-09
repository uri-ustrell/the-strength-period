import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'

import { useUserStore } from '@/stores/userStore'
import { Step3Context } from '@/pages/Onboarding/Step3Context'
import { LanguageSelector } from '@/components/ui/LanguageSelector'

export const Onboarding = () => {
  const { t } = useTranslation('onboarding')
  const navigate = useNavigate()

  const completeOnboarding = useUserStore((s) => s.completeOnboarding)

  const handleFinish = async () => {
    await completeOnboarding()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <LanguageSelector />
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-indigo-600">{t('title')}</h1>
        </div>

        {/* Step Content */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <Step3Context />
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleFinish}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {t('finish')}
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
