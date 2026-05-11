import type { DayOfWeek, Equipment } from '@/types/exercise'

export type WeightEquipment = 'manueles' | 'barra'

export type AvailableWeights = Record<WeightEquipment, number[]>

export const DEFAULT_AVAILABLE_WEIGHTS: AvailableWeights = {
  manueles: [],
  barra: [],
}

/**
 * Feature 17 — "Progreso Jugable" redesign.
 *
 * Audio is now an explicit user opt-in (default `false`). Replaces the
 * Step 16 `aestheticVariant` audio gate. When `true`, the session/stats
 * audio services play their short chimes; otherwise they short-circuit.
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
