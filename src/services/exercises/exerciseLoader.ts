import type { Exercise, MuscleGroup, Equipment } from '@/types/exercise'
import { exerciseEnrichment } from '@/data/exerciseEnrichment'
import { freeExerciseDbMuscleMap, freeExerciseDbEquipmentMap } from '@/data/muscleGroups'

type RawExercise = {
  id: string
  name: string
  force: string | null
  level: string
  mechanic: string | null
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string
  images: string[]
}

function mapMuscles(rawMuscles: string[]): MuscleGroup[] {
  const mapped: MuscleGroup[] = []
  for (const raw of rawMuscles) {
    const mapped_muscle = freeExerciseDbMuscleMap[raw]
    if (mapped_muscle && !mapped.includes(mapped_muscle)) {
      mapped.push(mapped_muscle)
    }
  }
  return mapped
}

function mapEquipment(rawEquipment: string | null): Equipment[] {
  if (!rawEquipment) return ['pes_corporal']
  const mapped = freeExerciseDbEquipmentMap[rawEquipment]
  return mapped ? [mapped] : ['pes_corporal']
}

function mapLevel(rawLevel: string): Exercise['level'] {
  if (rawLevel === 'beginner' || rawLevel === 'intermediate' || rawLevel === 'expert') {
    return rawLevel
  }
  return 'intermediate'
}

export async function loadExercises(): Promise<Exercise[]> {
  const response = await fetch('/exercises/exercises.json')
  const rawExercises: RawExercise[] = await response.json()

  const exercises: Exercise[] = []

  for (const raw of rawExercises) {
    const enrichment = exerciseEnrichment[raw.id]
    if (!enrichment) continue

    exercises.push({
      id: raw.id,
      nameKey: enrichment.nameKey,
      primaryMuscles: mapMuscles(raw.primaryMuscles),
      secondaryMuscles: mapMuscles(raw.secondaryMuscles),
      equipment: mapEquipment(raw.equipment),
      level: mapLevel(raw.level),
      category: enrichment.category,
      estimatedSeriesDurationSeconds: enrichment.estimatedSeriesDurationSeconds,
      progressionMetric: enrichment.progressionMetric,
      tags: enrichment.tags,
      restrictions: enrichment.restrictions,
      rehabNotesKey: undefined,
      instructions: raw.instructions,
      images: [
        {
          url: '/exercises/placeholder.svg',
          alt: raw.name,
          isRepresentative: true,
        },
      ],
    })
  }

  return exercises
}
