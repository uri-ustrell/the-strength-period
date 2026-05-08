import { useTranslation } from 'react-i18next'
import { SessionPreview } from '@/components/planning/SessionPreview'
import { usePlanningStore } from '@/stores/planningStore'
import type { Mesocycle, SessionTemplate } from '@/types/planning'

interface Props {
  mesocycle: Mesocycle
  weekNumber: number
  completedTemplateIds?: Set<string>
}

const DAY_KEYS = ['', '1', '2', '3', '4', '5', '6', '7'] as const

export const WeekView = ({ mesocycle, weekNumber, completedTemplateIds }: Props) => {
  const { t } = useTranslation('planning')
  const activeMesocycle = usePlanningStore((s) => s.activeMesocycle)
  const markRestDay = usePlanningStore((s) => s.markRestDay)
  const unmarkRestDay = usePlanningStore((s) => s.unmarkRestDay)

  // Rest-day capture only operates on the active mesocycle (Phase E4f).
  const isActive = activeMesocycle?.id === mesocycle.id

  const weekSessions = mesocycle.sessions.filter((s) => s.weekNumber === weekNumber)

  const sessionsByDay = new Map<number, SessionTemplate>()
  for (const s of weekSessions) {
    sessionsByDay.set(s.dayOfWeek, s)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">
        {t('week')} {weekNumber}
      </h3>

      {/* 7-day strip */}
      <div className="flex gap-1">
        {([1, 2, 3, 4, 5, 6, 7] as const).map((day) => {
          const session = sessionsByDay.get(day)
          const isRestDay = session?.isPlannedRestDay === true
          const isCompleted =
            session && (session.completed || completedTemplateIds?.has(session.id))
          const isSkipped = session?.skipped

          let dotColor = 'bg-gray-200'
          if (session && isRestDay) dotColor = 'bg-slate-300'
          else if (session && isCompleted) dotColor = 'bg-green-500'
          else if (session && isSkipped) dotColor = 'bg-gray-400'
          else if (session) dotColor = 'bg-indigo-500'

          const dayShort = t(`day_short.${DAY_KEYS[day]}`)

          return (
            <div key={day} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-gray-400">{dayShort}</span>
              {session && isRestDay && isActive ? (
                <button
                  type="button"
                  onClick={() => {
                    void unmarkRestDay(session.id)
                  }}
                  aria-label={t('rest_day.unmark_button')}
                  aria-pressed="true"
                  className="h-2.5 w-2.5 rounded-full bg-slate-300 transition hover:bg-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1"
                />
              ) : !session && isActive ? (
                <button
                  type="button"
                  onClick={() => {
                    void markRestDay(weekNumber, day)
                  }}
                  aria-label={t('rest_day.mark_button')}
                  aria-pressed="false"
                  className="flex h-2.5 w-2.5 items-center justify-center rounded-full text-[8px] leading-none text-gray-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1"
                >
                  <span aria-hidden="true">+</span>
                </button>
              ) : (
                <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Session details */}
      {weekSessions.length > 0 ? (
        <div className="space-y-2">
          {weekSessions
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((session) => (
              <SessionPreview key={session.id} session={session} compact />
            ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-2">{t('no_sessions_week')}</p>
      )}
    </div>
  )
}
