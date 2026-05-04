import type { DayOfWeek, Equipment } from '@/types/exercise'

export type WeightEquipment = 'manueles' | 'barra'

export type AvailableWeights = Record<WeightEquipment, number[]>

export const DEFAULT_AVAILABLE_WEIGHTS: AvailableWeights = {
  manueles: [],
  barra: [],
}

/**
 * Aesthetic variant key persisted in `UserConfig`.
 *
 * The list is open by design (see specs/features/16-ethical-gamification.md →
 * "Aesthetic Variants"): the field is a free-form string with a documented
 * allowlist, so adding a new variant never requires a schema migration.
 */
export type AestheticVariant = 'retro-platformer' | 'classic-boring' | (string & {})

/**
 * Default aesthetic variant for new users and for any persisted config that
 * predates the field. `classic-boring` is the calmer default and is also the
 * runtime-forced variant when `prefers-reduced-motion` is active.
 */
export const DEFAULT_AESTHETIC_VARIANT: AestheticVariant = 'classic-boring'

export type UserConfig = {
  language: 'ca' | 'es' | 'en'
  equipment: Equipment[]
  trainingDays: DayOfWeek[]
  minutesPerSession: number
  onboardingCompleted: boolean
  availableWeights: AvailableWeights
  /**
   * Optional. Missing values hydrate to {@link DEFAULT_AESTHETIC_VARIANT}.
   * Variants only re-skin the presentation layer; the gamification core is
   * shared across every variant.
   */
  aestheticVariant?: AestheticVariant
}
