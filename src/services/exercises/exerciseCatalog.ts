import type { Exercise } from '@/types/exercise'

export const EXERCISE_CATALOG_URL = '/exercises/exercises.json'

export function parseExerciseCatalog(payload: unknown): Exercise[] {
  if (!Array.isArray(payload)) {
    throw new Error('Invalid exercise catalog payload.')
  }

  return payload as Exercise[]
}
