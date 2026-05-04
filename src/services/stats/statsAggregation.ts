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
  // Parse 'YYYY-MM-DD' as local date (avoid UTC drift across week boundaries).
  const [yy, mm, dd] = dateStr.split('-').map(Number)
  const d =
    typeof yy === 'number' && typeof mm === 'number' && typeof dd === 'number'
      ? new Date(yy, mm - 1, dd)
      : new Date(dateStr)
  // Strict ISO 8601 week-numbering year: the year of the Thursday of the
  // current week decides the week's year. The first ISO week is the one that
  // contains the first Thursday (i.e. Jan 4th's week).
  const dayMon0 = (d.getDay() + 6) % 7 // 0=Mon ... 6=Sun
  // Move `d` to the Thursday of the same ISO week.
  d.setDate(d.getDate() - dayMon0 + 3)
  const isoYear = d.getFullYear()
  // Anchor week 1 as the week containing Jan 4th (always week 1 by ISO).
  const week1Thursday = new Date(isoYear, 0, 4)
  const week1ThursdayDayMon0 = (week1Thursday.getDay() + 6) % 7
  week1Thursday.setDate(week1Thursday.getDate() - week1ThursdayDayMon0 + 3)
  const weekNum = 1 + Math.round((d.getTime() - week1Thursday.getTime()) / (7 * 86400000))
  return `${isoYear}-W${String(weekNum).padStart(2, '0')}`
}

/**
 * Returns every ISO week label (`YYYY-Www`) between `startDateStr` and `endDateStr`,
 * inclusive. Used to fill empty weeks in adherence so a fully-skipped week shows
 * up as 0 instead of being silently dropped from the chart.
 */
function listISOWeeksBetween(startDateStr: string, endDateStr: string): string[] {
  const [sy, sm, sd] = startDateStr.split('-').map(Number)
  const [ey, em, ed] = endDateStr.split('-').map(Number)
  if ([sy, sm, sd, ey, em, ed].some((n) => typeof n !== 'number' || Number.isNaN(n))) {
    return []
  }
  const cursor = new Date(sy!, sm! - 1, sd!)
  const end = new Date(ey!, em! - 1, ed!)
  const seen = new Set<string>()
  const out: string[] = []
  // Walk day-by-day collecting unique ISO week labels in chronological order.
  while (cursor <= end) {
    const label = getISOWeek(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    )
    if (!seen.has(label)) {
      seen.add(label)
      out.push(label)
    }
    cursor.setDate(cursor.getDate() + 7)
  }
  // Always include the final week of the range (the +7 step may overshoot).
  const finalLabel = getISOWeek(endDateStr)
  if (!seen.has(finalLabel)) {
    out.push(finalLabel)
  }
  return out
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
  exerciseMap: Map<string, Exercise>
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
  exerciseId: string
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
  plannedPerWeek: number
): AdherenceDataPoint[] {
  const weekCompleted = new Map<string, number>()
  const dates: string[] = []

  for (const s of sessions) {
    if (s.skipped || !s.completedAt) continue
    const week = getISOWeek(s.date)
    weekCompleted.set(week, (weekCompleted.get(week) ?? 0) + 1)
    dates.push(s.date)
  }

  if (dates.length === 0) return []

  // Fill every week between the first and last completed session so that fully
  // skipped weeks show up as 0 (otherwise adherence appears artificially inflated).
  const sortedDates = [...dates].sort()
  const allWeeks = listISOWeeksBetween(sortedDates[0]!, sortedDates[sortedDates.length - 1]!)

  return allWeeks.map((week) => ({
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
