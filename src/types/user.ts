import type { Equipment } from '@/types/exercise'

export type UserProfile = 'athlete' | 'rehab' | 'general'

export type UserConfig = {
  profile: UserProfile
  language: 'ca' | 'es' | 'en'
  equipment: Equipment[]
  availableDaysPerWeek: number
  minutesPerSession: number
  activeRestrictions: string[]
  onboardingCompleted: boolean
}
