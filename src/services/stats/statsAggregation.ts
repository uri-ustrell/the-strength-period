import type { ExecutedSession, ExecutedSet } from '@/types/session'
import type { Exercise } from '@/types/exercise'

export interface VolumeDataPoint {
  week: string
  [muscleGroup: string]: number | string
}

export interface ProgressionDataPoint {
  date: string
  weight: number
  volume: number
}

export interface AdherenceDataPoint {
  week: string
  planned: number
  completed: number
}

export interface PRRecord {
  exerciseId: string
  bestWeight: number
  bestReps: number
  bestVolume: number
  date: string
}

function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr)
  const dayOfWeek = d.getDay() || 7
  d.setDate(d.getDate() + 4 - dayOfWeek)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export function buildExerciseMap(exercises: Exercise[]): Map<string, Exercise> {
  const map = new Map<string, Exercise>()
  for (const ex of exercises) {
    map.set(ex.id, ex)
  }
  return map
}

export function aggregateVolume(
  sets: ExecutedSet[],
  exerciseMap: Map<string, Exercise>,
): { data: VolumeDataPoint[]; muscleGroups: string[] } {
  const weekMuscles = new Map<string, Map<string, number>>()
  const allMuscles = new Set<string>()

  for (const s of sets) {
    const ex = exerciseMap.get(s.exerciseId)
    if (!ex) continue
    const week = getISOWeek(s.date)

    if (!weekMuscles.has(week)) weekMuscles.set(week, new Map())
    const muscles = weekMuscles.get(week)!

    for (const mg of ex.primaryMuscles) {
      allMuscles.add(mg)
      muscles.set(mg, (muscles.get(mg) ?? 0) + 1)
    }
  }

  const weeks = Array.from(weekMuscles.keys()).sort()
  const muscleGroups = Array.from(allMuscles)

  const data: VolumeDataPoint[] = weeks.map((week) => {
    const entry: VolumeDataPoint = { week: week.split('-')[1] ?? week }
    const muscles = weekMuscles.get(week)!
    for (const mg of muscleGroups) {
      entry[mg] = muscles.get(mg) ?? 0
    }
    return entry
  })

  return { data, muscleGroups }
}

export function aggregateProgression(
  sets: ExecutedSet[],
  exerciseId: string,
): ProgressionDataPoint[] {
  const byDate = new Map<string, { maxWeight: number; maxVolume: number }>()

  for (const s of sets) {
    if (s.exerciseId !== exerciseId) continue
    const weight = s.weightKgActual ?? 0
    const volume = weight * s.repsActual

    const existing = byDate.get(s.date)
    if (existing) {
      existing.maxWeight = Math.max(existing.maxWeight, weight)
      existing.maxVolume = Math.max(existing.maxVolume, volume)
    } else {
      byDate.set(s.date, { maxWeight: weight, maxVolume: volume })
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { maxWeight, maxVolume }]) => ({
      date,
      weight: maxWeight,
      volume: maxVolume,
    }))
}

export function aggregateAdherence(
  sessions: ExecutedSession[],
  plannedPerWeek: number,
): AdherenceDataPoint[] {
  const weekCompleted = new Map<string, number>()

  for (const s of sessions) {
    if (s.skipped || !s.completedAt) continue
    const week = getISOWeek(s.date)
    weekCompleted.set(week, (weekCompleted.get(week) ?? 0) + 1)
  }

  const weeks = Array.from(weekCompleted.keys()).sort()
  return weeks.map((week) => ({
    week: week.split('-')[1] ?? week,
    planned: plannedPerWeek,
    completed: weekCompleted.get(week) ?? 0,
  }))
}

export function aggregatePRs(sets: ExecutedSet[]): PRRecord[] {
  const prs = new Map<string, PRRecord>()

  for (const s of sets) {
    const weight = s.weightKgActual ?? 0
    const volume = weight * s.repsActual

    const existing = prs.get(s.exerciseId)
    if (!existing) {
      prs.set(s.exerciseId, {
        exerciseId: s.exerciseId,
        bestWeight: weight,
        bestReps: s.repsActual,
        bestVolume: volume,
        date: s.date,
      })
    } else {
      if (weight > existing.bestWeight) {
        existing.bestWeight = weight
        existing.date = s.date
      }
      if (s.repsActual > existing.bestReps) existing.bestReps = s.repsActual
      if (volume > existing.bestVolume) existing.bestVolume = volume
    }
  }

  return Array.from(prs.values()).sort((a, b) => b.bestVolume - a.bestVolume)
}
