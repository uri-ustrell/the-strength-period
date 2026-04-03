import { useTranslation } from 'react-i18next'

import type { Mesocycle, SessionTemplate } from '@/types/planning'
import { SessionPreview } from '@/components/planning/SessionPreview'

interface Props {
  mesocycle: Mesocycle
  weekNumber: number
  completedTemplateIds?: Set<string>
}

const DAY_KEYS = ['', '1', '2', '3', '4', '5', '6', '7'] as const

export const WeekView = ({ mesocycle, weekNumber, completedTemplateIds }: Props) => {
  const { t } = useTranslation('planning')

  const weekSessions = mesocycle.sessions.filter(
    (s) => s.weekNumber === weekNumber,
  )

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
          const isCompleted = session && (session.completed || completedTemplateIds?.has(session.id))
          const isSkipped = session?.skipped

          let dotColor = 'bg-gray-200'
          if (session && isCompleted) dotColor = 'bg-green-500'
          else if (session && isSkipped) dotColor = 'bg-gray-400'
          else if (session) dotColor = 'bg-indigo-500'

          return (
            <div key={day} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-gray-400">
                {t(`day_short.${DAY_KEYS[day]}`)}
              </span>
              <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
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
        <p className="text-xs text-gray-400 text-center py-2">
          {t('no_sessions_week')}
        </p>
      )}
    </div>
  )
}
