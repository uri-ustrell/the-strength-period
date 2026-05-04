import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { AppearanceSelector } from '@/components/ui/AppearanceSelector'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { Step3Context } from '@/pages/Onboarding/Step3Context'
import { useUserStore } from '@/stores/userStore'
import { DEFAULT_AESTHETIC_VARIANT } from '@/types/user'

const TOTAL_STEPS = 2

export const Onboarding = () => {
  const { t } = useTranslation('onboarding')
  const navigate = useNavigate()

  const completeOnboarding = useUserStore((s) => s.completeOnboarding)
  const equipment = useUserStore((s) => s.equipment)
  const trainingDays = useUserStore((s) => s.trainingDays)
  const aestheticVariant = useUserStore((s) => s.aestheticVariant)
  const setAestheticVariant = useUserStore((s) => s.setAestheticVariant)

  const reducedMotionForced = usePrefersReducedMotion()

  // Step 1 = Appearance (optional, skippable). Step 2 = Step3Context (existing).
  const [step, setStep] = useState<1 | 2>(1)

  const canFinish = equipment.length > 0 && trainingDays.length > 0

  const goNext = () => setStep(2)
  const goBack = () => setStep(1)

  /**
   * Skip leaves the user on the default `classic-boring` variant. We make the
   * intent explicit by writing the default through `setAestheticVariant` so the
   * persisted value reflects the user's (implicit) choice rather than a stale
   * pre-existing selection.
   */
  const handleSkip = () => {
    setAestheticVariant(DEFAULT_AESTHETIC_VARIANT)
    goNext()
  }

  const handleFinish = async () => {
    if (!canFinish) return
    await completeOnboarding()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <LanguageSelector />
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="text-lg font-semibold text-indigo-600">{t('title')}</h1>
          <p className="mt-1 text-xs text-gray-500">
            {t('step', { current: step, total: TOTAL_STEPS })}
          </p>
        </div>

        {/* Step Content */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {step === 1 ? (
            <div>
              <div className="mb-5 text-center">
                <h2 className="text-2xl font-bold text-gray-900">{t('appearance.title')}</h2>
              </div>
              <AppearanceSelector
                namespace="onboarding"
                keyPrefix="appearance"
                persistedVariant={aestheticVariant}
                onChange={setAestheticVariant}
                reducedMotionForced={reducedMotionForced}
              />
            </div>
          ) : (
            <Step3Context />
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </button>

          {step === 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                {t('skip')}
              </button>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {t('next')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={!canFinish}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {t('finish')}
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
