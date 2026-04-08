import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Flame, Play, CalendarPlus, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react'

import type { ExecutedSession } from '@/types/session'
import type { SessionTemplate, MuscleGroupTarget } from '@/types/planning'
import type { MuscleGroup } from '@/types/exercise'
import { usePlanningStore } from '@/stores/planningStore'
import { useUserStore } from '@/stores/userStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useExercises } from '@/hooks/useExercises'
import { listSessionsByDateRange, listSetsByDateRange } from '@/services/db/sessionRepository'
import { generateSession } from '@/services/exercises/sessionGenerator'

const MAIN_MUSCLE_GROUPS: MuscleGroup[] = [
  'quadriceps', 'isquiotibials', 'glutis', 'bessons',
  'pectoral', 'dorsal', 'deltoides',
  'biceps', 'triceps',
  'abdominal', 'lumbar',
]

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getTodayDow(): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const js = new Date().getDay()
  return (js === 0 ? 7 : js) as 1 | 2 | 3 | 4 | 5 | 6 | 7
}

function getCurrentWeek(startDate: string): number {
  const start = new Date(startDate)
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  return Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1)
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay()
  const diff = dow === 0 ? 6 : dow - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function calculateStreak(sessions: ExecutedSession[]): number {
  const completedDates = new Set(
    sessions.filter((s) => !s.skipped && s.completedAt).map((s) => s.date),
  )
  let streak = 0
  const today = new Date()
  const todayStr = toDateStr(today)
  const startOffset = completedDates.has(todayStr) ? 0 : 1

  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (completedDates.has(toDateStr(d))) {
      streak++
    } else {
      break
    }
  }
  return streak
}

const DAY_KEYS = ['', '1', '2', '3', '4', '5', '6', '7'] as const

