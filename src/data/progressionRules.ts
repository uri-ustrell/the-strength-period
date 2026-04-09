import type { ProgressionType } from '@/types/planning'

export type ProgressionRule = {
  type: ProgressionType
  weeklyVolumeIncrease: number
  deloadWeek: number
  deloadPercentage: number
}

export const PROGRESSION_RULES: Record<ProgressionType, ProgressionRule> = {
  linear: { type: 'linear', weeklyVolumeIncrease: 0.075, deloadWeek: 4, deloadPercentage: 0.6 },
  undulating: {
    type: 'undulating',
    weeklyVolumeIncrease: 0.05,
    deloadWeek: 4,
    deloadPercentage: 0.6,
  },
  block: { type: 'block', weeklyVolumeIncrease: 0.1, deloadWeek: 4, deloadPercentage: 0.6 },
}
