import { Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExportButton } from '@/components/data/ExportButton'
import { ImportButton } from '@/components/data/ImportButton'
import { AdherenceChart } from '@/components/stats/AdherenceChart'
import { ChartThemeProvider } from '@/components/stats/ChartThemeProvider'
import { ProgressionChart } from '@/components/stats/ProgressionChart'
import { TotemInventory } from '@/components/stats/TotemInventory'
import { VolumeChart } from '@/components/stats/VolumeChart'
import { useExercises } from '@/hooks/useExercises'
import { closeStatsAudio } from '@/services/audio/statsAudio'
import {
  listAllSessions,
  listAllSets,
  listSessionsByDateRange,
  listSetsByDateRange,
} from '@/services/db/sessionRepository'
import { buildTotemInventoryModel } from '@/services/stats/buildTotemInventoryModel'
import {
  aggregateAdherence,
  aggregatePRs,
  aggregateProgression,
  aggregateVolume,
  buildExerciseMap,
} from '@/services/stats/statsAggregation'
import { usePlanningStore } from '@/stores/planningStore'
import type { ExecutedSession, ExecutedSet } from '@/types/session'
import { toDateStr } from '@/utils/dateHelpers'

type Period = 'week' | 'month' | 'all'

export const Stats = () => {
  const { t } = useTranslation(['stats', 'common', 'exercises'])
  const { exercises } = useExercises()

  const activeMesocycle = usePlanningStore((s) => s.activeMesocycle)
  const loadActive = usePlanningStore((s) => s.loadActive)

  const [period, setPeriod] = useState<Period>('month')
  const [sessions, setSessions] = useState<ExecutedSession[]>([])
  const [sets, setSets] = useState<ExecutedSet[]>([])
  // Full-history snapshots, used by the totem inventory which is
  // time-window-agnostic (Phase D Shared Contracts). The period selector
  // above does NOT scope these.
  const [allSessionsHistory, setAllSessionsHistory] = useState<ExecutedSession[]>([])
  const [allSetsHistory, setAllSetsHistory] = useState<ExecutedSet[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')

  useEffect(() => {
    loadActive()
  }, [loadActive])

  // Release the cached `AudioContext`(s) the stats audio service may have
  // allocated for the totem inspect chime when the user navigates away
  // from this page. Otherwise the contexts leak across SPA navigations.
  useEffect(() => {
    return () => {
      closeStatsAudio()
    }
  }, [])

  // Always load the full session/set history for the totem inventory model.
  // Phase D requires totems to be cumulative and time-window-agnostic, so
  // they cannot reuse the period-scoped `sessions`/`sets` above.
  useEffect(() => {
    let cancelled = false
    const fetchAll = async () => {
      const [allSessions, allSets] = await Promise.all([listAllSessions(), listAllSets()])
      if (cancelled) return
      setAllSessionsHistory(allSessions)
      setAllSetsHistory(allSets)
    }
    fetchAll()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date()
      if (period === 'all') {
        const [allSessions, allSets] = await Promise.all([listAllSessions(), listAllSets()])
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
    [sets, exerciseMap]
  )

  const progressionData = useMemo(
    () => (selectedExerciseId ? aggregateProgression(sets, selectedExerciseId) : []),
    [sets, selectedExerciseId]
  )

  const plannedPerWeek = useMemo(() => {
    if (!activeMesocycle) return 3
    const weekSessions = activeMesocycle.sessions.filter((s) => s.weekNumber === 1)
    return weekSessions.length || 3
  }, [activeMesocycle])

  const adherenceData = useMemo(
    () => aggregateAdherence(sessions, plannedPerWeek),
    [sessions, plannedPerWeek]
  )

  const prRecords = useMemo(() => aggregatePRs(sets), [sets])

  // Phase D — derive totem inventory from FULL history (period-agnostic).
  const totemModel = useMemo(
    () =>
      buildTotemInventoryModel({
        executedSessions: allSessionsHistory,
        executedSets: allSetsHistory,
        mesocycles: activeMesocycle ? [activeMesocycle] : [],
        nowMs: Date.now(),
      }),
    [allSessionsHistory, allSetsHistory, activeMesocycle]
  )

  const exercisesWithSets = useMemo(() => {
    const ids = new Set(sets.map((s) => s.exerciseId))
    return exercises.filter((ex) => ids.has(ex.id))
  }, [sets, exercises])

  const selectedExerciseName = useMemo(() => {
    const ex = exerciseMap.get(selectedExerciseId)
    return ex ? t(ex.nameKey) : ''
  }, [selectedExerciseId, exerciseMap, t])

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div className="bg-surface px-5 pt-6 pb-4 shadow-sm">
        <h1 className="text-xl font-bold text-text-primary">{t('stats:title')}</h1>

        {/* Period selector */}
        <div className="mt-3 flex gap-2">
          {(['week', 'month', 'all'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-accent text-white'
                  : 'bg-surface-elevated text-text-muted hover:bg-surface-elevated'
              }`}
            >
              {t(`stats:period.${p}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-5 pt-4">
        {/* Phase D — Totem Inventory (full history, time-window-agnostic). */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm" data-testid="stats-totem-section">
          <TotemInventory model={totemModel} />
        </section>

        {/* Volume Chart */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <ChartThemeProvider>
            <VolumeChart data={volumeData} muscleGroups={muscleGroups} />
          </ChartThemeProvider>
        </section>

        {/* Progression Chart */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-text-primary mb-2">{t('stats:progression')}</h3>
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="w-full mb-3 rounded-lg border border-border-subtle px-3 py-2 text-sm"
          >
            <option value="">{t('stats:select_exercise')}</option>
            {exercisesWithSets.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {t(ex.nameKey)}
              </option>
            ))}
          </select>
          {selectedExerciseId ? (
            <ChartThemeProvider>
              <ProgressionChart data={progressionData} exerciseName={selectedExerciseName} />
            </ChartThemeProvider>
          ) : (
            <p className="text-sm text-text-muted/70 text-center py-8">
              {t('stats:select_exercise')}
            </p>
          )}
        </section>

        {/* Adherence Chart */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <ChartThemeProvider>
            <AdherenceChart data={adherenceData} />
          </ChartThemeProvider>
        </section>

        {/* PR Tracker Table */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-3">
            <Trophy size={16} className="text-amber-500" />
            {t('stats:pr_tracker')}
          </h3>

          {prRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs text-text-muted">
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
                      <tr key={pr.exerciseId} className="border-b border-border-subtle">
                        <td className="py-2 font-medium text-text-primary">{name}</td>
                        <td className="py-2 text-right text-text-muted">
                          {pr.bestWeight > 0 ? `${pr.bestWeight}kg` : '—'}
                        </td>
                        <td className="py-2 text-right text-text-muted">{pr.bestReps}</td>
                        <td className="py-2 text-right text-text-muted">
                          {pr.bestVolume > 0 ? `${pr.bestVolume}kg` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-text-muted/70 text-center py-4">{t('stats:no_data')}</p>
          )}
        </section>

        {/* Export / Import */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
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
