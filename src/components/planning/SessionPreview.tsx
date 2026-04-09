import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Target, ChevronRight, ChevronDown, Dumbbell } from 'lucide-react'

import type { SessionTemplate } from '@/types/planning'
import { useExerciseStore } from '@/stores/exerciseStore'

interface Props {
  session: SessionTemplate
  compact?: boolean
}

const DAY_KEYS = ['', '1', '2', '3', '4', '5', '6', '7'] as const

const formatReps = (reps: number | [number, number]): string =>
  Array.isArray(reps) ? `${reps[0]}-${reps[1]}` : String(reps)

export const SessionPreview = ({ session, compact = false }: Props) => {
  const { t } = useTranslation(['planning', 'common', 'muscles', 'exercises'])
  const [isExpanded, setExpanded] = useState(false)
  const exercises = useExerciseStore((s) => s.exercises)

  const exercisesByMuscle = useMemo(() => {
    if (!session.exerciseAssignments?.length || !exercises.length) return {}
    const map: Record<string, { id: string; name: string }[]> = {}
    for (const assignment of session.exerciseAssignments) {
      const ex = exercises.find((e) => e.id === assignment.exerciseId)
      if (!ex) continue
      const key = assignment.muscleGroup
      if (!map[key]) map[key] = []
      map[key].push({ id: ex.id, name: ex.nameKey })
    }
    return map
  }, [session.exerciseAssignments, exercises])

  const totalSets = session.muscleGroupTargets.reduce((sum, mg) => sum + mg.loadTarget.sets, 0)

  if (compact) {
    return (
      <div className="rounded-lg bg-gray-50 overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-left"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown size={14} className="text-gray-400 shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
            )}
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
          <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0 ml-2">
            <span>{totalSets}s</span>
            <span>{session.durationMinutes}min</span>
          </div>
        </button>

        {isExpanded && (
          <div className="px-3 pb-2 space-y-1">
            {session.muscleGroupTargets.map((mg) => (
              <div key={mg.muscleGroup}>
                <div className="flex items-center justify-between rounded bg-white border border-gray-100 px-2.5 py-1.5">
                  <span className="text-xs font-medium text-indigo-700">
                    {t(`muscles:${mg.muscleGroup}`)}
                  </span>
                  <div className="flex gap-2.5 text-[10px] text-gray-500">
                    <span>
                      {mg.loadTarget.sets}×{formatReps(mg.loadTarget.reps)}
                    </span>
                    {mg.loadTarget.rpe != null && <span>RPE {mg.loadTarget.rpe}</span>}
                    {mg.loadTarget.weightKg != null && <span>{mg.loadTarget.weightKg}kg</span>}
                    <span>
                      {mg.loadTarget.restSeconds}s {t('common:session.rest').toLowerCase()}
                    </span>
                  </div>
                </div>
                {exercisesByMuscle[mg.muscleGroup]?.map((ex) => (
                  <div key={ex.id} className="flex items-center gap-1.5 pl-4 py-0.5">
                    <Dumbbell size={10} className="text-gray-300 shrink-0" />
                    <span className="text-[10px] text-gray-400">
                      {t(ex.name, { ns: 'exercises', defaultValue: ex.id })}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
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
            {t(`muscles:${mg.muscleGroup}`)} ({mg.loadTarget.sets}×{formatReps(mg.loadTarget.reps)})
          </span>
        ))}
      </div>
    </div>
  )
}
