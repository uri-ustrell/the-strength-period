import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Brain, HardDrive, Shield } from 'lucide-react'
import { LanguageSelector } from '@/components/ui/LanguageSelector'

export const Landing = () => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <LanguageSelector />
      <h1 className="text-4xl font-bold text-gray-900 text-center">
        {t('landing.title')}
      </h1>
      <p className="mt-2 text-xl text-gray-500 text-center">
        {t('landing.subtitle')}
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-3 max-w-3xl">
        <div className="flex flex-col items-center text-center p-4">
          <Brain className="h-10 w-10 text-indigo-600 mb-3" />
          <p className="text-sm text-gray-700">{t('landing.feature_ai')}</p>
        </div>
        <div className="flex flex-col items-center text-center p-4">
          <HardDrive className="h-10 w-10 text-green-600 mb-3" />
          <p className="text-sm text-gray-700">{t('landing.feature_local')}</p>
        </div>
        <div className="flex flex-col items-center text-center p-4">
          <Shield className="h-10 w-10 text-amber-600 mb-3" />
          <p className="text-sm text-gray-700">{t('landing.feature_privacy')}</p>
        </div>
      </div>

      <button
        onClick={() => navigate('/onboarding')}
        className="mt-10 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
      >
        {t('landing.cta')}
      </button>
    </div>
  )
}
