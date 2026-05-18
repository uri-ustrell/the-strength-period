import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SelectedExercise } from '@/services/exercises/sessionGenerator'

interface Props {
  selectedExercise: SelectedExercise
  currentSet: number
  onComplete: (repsActual: number, weightActual?: number, isWarmup?: boolean) => void
  onSkipSet: () => void
}

export const SetLogger = ({ selectedExercise, currentSet, onComplete, onSkipSet }: Props) => {
  const { t } = useTranslation('common')
  const { reps, weightKg } = selectedExercise

  const defaultReps = Array.isArray(reps) ? reps[1] : reps

  const [repsActual, setRepsActual] = useState(defaultReps)
  const [weightActual, setWeightActual] = useState(weightKg ?? 0)
  const [isWarmup, setIsWarmup] = useState(false)

  const handleComplete = () => {
    onComplete(repsActual, weightKg !== undefined ? weightActual : undefined, isWarmup)
    setRepsActual(defaultReps)
    setWeightActual(weightKg ?? 0)
    setIsWarmup(false)
  }

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
        {t('session.set_of', { current: currentSet + 1, total: selectedExercise.sets })}
      </h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="reps-input" className="mb-1 block text-sm font-medium text-text-primary">
            {t('session.reps_actual')}
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRepsActual((v) => Math.max(0, v - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated text-xl font-bold text-text-primary active:bg-surface-elevated"
            >
              −
            </button>
            <input
              id="reps-input"
              type="number"
              inputMode="numeric"
              min={0}
              value={repsActual}
              onChange={(e) => setRepsActual(Math.max(0, parseInt(e.target.value) || 0))}
              className="h-12 w-20 rounded-xl border border-border-strong text-center text-xl font-bold text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
              onClick={() => setRepsActual((v) => v + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated text-xl font-bold text-text-primary active:bg-surface-elevated"
            >
              +
            </button>
          </div>
        </div>

        {weightKg !== undefined && (
          <div>
            <label htmlFor="weight-input" className="mb-1 block text-sm font-medium text-text-primary">
              {t('session.weight_actual')}
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setWeightActual((v) => Math.max(0, v - 2.5))}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated text-xl font-bold text-text-primary active:bg-surface-elevated"
              >
                −
              </button>
              <input
                id="weight-input"
                type="number"
                inputMode="decimal"
                min={0}
                step={2.5}
                value={weightActual}
                onChange={(e) => setWeightActual(Math.max(0, parseFloat(e.target.value) || 0))}
                className="h-12 w-20 rounded-xl border border-border-strong text-center text-xl font-bold text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => setWeightActual((v) => v + 2.5)}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated text-xl font-bold text-text-primary active:bg-surface-elevated"
              >
                +
              </button>
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={isWarmup}
            onChange={(e) => setIsWarmup(e.target.checked)}
            className="h-4 w-4 rounded border-border-strong text-accent focus:ring-accent"
          />
          <span>{t('session.set_logger.warmup_toggle.label')}</span>
        </label>

        <button
          type="button"
          onClick={handleComplete}
          className="w-full rounded-xl bg-accent py-3.5 text-base font-semibold text-white active:bg-accent"
        >
          {t('session.complete_set')}
        </button>

        <button
          type="button"
          onClick={onSkipSet}
          className="w-full py-2 text-sm text-text-muted active:text-text-primary"
        >
          {t('session.skip_set')}
        </button>
      </div>
    </div>
  )
}
