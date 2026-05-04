import type { Exercise } from '@/types/exercise'

export const EXERCISE_CATALOG_URL = `${import.meta.env.BASE_URL}exercises/exercises.json`

function isValidExercise(value: unknown): value is Exercise {
  if (typeof value !== 'object' || value === null) return false
  const e = value as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.nameKey === 'string' &&
    Array.isArray(e.primaryMuscles) &&
    Array.isArray(e.secondaryMuscles) &&
    Array.isArray(e.equipment) &&
    typeof e.progressionMetric === 'string' &&
    typeof e.estimatedSeriesDurationSeconds === 'number'
  )
}

export function parseExerciseCatalog(payload: unknown): Exercise[] {
  if (!Array.isArray(payload)) {
    throw new Error('Invalid exercise catalog payload.')
  }

  const valid: Exercise[] = []
  for (const item of payload) {
    if (isValidExercise(item)) {
      valid.push(item)
    } else if (import.meta.env.DEV) {
      console.warn('[exerciseCatalog] Skipping malformed exercise entry', item)
    }
  }
  return valid
}
