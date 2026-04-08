import type { MuscleGroup } from '@/types/exercise'
import type { Preset } from '@/data/presets'
import { ALL_MUSCLE_GROUPS } from '@/data/muscleGroups'

export type MuscleGroupPriority = 'high' | 'medium' | 'low'

const PRIORITY_WEIGHTS: Record<MuscleGroupPriority, number> = { high: 3, medium: 2, low: 1 }

export function presetToMuscleGroupPriorities(
  preset: Preset | null,
): Record<MuscleGroup, MuscleGroupPriority | null> {
  const priorities: Record<string, MuscleGroupPriority | null> = {}
  for (const mg of ALL_MUSCLE_GROUPS) {
    priorities[mg] = preset ? null : 'medium'
  }
  if (preset) {
    for (const [mg, pct] of Object.entries(preset.muscleDistribution)) {
      if (ALL_MUSCLE_GROUPS.includes(mg as MuscleGroup)) {
        if (pct >= 25) priorities[mg] = 'high'
        else if (pct >= 10) priorities[mg] = 'medium'
        else priorities[mg] = 'low'
      }
    }
  }
  return priorities as Record<MuscleGroup, MuscleGroupPriority | null>
}

export function buildMuscleDistribution(
  muscleGroupPriorities: Record<MuscleGroup, MuscleGroupPriority | null>,
): Record<string, number> {
  const selectedMuscles = Object.entries(muscleGroupPriorities).filter(
    ([, p]) => p !== null,
  ) as [string, MuscleGroupPriority][]
  const totalWeight = selectedMuscles.reduce((sum, [, p]) => sum + PRIORITY_WEIGHTS[p], 0)
  const dist: Record<string, number> = {}
  for (const [mg, priority] of selectedMuscles) {
    dist[mg] = Math.round((PRIORITY_WEIGHTS[priority] / totalWeight) * 100)
  }
  return dist
}

export function prioritiesToMuscleDistribution(
  muscleGroupPriorities: Record<MuscleGroup, MuscleGroupPriority | null>,
): Partial<Record<MuscleGroup, number>> {
  const selectedMuscles = Object.entries(muscleGroupPriorities).filter(
    ([, p]) => p !== null,
  ) as [string, MuscleGroupPriority][]
  const totalWeight = selectedMuscles.reduce((sum, [, p]) => sum + PRIORITY_WEIGHTS[p], 0)
  const dist: Partial<Record<MuscleGroup, number>> = {}
  for (const [mg, priority] of selectedMuscles) {
    (dist as Record<string, number>)[mg] = Math.round(
      (PRIORITY_WEIGHTS[priority] / totalWeight) * 100,
    )
  }
  return dist
}
