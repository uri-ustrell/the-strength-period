import { create } from 'zustand'
import { getConfig, setConfig } from '@/services/db/configRepository'
import type { DayOfWeek, Equipment } from '@/types/exercise'
import type { AvailableWeights, UserConfig } from '@/types/user'
import { DEFAULT_AUDIO_OPT_IN, DEFAULT_AVAILABLE_WEIGHTS } from '@/types/user'

interface UserStore {
  // State
  currentStep: number
  equipment: Equipment[]
  trainingDays: DayOfWeek[]
  minutesPerSession: number
  availableWeights: AvailableWeights
  audioOptIn: boolean
  onboardingCompleted: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setStep: (step: number) => void
  setEquipment: (equipment: Equipment[]) => void
  setTrainingDays: (days: DayOfWeek[]) => void
  setMinutesPerSession: (minutes: number) => void
  setAvailableWeights: (weights: AvailableWeights) => void
  setAudioOptIn: (value: boolean) => void
  completeOnboarding: () => Promise<void>
  loadOnboardingStatus: () => Promise<void>
  loadUserConfig: () => Promise<void>
  reset: () => void
}

const SUPPORTED_LANGUAGES: ReadonlyArray<UserConfig['language']> = ['ca', 'es', 'en']

function detectLanguage(): UserConfig['language'] {
  const raw = localStorage.getItem('i18nextLng')?.slice(0, 2) ?? ''
  return (SUPPORTED_LANGUAGES as ReadonlyArray<string>).includes(raw)
    ? (raw as UserConfig['language'])
    : 'ca'
}

/**
 * Validates the shape of a persisted `UserConfig`. Optional fields may be
 * absent (older configs) but, when present, must match their declared type.
 * Legacy fields removed in Feature 17 (e.g. `aestheticVariant`) are silently
 * tolerated — they're dropped on the next save.
 *
 * Exported for unit testing.
 */
export function isValidUserConfig(value: unknown): value is UserConfig {
  if (typeof value !== 'object' || value === null) return false
  const c = value as Record<string, unknown>
  if (!Array.isArray(c.equipment)) return false
  if (typeof c.minutesPerSession !== 'number') return false
  if (
    c.trainingDays !== undefined &&
    (!Array.isArray(c.trainingDays) || !c.trainingDays.every((d) => typeof d === 'number'))
  ) {
    return false
  }
  if (
    c.availableWeights !== undefined &&
    (typeof c.availableWeights !== 'object' || c.availableWeights === null)
  ) {
    return false
  }
  if (c.audioOptIn !== undefined && typeof c.audioOptIn !== 'boolean') {
    return false
  }
  return true
}

export const useUserStore = create<UserStore>((set, get) => ({
  currentStep: 1,
  equipment: [],
  trainingDays: [1, 3, 5],
  minutesPerSession: 45,
  availableWeights: { ...DEFAULT_AVAILABLE_WEIGHTS },
  audioOptIn: DEFAULT_AUDIO_OPT_IN,
  onboardingCompleted: false,
  isLoading: true,
  error: null,

  setStep: (step) => set({ currentStep: step }),
  setEquipment: (equipment) => set({ equipment }),
  setTrainingDays: (days) => set({ trainingDays: days }),
  setMinutesPerSession: (minutes) => set({ minutesPerSession: minutes }),
  setAvailableWeights: (weights) => set({ availableWeights: weights }),
  setAudioOptIn: (value) => set({ audioOptIn: value }),

  completeOnboarding: async () => {
    set({ isLoading: true, error: null })
    try {
      const state = get()
      const config: UserConfig = {
        language: detectLanguage(),
        equipment: state.equipment,
        trainingDays: state.trainingDays,
        minutesPerSession: state.minutesPerSession,
        availableWeights: state.availableWeights,
        audioOptIn: state.audioOptIn,
        onboardingCompleted: true,
      }

      await setConfig('userConfig', config)
      await setConfig('onboardingCompleted', true)

      set({ onboardingCompleted: true, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  loadOnboardingStatus: async () => {
    set({ isLoading: true, error: null })
    try {
      const completed = await getConfig('onboardingCompleted')
      set({ onboardingCompleted: completed === true, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  loadUserConfig: async () => {
    try {
      const raw = await getConfig('userConfig')
      if (raw === null) return
      if (!isValidUserConfig(raw)) {
        if (import.meta.env.DEV) {
          console.warn('[userStore] Invalid userConfig in IDB, ignoring and keeping defaults')
        }
        return
      }
      const config = raw
      set({
        equipment: config.equipment,
        trainingDays: config.trainingDays ?? [1, 3, 5],
        minutesPerSession: config.minutesPerSession,
        availableWeights: config.availableWeights ?? { ...DEFAULT_AVAILABLE_WEIGHTS },
        audioOptIn: config.audioOptIn ?? DEFAULT_AUDIO_OPT_IN,
      })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  reset: () =>
    set({
      currentStep: 1,
      equipment: [],
      trainingDays: [1, 3, 5],
      minutesPerSession: 45,
      availableWeights: { ...DEFAULT_AVAILABLE_WEIGHTS },
      audioOptIn: DEFAULT_AUDIO_OPT_IN,
      onboardingCompleted: false,
      isLoading: false,
      error: null,
    }),
}))
