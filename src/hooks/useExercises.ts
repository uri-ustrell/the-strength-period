import { useEffect } from 'react'

import { useExerciseStore } from '@/stores/exerciseStore'

export function useExercises() {
  const { exercises, isLoading, error, fetchExercises } = useExerciseStore()

  useEffect(() => {
    if (exercises.length === 0 && !isLoading && !error) {
      fetchExercises()
    }
  }, [exercises.length, isLoading, error, fetchExercises])

  return { exercises, isLoading, error }
}
