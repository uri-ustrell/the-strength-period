import type { MuscleGroup, ProgressionMetric } from '@/types/exercise'

export type ProgressionType = 'linear' | 'undulating' | 'block'

export type ExerciseAssignment = {
  muscleGroup: MuscleGroup
  exerciseId: string
  progressionMetric: ProgressionMetric
}

export type LoadTarget = {
  sets: number
  reps: number | [number, number]
  weightKg?: number
  rpe?: number
  restSeconds: number
}

export type MuscleGroupTarget = {
  muscleGroup: MuscleGroup
  percentageOfSession: number
  loadTarget: LoadTarget
}

export type SessionTemplate = {
  id: string
  mesocycleId: string
  weekNumber: number
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7
  durationMinutes: number
  muscleGroupTargets: MuscleGroupTarget[]
  progressionType: ProgressionType
  restrictions: string[]
  exerciseAssignments?: ExerciseAssignment[]
  completed: boolean
  skipped: boolean
}

export type Mesocycle = {
  id: string
  name: string
  presetId: string
  startDate: string
  durationWeeks: number
  sessions: SessionTemplate[]
  createdAt: string
  active: boolean
}
