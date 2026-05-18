import type { Mesocycle } from '@/types/planning'
import { WeekView } from '@/components/planning/WeekView'

interface Props {
  mesocycle: Mesocycle
  currentWeek: number
  completedTemplateIds?: Set<string>
}

export const MonthView = ({ mesocycle, currentWeek, completedTemplateIds }: Props) => {
  const totalWeeks = mesocycle.durationWeeks
  const allWeeks = Array.from({ length: totalWeeks }, (_, i) => i + 1)

  return (
    <div className="space-y-4">
      {allWeeks.map((weekNum) => (
        <div
          key={weekNum}
          className={`rounded-xl border p-4 ${
            weekNum === currentWeek
              ? 'border-accent/40 bg-accent/10/50'
              : 'border-border-subtle bg-surface'
          }`}
        >
          <WeekView
            mesocycle={mesocycle}
            weekNumber={weekNum}
            completedTemplateIds={completedTemplateIds}
          />
        </div>
      ))}
    </div>
  )
}
