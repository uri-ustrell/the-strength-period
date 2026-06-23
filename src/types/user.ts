import type { DayOfWeek, Equipment } from '@/types/exercise'

export type WeightEquipment = 'manueles' | 'barra'

export type AvailableWeights = Record<WeightEquipment, number[]>

export const DEFAULT_AVAILABLE_WEIGHTS: AvailableWeights = {
  manueles: [],
  barra: [],
}

/**
 * Audio is an explicit user opt-in (default `false`). When `true`, the
 * session/stats audio services play their short chimes; otherwise they
 * short-circuit.
 */
export const DEFAULT_AUDIO_OPT_IN = false

export type UserConfig = {
  language: 'ca' | 'es' | 'en'
  equipment: Equipment[]
  trainingDays: DayOfWeek[]
  minutesPerSession: number
  onboardingCompleted: boolean
  availableWeights: AvailableWeights
  /**
   * Optional. Missing values hydrate to {@link DEFAULT_AUDIO_OPT_IN}.
   * Persistence is local-only — no telemetry, no IDB schema change.
   */
  audioOptIn?: boolean
}
