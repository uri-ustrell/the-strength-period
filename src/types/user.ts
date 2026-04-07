import type { Equipment } from '@/types/exercise'

export type UserProfile = 'athlete' | 'rehab' | 'general'

export type WeightEquipment = 'manueles' | 'barra'

export type AvailableWeights = Record<WeightEquipment, number[]>

export const DEFAULT_AVAILABLE_WEIGHTS: AvailableWeights = {
  manueles: [2, 4, 6, 8, 10, 12, 14, 16, 20, 24],
  barra: [20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80],
}

export type UserConfig = {
  profile: UserProfile
  language: 'ca' | 'es' | 'en'
  equipment: Equipment[]
  availableDaysPerWeek: number
  minutesPerSession: number
  activeRestrictions: string[]
  onboardingCompleted: boolean
  weeklyProgression: number
  availableWeights: AvailableWeights
}
