import type { Exercise } from '@/types/exercise'

export async function loadExercises(): Promise<Exercise[]> {
  const response = await fetch('/exercises/exercises.json')
  const exercises: Exercise[] = await response.json()
  return exercises
}
