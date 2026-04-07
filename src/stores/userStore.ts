import { create } from 'zustand'

import type { UserProfile, UserConfig } from '@/types/user'
import type { Equipment } from '@/types/exercise'
import { getConfig, setConfig } from '@/services/db/configRepository'

interface UserStore {
  // State
  currentStep: number
  profile: UserProfile | null
  equipment: Equipment[]
  availableDaysPerWeek: number
  minutesPerSession: number
  activeRestrictions: string[]
  onboardingCompleted: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setStep: (step: number) => void
  setProfile: (profile: UserProfile) => void
  setEquipment: (equipment: Equipment[]) => void
  setAvailableDaysPerWeek: (days: number) => void
  setMinutesPerSession: (minutes: number) => void
  setActiveRestrictions: (restrictions: string[]) => void
  completeOnboarding: () => Promise<void>
  loadOnboardingStatus: () => Promise<void>
  loadUserConfig: () => Promise<void>
  reset: () => void
}

export const useUserStore = create<UserStore>((set, get) => ({
  currentStep: 1,
  profile: null,
  equipment: [],
  availableDaysPerWeek: 3,
  minutesPerSession: 45,
  activeRestrictions: [],
  onboardingCompleted: false,
  isLoading: true,
  error: null,

  setStep: (step) => set({ currentStep: step }),
  setProfile: (profile) => set({ profile }),
  setEquipment: (equipment) => set({ equipment }),
  setAvailableDaysPerWeek: (days) => set({ availableDaysPerWeek: days }),
  setMinutesPerSession: (minutes) => set({ minutesPerSession: minutes }),
  setActiveRestrictions: (restrictions) => set({ activeRestrictions: restrictions }),

  completeOnboarding: async () => {
    set({ isLoading: true, error: null })
    try {
      const state = get()
      const config: UserConfig = {
        profile: state.profile!,
        language: (localStorage.getItem('i18nextLng') as UserConfig['language']) || 'ca',
        equipment: state.equipment,
        availableDaysPerWeek: state.availableDaysPerWeek,
        minutesPerSession: state.minutesPerSession,
        activeRestrictions: state.activeRestrictions,
        onboardingCompleted: true,
        weeklyProgression: 5,
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
          profile: config.profile,
          equipment: config.equipment,
          availableDaysPerWeek: config.availableDaysPerWeek,
          minutesPerSession: config.minutesPerSession,
          activeRestrictions: config.activeRestrictions,
        })
      }
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  reset: () => set({
    currentStep: 1,
    profile: null,
    equipment: [],
    availableDaysPerWeek: 3,
    minutesPerSession: 45,
    activeRestrictions: [],
    onboardingCompleted: false,
    isLoading: false,
    error: null,
  }),
}))