export const Dashboard = () => {
  const { t, i18n } = useTranslation(['common', 'planning', 'muscles'])
  const navigate = useNavigate()
  const { exercises } = useExercises()

  const loadActive = usePlanningStore((s) => s.loadActive)
  const activeMesocycle = usePlanningStore((s) => s.activeMesocycle)
  const loadUserConfig = useUserStore((s) => s.loadUserConfig)
  const equipment = useUserStore((s) => s.equipment)
  const activeRestrictions = useUserStore((s) => s.activeRestrictions)
  const minutesPerSession = useUserStore((s) => s.minutesPerSession)
  const setPreviewSession = useSessionStore((s) => s.setPreviewSession)

  const [recentSessions, setRecentSessions] = useState<ExecutedSession[]>([])
  const [weeklySetCount, setWeeklySetCount] = useState(0)
  const [quickMinutes, setQuickMinutes] = useState(minutesPerSession)
  const [quickExpanded, setQuickExpanded] = useState(false)
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<MuscleGroup[]>([
    'quadriceps', 'glutis', 'dorsal', 'abdominal', 'deltoides', 'pectoral',
  ])

  useEffect(() => {
    loadActive()
    loadUserConfig()
  }, [loadActive, loadUserConfig])

  useEffect(() => {
    setQuickMinutes(minutesPerSession)
  }, [minutesPerSession])

  useEffect(() => {
    const fetchRecent = async () => {
      const now = new Date()
      const past = new Date(now)
      past.setDate(past.getDate() - 90)
      const sessions = await listSessionsByDateRange(toDateStr(past), toDateStr(now))
      setRecentSessions(sessions)

      const weekStart = getWeekStart(now)
      const sets = await listSetsByDateRange(toDateStr(weekStart), toDateStr(now))
      setWeeklySetCount(sets.length)
    }
    fetchRecent()
  }, [])

  const streak = useMemo(() => calculateStreak(recentSessions), [recentSessions])

  const todayDow = getTodayDow()
  const currentWeek = activeMesocycle ? getCurrentWeek(activeMesocycle.startDate) : 0

  const nextSession: SessionTemplate | undefined = useMemo(() => {
    if (!activeMesocycle) return undefined
    // Find first uncompleted, unskipped session (ordered by week then day)
    return activeMesocycle.sessions
      .filter((s) => !s.completed && !s.skipped)
      .sort((a, b) => a.weekNumber - b.weekNumber || a.dayOfWeek - b.dayOfWeek)[0]
  }, [activeMesocycle])

  const thisWeekSessions = useMemo(() => {
    if (!activeMesocycle) return []
    return activeMesocycle.sessions
      .filter((s) => s.weekNumber === currentWeek)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
  }, [activeMesocycle, currentWeek])

  const handleStartSession = useCallback(() => {
    if (!nextSession || exercises.length === 0) return
    const generated = generateSession(
      nextSession,
      exercises,
      recentSessions.flatMap((s) => s.sets.map((set) => set.exerciseId)),
      equipment,
      activeRestrictions,
    )
    setPreviewSession(generated)
    navigate('/session')
  }, [nextSession, exercises, recentSessions, equipment, activeRestrictions, setPreviewSession, navigate])

  const handleQuickSession = useCallback(() => {
    if (exercises.length === 0 || selectedMuscleGroups.length === 0) return
    const pct = Math.floor(100 / selectedMuscleGroups.length)
    const targets: MuscleGroupTarget[] = selectedMuscleGroups.map((mg) => ({
      muscleGroup: mg,
      percentageOfSession: pct,
      loadTarget: { sets: 3, reps: [8, 12] as [number, number], rpe: 7, restSeconds: 90 },
    }))
    const template: SessionTemplate = {
      id: `quick_${crypto.randomUUID()}`,
      mesocycleId: 'quick',
      weekNumber: 1,
      dayOfWeek: todayDow,
      durationMinutes: quickMinutes,
      muscleGroupTargets: targets,
      progressionType: 'linear',
      restrictions: [],
      completed: false,
      skipped: false,
    }
    const generated = generateSession(template, exercises, [], equipment, activeRestrictions)
    setPreviewSession(generated)
    navigate('/session')
  }, [exercises, equipment, activeRestrictions, quickMinutes, todayDow, selectedMuscleGroups, setPreviewSession, navigate])

  const toggleMuscleGroup = useCallback((mg: MuscleGroup) => {
    setSelectedMuscleGroups((prev) =>
      prev.includes(mg) ? prev.filter((m) => m !== mg) : [...prev, mg],
    )
  }, [])

  const dateStr = new Date().toLocaleDateString(
    i18n.language === 'ca' ? 'ca-ES' : i18n.language === 'es' ? 'es-ES' : 'en-US',
    { weekday: 'long', day: 'numeric', month: 'long' },
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('dashboard.greeting')}</h1>
            <p className="text-sm text-gray-500 capitalize">{dateStr}</p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5">
              <Flame size={16} className="text-orange-500" />
              <span className="text-sm font-semibold text-orange-600">{streak}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 px-5 pt-4">
        {/* Block 1: Today */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t('dashboard.today')}
          </h2>

          {nextSession ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-indigo-50 p-3">
                <p className="text-sm font-medium text-indigo-900 mb-2">
                  {t('dashboard.session_today')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {nextSession.muscleGroupTargets.map((mg) => (
                    <span
                      key={mg.muscleGroup}
                      className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700"
                    >
                      {t(`muscles:${mg.muscleGroup}`)}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-indigo-600">
                  {nextSession.durationMinutes} {t('dashboard.minutes')} ·{' '}
                  {nextSession.muscleGroupTargets.reduce((s, mg) => s + mg.loadTarget.sets, 0)}{' '}
                  {t('common:session.sets').toLowerCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartSession}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors"
              >
                <Play size={18} fill="white" />
                {t('dashboard.start_session')}
              </button>
            </div>
          ) : activeMesocycle ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{t('dashboard.rest_day')}</p>

              <button
                type="button"
                onClick={() => setQuickExpanded(!quickExpanded)}
                className="flex w-full items-center justify-between rounded-lg bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700"
              >
                <span className="flex items-center gap-1.5">
                  <Dumbbell size={16} />
                  {t('dashboard.quick_session')}
                </span>
                {quickExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {quickExpanded && (
                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
                  {/* Duration */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{t('dashboard.minutes')}:</span>
                    <div className="flex gap-1">
                      {[30, 45, 60, 75].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setQuickMinutes(m)}
                          className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                            quickMinutes === m
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {m}′
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Muscle groups */}
                  <div>
                    <span className="text-xs text-gray-500 mb-1.5 block">{t('planning:muscleDistribution')}:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {MAIN_MUSCLE_GROUPS.map((mg) => {
                        const selected = selectedMuscleGroups.includes(mg)
                        return (
                          <button
                            key={mg}
                            type="button"
                            onClick={() => toggleMuscleGroup(mg)}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                              selected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {t(`muscles:${mg}`)}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Start button */}
                  <button
                    type="button"
                    onClick={handleQuickSession}
                    disabled={selectedMuscleGroups.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    <Play size={16} fill="white" />
                    {t('dashboard.start_session')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{t('dashboard.no_plan')}</p>
              <button
                type="button"
                onClick={() => navigate('/planning')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors"
              >
                <CalendarPlus size={18} />
                {t('dashboard.create_plan')}
              </button>
            </div>
          )}

          {/* Weekly load bar */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{t('dashboard.weekly_load')}</span>
              <span>{t('dashboard.sets_this_week', { count: weeklySetCount })}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.min(100, (weeklySetCount / 80) * 100)}%` }}
              />
            </div>
          </div>
        </section>

        {/* Block 2: Your Plan */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t('dashboard.your_plan')}
          </h2>

          {activeMesocycle ? (
            <>
              {/* 7 day strip */}
              <div className="flex gap-1 mb-3">
                {([1, 2, 3, 4, 5, 6, 7] as const).map((day) => {
                  const session = thisWeekSessions.find((s) => s.dayOfWeek === day)
                  const isToday = day === todayDow
                  let dotColor = 'bg-gray-200'
                  if (session?.completed) dotColor = 'bg-green-500'
                  else if (session?.skipped) dotColor = 'bg-gray-400'
                  else if (session) dotColor = 'bg-indigo-500'

                  return (
                    <div
                      key={day}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 ${
                        isToday ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <span className={`text-[10px] font-medium ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {t(`planning:day_short.${DAY_KEYS[day]}`)}
                      </span>
                      <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/planning')}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t('dashboard.view_plan')}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-3">{t('dashboard.no_plan')}</p>
              <button
                type="button"
                onClick={() => navigate('/planning')}
                className="rounded-lg bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 transition-colors"
              >
                {t('dashboard.create_plan')}
              </button>
            </div>
          )}
        </section>

        {/* Block 3: Last 4 Weeks Summary */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t('dashboard.last_weeks')}
          </h2>

          {recentSessions.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-indigo-600">
                  {recentSessions.filter((s) => !s.skipped && s.completedAt).length}
                </p>
                <p className="text-xs text-gray-500">{t('common:session.exercises_done')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-teal-600">{weeklySetCount}</p>
                <p className="text-xs text-gray-500">{t('dashboard.volume')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {streak > 0 ? `${streak}d` : '—'}
                </p>
                <p className="text-xs text-gray-500">{t('dashboard.adherence')}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">{t('dashboard.no_plan')}</p>
          )}
        </section>
      </div>
    </div>
  )
}

