import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import commonCa from './locales/ca/common.json'
import commonEs from './locales/es/common.json'
import commonEn from './locales/en/common.json'
import exercisesCa from './locales/ca/exercises.json'
import exercisesEs from './locales/es/exercises.json'
import exercisesEn from './locales/en/exercises.json'
import musclesCa from './locales/ca/muscles.json'
import musclesEs from './locales/es/muscles.json'
import musclesEn from './locales/en/muscles.json'
import onboardingCa from './locales/ca/onboarding.json'
import onboardingEs from './locales/es/onboarding.json'
import onboardingEn from './locales/en/onboarding.json'
import planningCa from './locales/ca/planning.json'
import planningEs from './locales/es/planning.json'
import planningEn from './locales/en/planning.json'
import statsCa from './locales/ca/stats.json'
import statsEs from './locales/es/stats.json'
import statsEn from './locales/en/stats.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ca: { common: commonCa, exercises: exercisesCa, muscles: musclesCa, onboarding: onboardingCa, planning: planningCa, stats: statsCa },
      es: { common: commonEs, exercises: exercisesEs, muscles: musclesEs, onboarding: onboardingEs, planning: planningEs, stats: statsEs },
      en: { common: commonEn, exercises: exercisesEn, muscles: musclesEn, onboarding: onboardingEn, planning: planningEn, stats: statsEn },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'exercises', 'muscles', 'onboarding', 'planning', 'stats'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
