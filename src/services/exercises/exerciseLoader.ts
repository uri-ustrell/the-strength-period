import { EXERCISE_CATALOG_URL, parseExerciseCatalog } from '@/services/exercises/exerciseCatalog'
import type { Exercise } from '@/types/exercise'

export async function loadExercises(): Promise<Exercise[]> {
  const response = await fetch(EXERCISE_CATALOG_URL)
  if (!response.ok) {
    throw new Error(`Failed to load exercises: ${response.status} ${response.statusText}`)
  }
  const payload: unknown = await response.json()
  return parseExerciseCatalog(payload)
}
