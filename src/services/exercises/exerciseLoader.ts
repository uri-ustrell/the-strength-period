import type { Exercise } from '@/types/exercise'

export async function loadExercises(): Promise<Exercise[]> {
  const response = await fetch('/exercises/exercises.json')
  if (!response.ok) {
    throw new Error(`Failed to load exercises: ${response.status} ${response.statusText}`)
  }
  const exercises: Exercise[] = await response.json()
  return exercises
}
