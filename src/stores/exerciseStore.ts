import { create } from 'zustand'

import type { Exercise } from '@/types/exercise'
import { loadExercises } from '@/services/exercises/exerciseLoader'

interface ExerciseStore {
  exercises: Exercise[]
  isLoading: boolean
  error: string | null

  fetchExercises: () => Promise<void>
  reset: () => void
}

export const useExerciseStore = create<ExerciseStore>((set) => ({
  exercises: [],
  isLoading: false,
  error: null,

  fetchExercises: async () => {
    set({ isLoading: true, error: null })
    try {
      const exercises = await loadExercises()
      set({ exercises, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  reset: () => set({ exercises: [], isLoading: false, error: null }),
}))
