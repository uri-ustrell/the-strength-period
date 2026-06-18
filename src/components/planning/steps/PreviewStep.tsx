import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ProgressionSparkline } from '@/components/planning/ProgressionSparkline'
import { SessionPreview } from '@/components/planning/SessionPreview'
import type { Exercise } from '@/types/exercise'
import type { Mesocycle, WeekProgressionRate } from '@/types/planning'

interface Props {
  generatedPreview: Mesocycle | null
  error: string | null
  storeMissingIds: string[]
  weeklyProgressionRates: WeekProgressionRate[]
  exercises: Exercise[]
  onRetry: () => void
  onDiscard: () => void
  onModify: () => void
  onSave: () => void
}

export const PreviewStep = ({
  generatedPreview,
  error,
  storeMissingIds,
  weeklyProgressionRates,
  exercises,
  onRetry,
  onDiscard,
  onModify,
  onSave,
}: Props) => {
  const { t, i18n } = useTranslation(['planning', 'onboarding'])

  if (error) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-warning">{t('planning:errorGenerating')}</p>
        <p className="text-sm text-text-muted">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-surface-elevated px-6 py-2 text-sm font-medium text-text-primary hover:bg-surface-elevated"
        >
          {t('planning:retry')}
        </button>
      </div>
    )
  }

  if (!generatedPreview) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-text-muted">{t('planning:errorGenerating')}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-surface-elevated px-6 py-2 text-sm font-medium text-text-primary hover:bg-surface-elevated"
        >
          {t('planning:back')}
        </button>
      </div>
    )
  }

  const weekMap = new Map<number, typeof generatedPreview.sessions>()
  for (const session of generatedPreview.sessions) {
    const w = session.weekNumber
    let list = weekMap.get(w)
    if (!list) {
      list = []
      weekMap.set(w, list)
    }
    list.push(session)
  }

  // Equipment chips: collect unique equipment used by all assigned exercises
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]))
  const equipmentSet = new Set<string>()
  for (const session of generatedPreview.sessions) {
    for (const a of session.exerciseAssignments ?? []) {
      const ex = exerciseMap.get(a.exerciseId)
      if (!ex) continue
      for (const eq of ex.equipment) equipmentSet.add(eq)
    }
  }
  const requiredEquipment = Array.from(equipmentSet).sort()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">{t('planning:preview')}</h2>
        <span className="text-sm text-text-muted">
          {i18n?.exists(generatedPreview.name) ? t(generatedPreview.name) : generatedPreview.name} —{' '}
          {generatedPreview.durationWeeks} {t('planning:weeks')}
        </span>
      </div>

      {error === 'PRESET_EXERCISES_MISSING' && storeMissingIds.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm font-medium text-red-800">
            {t('planning:error_missing_exercises', { count: storeMissingIds.length })}
          </p>
          <ul className="mt-2 list-disc pl-5 text-xs text-warning">
            {storeMissingIds.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </div>
      )}

      {weeklyProgressionRates.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
            {t('planning:weeklyProgression')}
          </p>
          <ProgressionSparkline rates={weeklyProgressionRates} />
        </div>
      )}

      {requiredEquipment.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
            {t('planning:preview_required_equipment')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {requiredEquipment.map((eq) => (
              <span
                key={eq}
                className="rounded-full bg-surface-elevated px-2.5 py-1 text-xs text-text-primary"
              >
                {t(`onboarding:equipment.${eq}`)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 max-h-[50vh] overflow-y-auto">
        {Array.from(weekMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([weekNum, sessions]) => (
            <div key={weekNum} className="rounded-xl border border-border-subtle bg-surface p-4">
              <h3 className="font-medium text-text-primary mb-2">
                {t('planning:week')} {weekNum}
              </h3>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <SessionPreview key={session.id} session={session} compact />
                ))}
              </div>
            </div>
          ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onDiscard}
          className="flex-1 rounded-xl border border-border-strong py-3 text-sm font-medium text-text-primary hover:bg-surface-elevated transition-colors"
        >
          {t('planning:discard')}
        </button>
        <button
          type="button"
          onClick={onModify}
          className="flex-1 rounded-xl border border-indigo-200 py-3 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
        >
          {t('planning:modify_plan')}
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-accent py-3 text-sm font-medium text-white hover:brightness-110 transition-colors"
        >
          <Check size={16} />
          {t('planning:start_plan')}
        </button>
      </div>
    </div>
  )
}
