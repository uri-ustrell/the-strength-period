import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

import { useUserStore } from '@/stores/userStore'
import { Step1Profile } from '@/pages/Onboarding/Step1Profile'
import { Step3Context } from '@/pages/Onboarding/Step3Context'
import { LanguageSelector } from '@/components/ui/LanguageSelector'

const TOTAL_STEPS = 2

export const Onboarding = () => {
  const { t } = useTranslation('onboarding')
  const navigate = useNavigate()

  const currentStep = useUserStore((s) => s.currentStep)
  const setStep = useUserStore((s) => s.setStep)
  const profile = useUserStore((s) => s.profile)
  const completeOnboarding = useUserStore((s) => s.completeOnboarding)

  const canAdvance =
    (currentStep === 1 && profile !== null) ||
    currentStep === 2

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      setStep(currentStep + 1)
    } else {
      await completeOnboarding()
      navigate('/dashboard')
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setStep(currentStep - 1)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <LanguageSelector />
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-indigo-600">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('step', { current: currentStep, total: TOTAL_STEPS })}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
            <div
              key={step}
              className={`h-2 w-16 rounded-full transition-all ${
                step <= currentStep ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {currentStep === 1 && <Step1Profile />}
          {currentStep === 2 && <Step3Context />}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:invisible"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('back')}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {currentStep === TOTAL_STEPS ? (
              <>
                {t('finish')}
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                {t('next')}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
