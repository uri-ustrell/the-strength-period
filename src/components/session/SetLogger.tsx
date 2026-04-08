import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SelectedExercise } from '@/services/exercises/sessionGenerator'

interface Props {
  selectedExercise: SelectedExercise
  currentSet: number
  onComplete: (repsActual: number, weightActual?: number) => void
  onSkipSet: () => void
}

export const SetLogger = ({ selectedExercise, currentSet, onComplete, onSkipSet }: Props) => {
  const { t } = useTranslation('common')
  const { reps, weightKg } = selectedExercise

  const defaultReps = Array.isArray(reps) ? reps[1] : reps

  const [repsActual, setRepsActual] = useState(defaultReps)
  const [weightActual, setWeightActual] = useState(weightKg ?? 0)

  const handleComplete = () => {
    onComplete(repsActual, weightKg !== undefined ? weightActual : undefined)
    setRepsActual(defaultReps)
    setWeightActual(weightKg ?? 0)
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {t('session.set_of', { current: currentSet + 1, total: selectedExercise.sets })}
      </h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="reps-input" className="mb-1 block text-sm font-medium text-gray-700">
            {t('session.reps_actual')}
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRepsActual((v) => Math.max(0, v - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold text-gray-700 active:bg-gray-200"
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
              className="h-12 w-20 rounded-xl border border-gray-300 text-center text-xl font-bold text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setRepsActual((v) => v + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold text-gray-700 active:bg-gray-200"
            >
              +
            </button>
          </div>
        </div>

        {weightKg !== undefined && (
          <div>
            <label htmlFor="weight-input" className="mb-1 block text-sm font-medium text-gray-700">
              {t('session.weight_actual')}
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setWeightActual((v) => Math.max(0, v - 2.5))}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold text-gray-700 active:bg-gray-200"
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
                className="h-12 w-20 rounded-xl border border-gray-300 text-center text-xl font-bold text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setWeightActual((v) => v + 2.5)}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold text-gray-700 active:bg-gray-200"
              >
                +
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleComplete}
          className="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-semibold text-white active:bg-indigo-700"
        >
          {t('session.complete_set')}
        </button>

        <button
          type="button"
          onClick={onSkipSet}
          className="w-full py-2 text-sm text-gray-500 active:text-gray-700"
        >
          {t('session.skip_set')}
        </button>
      </div>
    </div>
  )
}
