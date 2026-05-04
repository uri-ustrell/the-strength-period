import { useCallback, useEffect } from 'react'

import { useExerciseStore } from '@/stores/exerciseStore'

export function useExercises() {
  const { exercises, isLoading, error, fetchExercises } = useExerciseStore()

  useEffect(() => {
    if (exercises.length === 0 && !isLoading && !error) {
      fetchExercises()
    }
  }, [exercises.length, isLoading, error, fetchExercises])

  // Allow consumers to manually retry after a failed initial load. Without this
  // a network blip on first paint left the catalog empty until full page reload.
  const retry = useCallback(() => {
    fetchExercises()
  }, [fetchExercises])

  return { exercises, isLoading, error, retry }
}
