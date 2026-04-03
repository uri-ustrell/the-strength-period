import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Trophy } from 'lucide-react'

import type { ExecutedSession, ExecutedSet } from '@/types/session'
import type { Exercise } from '@/types/exercise'
import { useExercises } from '@/hooks/useExercises'
import { usePlanningStore } from '@/stores/planningStore'
import {
  listSessionsByDateRange,
  listSetsByDateRange,
  listAllSessions,
  listAllSets,
} from '@/services/db/sessionRepository'
import { VolumeChart } from '@/components/stats/VolumeChart'
import { ProgressionChart } from '@/components/stats/ProgressionChart'
import { AdherenceChart } from '@/components/stats/AdherenceChart'
import { ExportButton } from '@/components/data/ExportButton'
import { ImportButton } from '@/components/data/ImportButton'

type Period = 'week' | 'month' | 'all'

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr)
  const dayOfWeek = d.getDay() || 7
  d.setDate(d.getDate() + 4 - dayOfWeek)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function buildExerciseMap(exercises: Exercise[]): Map<string, Exercise> {
  const map = new Map<string, Exercise>()
  for (const ex of exercises) {
    map.set(ex.id, ex)
  }
  return map
}

interface VolumeDataPoint {
  week: string
  [muscleGroup: string]: number | string
}

function aggregateVolume(
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

interface ProgressionDataPoint {
  date: string
  weight: number
  volume: number
}

function aggregateProgression(
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

interface AdherenceDataPoint {
  week: string
  planned: number
  completed: number
}

function aggregateAdherence(
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

interface PRRecord {
  exerciseId: string
  bestWeight: number
  bestReps: number
  bestVolume: number
  date: string
}

function aggregatePRs(sets: ExecutedSet[]): PRRecord[] {
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

export const Stats = () => {
  const { t } = useTranslation(['stats', 'common', 'exercises'])
  const { exercises } = useExercises()

  const activeMesocycle = usePlanningStore((s) => s.activeMesocycle)
  const loadActive = usePlanningStore((s) => s.loadActive)

  const [period, setPeriod] = useState<Period>('month')
  const [sessions, setSessions] = useState<ExecutedSession[]>([])
  const [sets, setSets] = useState<ExecutedSet[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')

  useEffect(() => {
    loadActive()
  }, [loadActive])

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date()
      if (period === 'all') {
        const [allSessions, allSets] = await Promise.all([
          listAllSessions(),
          listAllSets(),
        ])
        setSessions(allSessions)
        setSets(allSets)
      } else {
        const daysBack = period === 'week' ? 7 : 30
        const from = new Date(now)
        from.setDate(from.getDate() - daysBack)
        const [rangeSessions, rangeSets] = await Promise.all([
          listSessionsByDateRange(toDateStr(from), toDateStr(now)),
          listSetsByDateRange(toDateStr(from), toDateStr(now)),
        ])
        setSessions(rangeSessions)
        setSets(rangeSets)
      }
    }
    fetchData()
  }, [period])

  const exerciseMap = useMemo(() => buildExerciseMap(exercises), [exercises])

  const { data: volumeData, muscleGroups } = useMemo(
    () => aggregateVolume(sets, exerciseMap),
    [sets, exerciseMap],
  )

  const progressionData = useMemo(
    () => (selectedExerciseId ? aggregateProgression(sets, selectedExerciseId) : []),
    [sets, selectedExerciseId],
  )

  const plannedPerWeek = useMemo(() => {
    if (!activeMesocycle) return 3
    const weekSessions = activeMesocycle.sessions.filter((s) => s.weekNumber === 1)
    return weekSessions.length || 3
  }, [activeMesocycle])

  const adherenceData = useMemo(
    () => aggregateAdherence(sessions, plannedPerWeek),
    [sessions, plannedPerWeek],
  )

  const prRecords = useMemo(() => aggregatePRs(sets), [sets])

  const exercisesWithSets = useMemo(() => {
    const ids = new Set(sets.map((s) => s.exerciseId))
    return exercises.filter((ex) => ids.has(ex.id))
  }, [sets, exercises])

  const selectedExerciseName = useMemo(() => {
    const ex = exerciseMap.get(selectedExerciseId)
    return ex ? t(ex.nameKey) : ''
  }, [selectedExerciseId, exerciseMap, t])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">{t('stats:title')}</h1>

        {/* Period selector */}
        <div className="mt-3 flex gap-2">
          {(['week', 'month', 'all'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(`stats:period.${p}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-5 pt-4">
        {/* Volume Chart */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <VolumeChart data={volumeData} muscleGroups={muscleGroups} />
        </section>

        {/* Progression Chart */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('stats:progression')}</h3>
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="w-full mb-3 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">{t('stats:select_exercise')}</option>
            {exercisesWithSets.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {t(ex.nameKey)}
              </option>
            ))}
          </select>
          {selectedExerciseId ? (
            <ProgressionChart data={progressionData} exerciseName={selectedExerciseName} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">{t('stats:select_exercise')}</p>
          )}
        </section>

        {/* Adherence Chart */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <AdherenceChart data={adherenceData} />
        </section>

        {/* PR Tracker Table */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
            <Trophy size={16} className="text-amber-500" />
            {t('stats:pr_tracker')}
          </h3>

          {prRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium">{t('stats:exercise')}</th>
                    <th className="pb-2 font-medium text-right">{t('stats:best_weight')}</th>
                    <th className="pb-2 font-medium text-right">{t('stats:best_reps')}</th>
                    <th className="pb-2 font-medium text-right">{t('stats:best_volume')}</th>
                  </tr>
                </thead>
                <tbody>
                  {prRecords.slice(0, 15).map((pr) => {
                    const ex = exerciseMap.get(pr.exerciseId)
                    const name = ex ? t(ex.nameKey) : pr.exerciseId
                    return (
                      <tr key={pr.exerciseId} className="border-b border-gray-50">
                        <td className="py-2 font-medium text-gray-900">{name}</td>
                        <td className="py-2 text-right text-gray-600">
                          {pr.bestWeight > 0 ? `${pr.bestWeight}kg` : '—'}
                        </td>
                        <td className="py-2 text-right text-gray-600">{pr.bestReps}</td>
                        <td className="py-2 text-right text-gray-600">
                          {pr.bestVolume > 0 ? `${pr.bestVolume}kg` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">{t('stats:no_data')}</p>
          )}
        </section>

        {/* Export / Import */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t('stats:export_import')}
          </h3>
          <div className="flex gap-3">
            <ExportButton />
            <ImportButton />
          </div>
        </section>
      </div>
    </div>
  )
}

