import { useTranslation } from 'react-i18next'
import { Clock, Target } from 'lucide-react'

import type { SessionTemplate } from '@/types/planning'

interface Props {
  session: SessionTemplate
  compact?: boolean
}

const DAY_KEYS = ['', '1', '2', '3', '4', '5', '6', '7'] as const

export const SessionPreview = ({ session, compact = false }: Props) => {
  const { t } = useTranslation(['planning', 'muscles'])

  const totalSets = session.muscleGroupTargets.reduce(
    (sum, mg) => sum + mg.loadTarget.sets,
    0,
  )

  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">
            {t(`planning:day_short.${DAY_KEYS[session.dayOfWeek]}`)}
          </span>
          <div className="flex flex-wrap gap-1">
            {session.muscleGroupTargets.map((mg) => (
              <span
                key={mg.muscleGroup}
                className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700"
              >
                {t(`muscles:${mg.muscleGroup}`)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{totalSets}s</span>
          <span>{session.durationMinutes}min</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">
          {t(`planning:day_short.${DAY_KEYS[session.dayOfWeek]}`)}
        </span>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Target size={12} />
            {totalSets} {t('planning:sessions').toLowerCase()}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {session.durationMinutes}min
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {session.muscleGroupTargets.map((mg) => (
          <span
            key={mg.muscleGroup}
            className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
          >
            {t(`muscles:${mg.muscleGroup}`)} ({mg.loadTarget.sets}×
            {Array.isArray(mg.loadTarget.reps)
              ? `${mg.loadTarget.reps[0]}-${mg.loadTarget.reps[1]}`
              : mg.loadTarget.reps}
            )
          </span>
        ))}
      </div>
    </div>
  )
}
