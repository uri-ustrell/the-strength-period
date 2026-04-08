import type { Equipment, DayOfWeek, RestrictionCondition } from '@/types/exercise'

export type WeightEquipment = 'manueles' | 'barra'

export type AvailableWeights = Record<WeightEquipment, number[]>

export const DEFAULT_AVAILABLE_WEIGHTS: AvailableWeights = {
  manueles: [],
  barra: [],
}

export type UserConfig = {
  language: 'ca' | 'es' | 'en'
  equipment: Equipment[]
  trainingDays: DayOfWeek[]
  minutesPerSession: number
  activeRestrictions: RestrictionCondition[]
  onboardingCompleted: boolean
  availableWeights: AvailableWeights
}
