import { create } from 'zustand'

import type { UserConfig, AvailableWeights } from '@/types/user'
import { DEFAULT_AVAILABLE_WEIGHTS } from '@/types/user'
import type { Equipment, DayOfWeek, RestrictionCondition } from '@/types/exercise'
import { getConfig, setConfig } from '@/services/db/configRepository'

interface UserStore {
  // State
  currentStep: number
  equipment: Equipment[]
  trainingDays: DayOfWeek[]
  minutesPerSession: number
  activeRestrictions: RestrictionCondition[]
  availableWeights: AvailableWeights
  onboardingCompleted: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setStep: (step: number) => void
  setEquipment: (equipment: Equipment[]) => void
  setTrainingDays: (days: DayOfWeek[]) => void
  setMinutesPerSession: (minutes: number) => void
  setActiveRestrictions: (restrictions: RestrictionCondition[]) => void
  setAvailableWeights: (weights: AvailableWeights) => void
  completeOnboarding: () => Promise<void>
  loadOnboardingStatus: () => Promise<void>
  loadUserConfig: () => Promise<void>
  reset: () => void
}

export const useUserStore = create<UserStore>((set, get) => ({
  currentStep: 1,
  equipment: [],
  trainingDays: [1, 3, 5],
  minutesPerSession: 45,
  activeRestrictions: [],
  availableWeights: { ...DEFAULT_AVAILABLE_WEIGHTS },
  onboardingCompleted: false,
  isLoading: true,
  error: null,

  setStep: (step) => set({ currentStep: step }),
  setEquipment: (equipment) => set({ equipment }),
  setTrainingDays: (days) => set({ trainingDays: days }),
  setMinutesPerSession: (minutes) => set({ minutesPerSession: minutes }),
  setActiveRestrictions: (restrictions) => set({ activeRestrictions: restrictions }),
  setAvailableWeights: (weights) => set({ availableWeights: weights }),

  completeOnboarding: async () => {
    set({ isLoading: true, error: null })
    try {
      const state = get()
      const config: UserConfig = {
        language: (localStorage.getItem('i18nextLng') as UserConfig['language']) || 'ca',
        equipment: state.equipment,
        trainingDays: state.trainingDays,
        minutesPerSession: state.minutesPerSession,
        activeRestrictions: state.activeRestrictions,
        availableWeights: state.availableWeights,
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
      const config = await getConfig('userConfig') as UserConfig | null
      if (config) {
        set({
          equipment: config.equipment,
          trainingDays: config.trainingDays ?? [1, 3, 5],
          minutesPerSession: config.minutesPerSession,
          activeRestrictions: config.activeRestrictions,
          availableWeights: config.availableWeights ?? { ...DEFAULT_AVAILABLE_WEIGHTS },
        })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  reset: () => set({
    currentStep: 1,
    equipment: [],
    trainingDays: [1, 3, 5],
    minutesPerSession: 45,
    activeRestrictions: [],
    availableWeights: { ...DEFAULT_AVAILABLE_WEIGHTS },
    onboardingCompleted: false,
    isLoading: false,
    error: null,
  }),
}))
