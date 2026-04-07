import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp } from 'lucide-react'

import type { SelectedExercise } from '@/services/exercises/sessionGenerator'
import type { WeightEquipment } from '@/types/user'
import { useUserStore } from '@/stores/userStore'
import { getAdjacentWeights } from '@/services/planning/weightSnapping'

const WEIGHT_EQUIPMENT: WeightEquipment[] = ['manueles', 'barra']

interface Props {
  selectedExercise: SelectedExercise
  exerciseIndex: number
  totalExercises: number
  currentSet: number
  onWeightChange?: (newWeight: number) => void
}

export const ActiveExercise = ({ selectedExercise, exerciseIndex, totalExercises, currentSet, onWeightChange }: Props) => {
  const { t } = useTranslation(['common', 'exercises', 'muscles'])
  const { exercise, sets, reps, weightKg, rpe, restSeconds } = selectedExercise
  const availableWeights = useUserStore((s) => s.availableWeights)

  const repsDisplay = Array.isArray(reps) ? `${reps[0]}-${reps[1]}` : String(reps)
  const representativeImage = exercise.images.find((img) => img.isRepresentative) ?? exercise.images[0]

  // Resolve which equipment weights to use for this exercise
  const exerciseWeightList: number[] = (() => {
    for (const eq of exercise.equipment) {
      if (WEIGHT_EQUIPMENT.includes(eq as WeightEquipment)) {
        const weights = availableWeights[eq as WeightEquipment]
        if (weights && weights.length > 0) return weights
      }
    }
    return []
  })()

  const adjacent = weightKg !== undefined && exerciseWeightList.length > 0
    ? getAdjacentWeights(weightKg, exerciseWeightList)
    : null

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-indigo-600">
          {t('common:session.exercise_of', { current: exerciseIndex + 1, total: totalExercises })}
        </span>
        <span className="text-sm text-gray-500">
          {t('common:session.set_of', { current: Math.min(currentSet + 1, sets), total: sets })}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        {representativeImage && (
          <img
            src={representativeImage.url}
            alt={representativeImage.alt}
            className="h-14 w-14 rounded-xl object-cover bg-indigo-50 shrink-0"
          />
        )}
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {t(exercise.nameKey, { defaultValue: exercise.id })}
          </h2>
          <div className="flex flex-wrap gap-1 mt-1">
            {exercise.primaryMuscles.map((muscle) => (
              <span key={muscle} className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                {t(`muscles:${muscle}`)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500">{t('common:session.sets')}</p>
          <p className="text-lg font-bold text-gray-900">{sets}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500">{t('common:session.reps')}</p>
          <p className="text-lg font-bold text-gray-900">{repsDisplay}</p>
        </div>
        {weightKg !== undefined && (
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-xs text-gray-500">{t('common:session.weight_kg')}</p>
            <div className="flex items-center justify-center gap-1">
              {adjacent?.lower != null && onWeightChange && (
                <button
                  type="button"
                  onClick={() => onWeightChange(adjacent.lower!)}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                  aria-label={t('common:session.weight_lower')}
                >
                  <ChevronDown size={16} />
                </button>
              )}
              <p className="text-lg font-bold text-gray-900">{weightKg}</p>
              {adjacent?.higher != null && onWeightChange && (
                <button
                  type="button"
                  onClick={() => onWeightChange(adjacent.higher!)}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                  aria-label={t('common:session.weight_higher')}
                >
                  <ChevronUp size={16} />
                </button>
              )}
            </div>
          </div>
        )}
        {rpe !== undefined && (
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-xs text-gray-500">{t('common:session.rpe')}</p>
            <p className="text-lg font-bold text-gray-900">{rpe}</p>
          </div>
        )}
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500">{t('common:session.rest_seconds')}</p>
          <p className="text-lg font-bold text-gray-900">{restSeconds}</p>
        </div>
      </div>

      {(() => {
        const translated = t(`exercises:instructions.${exercise.id}`, { returnObjects: true, defaultValue: '' })
        const instructions = Array.isArray(translated) && translated.length > 0 ? translated : exercise.instructions
        if (instructions.length === 0) return null
        return (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-600 group-open:mb-2">
              {t('common:session.instructions')}
            </summary>
            <ol className="list-inside list-decimal space-y-1 text-sm text-gray-600">
              {instructions.map((instruction: string, i: number) => (
                <li key={i}>{instruction}</li>
              ))}
            </ol>
            {exercise.images.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                {exercise.images.map((img, i) => (
                  <img
                    key={i}
                    src={img.url}
                    alt={img.alt}
                    className="h-24 w-24 rounded-lg object-cover bg-indigo-50 shrink-0"
                  />
                ))}
              </div>
            )}
          </details>
        )
      })()}
    </div>
  )
}
