import { CalendarPlus, ChevronDown, ChevronUp, Dumbbell, Flame, Play } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DashboardMap } from '@/components/dashboard/DashboardMap'
import { useExercises } from '@/hooks/useExercises'
import { buildDashboardMap } from '@/services/dashboard/buildDashboardMap'
import { listSessionsByDateRange, listSetsByDateRange } from '@/services/db/sessionRepository'
import { generateSession } from '@/services/exercises/sessionGenerator'
import { usePlanningStore } from '@/stores/planningStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useUserStore } from '@/stores/userStore'
import type { MuscleGroup } from '@/types/exercise'
import type { MuscleGroupTarget, SessionTemplate } from '@/types/planning'
import type { ExecutedSession } from '@/types/session'
import {
  calculateStreak,
  getSessionDate,
  getTodayDow,
  getWeekStart,
  toDateStr,
} from '@/utils/dateHelpers'

const MAIN_MUSCLE_GROUPS: MuscleGroup[] = [
  'quadriceps',
  'isquiotibials',
  'glutis',
  'bessons',
  'pectoral',
  'dorsal',
  'deltoides',
  'biceps',
  'triceps',
  'abdominal',
  'lumbar',
]

export const Dashboard = () => {
  const { t, i18n } = useTranslation(['common', 'planning', 'muscles'])
  const navigate = useNavigate()
  const { exercises } = useExercises()

  const loadActive = usePlanningStore((s) => s.loadActive)
  const activeMesocycle = usePlanningStore((s) => s.activeMesocycle)
  const loadUserConfig = useUserStore((s) => s.loadUserConfig)
  const equipment = useUserStore((s) => s.equipment)
  const minutesPerSession = useUserStore((s) => s.minutesPerSession)
  const setPreviewSession = useSessionStore((s) => s.setPreviewSession)
  const previewSessionTemplateId = useSessionStore((s) => s.generatedSession?.templateId)

  const [recentSessions, setRecentSessions] = useState<ExecutedSession[]>([])
  const [weeklySetCount, setWeeklySetCount] = useState(0)
  const [quickMinutes, setQuickMinutes] = useState(minutesPerSession)
  const [quickExpanded, setQuickExpanded] = useState(false)
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<MuscleGroup[]>([
    'quadriceps',
    'glutis',
    'dorsal',
    'abdominal',
    'deltoides',
    'pectoral',
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
    // Refresh recent sessions / weekly set count whenever the active mesocycle changes
    // (e.g. after generating a new plan or finishing a session that may have toggled it).
  }, [activeMesocycle?.id])

  const streak = useMemo(() => calculateStreak(recentSessions), [recentSessions])

  const todayDow = getTodayDow()

  const nextSession: SessionTemplate | undefined = useMemo(() => {
    if (!activeMesocycle) return undefined
    // Find first uncompleted, unskipped session (ordered by week then day)
    return activeMesocycle.sessions
      .filter((s) => !s.completed && !s.skipped)
      .sort((a, b) => a.weekNumber - b.weekNumber || a.dayOfWeek - b.dayOfWeek)[0]
  }, [activeMesocycle])

  // Phase B: weekly progression is rendered inside `<DashboardMap />` (derived
  // from the shared model). The legacy "current week" + 7-day-strip locals are gone.

  const nextSessionDate = useMemo(() => {
    if (!nextSession || !activeMesocycle) return undefined
    return getSessionDate(activeMesocycle.startDate, nextSession.weekNumber, nextSession.dayOfWeek)
  }, [nextSession, activeMesocycle])

  const isNextSessionToday = useMemo(() => {
    if (!nextSessionDate) return false
    return toDateStr(nextSessionDate) === toDateStr(new Date())
  }, [nextSessionDate])

  // Phase B replaced the 7-day strip; per-week details are derived inside
  // `<DashboardMap />` from the shared model.

  const handleStartSession = useCallback(() => {
    if (!nextSession || exercises.length === 0) return
    const generated = generateSession(
      nextSession,
      exercises,
      recentSessions.flatMap((s) => (s.sets ?? []).map((set) => set.exerciseId)),
      equipment
    )
    setPreviewSession(generated)
    navigate('/session')
  }, [nextSession, exercises, recentSessions, equipment, setPreviewSession, navigate])

  // Phase B: deterministic dashboard model derived from the active mesocycle.
  // Recomputed inline (cheap, pure) — no extra IDB stores per spec.
  const dashboardMapModel = useMemo(
    () => (activeMesocycle ? buildDashboardMap(activeMesocycle, previewSessionTemplateId) : null),
    [activeMesocycle, previewSessionTemplateId]
  )

  const handleSelectMapSession = useCallback(
    (sessionId: string) => {
      if (!activeMesocycle || exercises.length === 0) return
      const tmpl = activeMesocycle.sessions.find((s) => s.id === sessionId)
      if (!tmpl) return
      const generated = generateSession(
        tmpl,
        exercises,
        recentSessions.flatMap((s) => (s.sets ?? []).map((set) => set.exerciseId)),
        equipment
      )
      setPreviewSession(generated)
      navigate('/session')
    },
    [activeMesocycle, exercises, recentSessions, equipment, setPreviewSession, navigate]
  )

  const handleQuickSession = useCallback(() => {
    if (exercises.length === 0 || selectedMuscleGroups.length === 0) return
    const pct = Math.floor(100 / selectedMuscleGroups.length)
    const targets: MuscleGroupTarget[] = selectedMuscleGroups.map((mg) => ({
      muscleGroup: mg,
      percentageOfSession: pct,
      loadTarget: { sets: 3, reps: [8, 12] as [number, number], rpe: 7, restSeconds: 90 },
    }))
    const template: SessionTemplate = {
      id: 'quick',
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
    const generated = generateSession(template, exercises, [], equipment)
    setPreviewSession(generated)
    navigate('/session')
  }, [
    exercises,
    equipment,
    quickMinutes,
    todayDow,
    selectedMuscleGroups,
    setPreviewSession,
    navigate,
  ])

  const toggleMuscleGroup = useCallback((mg: MuscleGroup) => {
    setSelectedMuscleGroups((prev) =>
      prev.includes(mg) ? prev.filter((m) => m !== mg) : [...prev, mg]
    )
  }, [])

  const dateLocale = i18n.language === 'ca' ? 'ca-ES' : i18n.language === 'es' ? 'es-ES' : 'en-US'

  const dateStr = new Date().toLocaleDateString(dateLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const nextSessionDateStr = nextSessionDate
    ? nextSessionDate.toLocaleDateString(dateLocale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : ''

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div className="bg-surface px-5 pt-6 pb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">{t('dashboard.greeting')}</h1>
            <p className="text-sm text-text-muted capitalize">{dateStr}</p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-highlight/10 px-3 py-1.5">
              <Flame size={16} className="text-highlight" />
              <span className="text-sm font-semibold text-highlight">{streak}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 px-5 pt-4">
        {/* Block 1: Today / Next session */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            {nextSession && !isNextSessionToday
              ? t('dashboard.next_session')
              : t('dashboard.today')}
          </h2>

          {nextSession ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-accent/10 p-3">
                <p className="text-sm font-medium text-accent mb-2">
                  {isNextSessionToday
                    ? t('dashboard.session_today')
                    : t('dashboard.session_for_date', { date: nextSessionDateStr })}
                </p>
                <div className="flex flex-wrap gap-1">
                  {nextSession.muscleGroupTargets.map((mg) => (
                    <span
                      key={mg.muscleGroup}
                      className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent"
                    >
                      {t(`muscles:${mg.muscleGroup}`)}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-accent">
                  {nextSession.durationMinutes} {t('dashboard.minutes')} ·{' '}
                  {nextSession.muscleGroupTargets.reduce((s, mg) => s + mg.loadTarget.sets, 0)}{' '}
                  {t('common:session.sets').toLowerCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartSession}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-white font-medium hover:brightness-110 transition-colors"
              >
                <Play size={18} fill="white" />
                {t('dashboard.start_session')}
              </button>
            </div>
          ) : activeMesocycle ? (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">{t('dashboard.rest_day')}</p>

              <button
                type="button"
                onClick={() => setQuickExpanded(!quickExpanded)}
                className="flex w-full items-center justify-between rounded-lg bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent"
              >
                <span className="flex items-center gap-1.5">
                  <Dumbbell size={16} />
                  {t('dashboard.quick_session')}
                </span>
                {quickExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {quickExpanded && (
                <div className="space-y-3 rounded-xl border border-border-subtle bg-surface p-3">
                  {/* Duration */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">{t('dashboard.minutes')}:</span>
                    <div className="flex gap-1">
                      {[30, 45, 60, 75].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setQuickMinutes(m)}
                          className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                            quickMinutes === m
                              ? 'bg-accent text-white'
                              : 'bg-surface-elevated text-text-muted hover:bg-surface-elevated'
                          }`}
                        >
                          {m}′
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Muscle groups */}
                  <div>
                    <span className="text-xs text-text-muted mb-1.5 block">
                      {t('planning:muscleDistribution')}:
                    </span>
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
                                ? 'bg-accent text-white'
                                : 'bg-surface-elevated text-text-muted hover:bg-surface-elevated'
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-white font-medium hover:brightness-110 transition-colors disabled:opacity-50"
                  >
                    <Play size={16} fill="white" />
                    {t('dashboard.start_session')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">{t('dashboard.no_plan')}</p>
              <button
                type="button"
                onClick={() => navigate('/planning')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-white font-medium hover:brightness-110 transition-colors"
              >
                <CalendarPlus size={18} />
                {t('dashboard.create_plan')}
              </button>
            </div>
          )}

          {/* Weekly load bar */}
          <div className="mt-4 pt-3 border-t border-border-subtle">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>{t('dashboard.weekly_load')}</span>
              <span>{t('dashboard.sets_this_week', { count: weeklySetCount })}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
              <div
                className="h-full rounded-full bg-accent/100 transition-all"
                style={{ width: `${Math.min(100, (weeklySetCount / 80) * 100)}%` }}
              />
            </div>
          </div>
        </section>

        {/* Block 2: Your Plan */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            {t('dashboard.your_plan')}
          </h2>

          {activeMesocycle && dashboardMapModel ? (
            <>
              {/* Phase B: variant-aware world map / calendar derived from the active mesocycle. */}
              <div className="mb-3">
                <DashboardMap model={dashboardMapModel} onSelectSession={handleSelectMapSession} />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/planning')}
                  className="flex-1 rounded-lg border border-border-subtle py-2 text-sm font-medium text-text-primary hover:bg-surface-elevated transition-colors"
                >
                  {t('dashboard.view_plan')}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-text-muted/70 mb-3">{t('dashboard.no_plan')}</p>
              <button
                type="button"
                onClick={() => navigate('/planning')}
                className="rounded-lg bg-accent/20 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/30 transition-colors"
              >
                {t('dashboard.create_plan')}
              </button>
            </div>
          )}
        </section>

        {/* Block 3: Last 4 Weeks Summary */}
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            {t('dashboard.last_weeks')}
          </h2>

          {recentSessions.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-accent">
                  {recentSessions.filter((s) => !s.skipped && s.completedAt).length}
                </p>
                <p className="text-xs text-text-muted">{t('common:session.exercises_done')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{weeklySetCount}</p>
                <p className="text-xs text-text-muted">{t('dashboard.volume')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-highlight">
                  {streak > 0 ? `${streak}d` : '—'}
                </p>
                <p className="text-xs text-text-muted">{t('dashboard.adherence')}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted/70 text-center py-4">{t('dashboard.no_plan')}</p>
          )}
        </section>
      </div>
    </div>
  )
}
