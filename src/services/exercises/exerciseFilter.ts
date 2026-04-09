import type {
  Exercise,
  MuscleGroup,
  Equipment,
  ExerciseTag,
  RestrictionCondition,
} from '@/types/exercise'

export type ExerciseFilters = {
  muscleGroups?: MuscleGroup[]
  equipment?: Equipment[]
  excludeRestrictions?: RestrictionCondition[]
  tags?: ExerciseTag[]

  level?: Exercise['level'][]
  category?: Exercise['category'][]
  excludeIds?: string[]
}

export function filterExercises(exercises: Exercise[], filters: ExerciseFilters): Exercise[] {
  return exercises.filter((exercise) => {
    if (filters.muscleGroups?.length) {
      const allMuscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles]
      if (!filters.muscleGroups.some((mg) => allMuscles.includes(mg))) {
        return false
      }
    }

    if (filters.equipment?.length) {
      if (!filters.equipment.some((eq) => exercise.equipment.includes(eq))) {
        return false
      }
    }

    if (filters.excludeRestrictions?.length) {
      if (exercise.restrictions.some((r) => filters.excludeRestrictions!.includes(r.condition))) {
        return false
      }
    }

    if (filters.tags?.length) {
      if (!filters.tags.some((tag) => exercise.tags.includes(tag))) {
        return false
      }
    }

    if (filters.level?.length) {
      if (!filters.level.includes(exercise.level)) {
        return false
      }
    }

    if (filters.category?.length) {
      if (!filters.category.includes(exercise.category)) {
        return false
      }
    }

    if (filters.excludeIds?.length) {
      if (filters.excludeIds.includes(exercise.id)) {
        return false
      }
    }

    return true
  })
}
