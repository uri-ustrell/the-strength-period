import type { Equipment, Exercise } from '@/types/exercise'
import type { MuscleGroupTarget, SessionTemplate } from '@/types/planning'

export interface SelectedExercise {
  exercise: Exercise
  sets: number
  reps: number | [number, number]
  weightKg?: number
  rpe?: number
  restSeconds: number
}

export interface GeneratedSession {
  templateId: string
  mesocycleId: string
  exercises: SelectedExercise[]
  estimatedDurationMinutes: number
}

function filterByMuscleGroup(exercises: Exercise[], muscleGroup: string): Exercise[] {
  return exercises.filter(
    (ex) =>
      ex.primaryMuscles.includes(muscleGroup as Exercise['primaryMuscles'][number]) ||
      ex.secondaryMuscles.includes(muscleGroup as Exercise['secondaryMuscles'][number])
  )
}

function filterByEquipment(exercises: Exercise[], userEquipment: Equipment[]): Exercise[] {
  return exercises.filter(
    (ex) => ex.equipment.length === 0 || ex.equipment.some((eq) => userEquipment.includes(eq))
  )
}

function separateFreshAndRecent(
  exercises: Exercise[],
  recentExerciseIds: string[]
): { fresh: Exercise[]; recent: Exercise[] } {
  const fresh: Exercise[] = []
  const recent: Exercise[] = []
  for (const ex of exercises) {
    if (recentExerciseIds.includes(ex.id)) {
      recent.push(ex)
    } else {
      fresh.push(ex)
    }
  }
  return { fresh, recent }
}

function scoreExercise(exercise: Exercise, _template: SessionTemplate): number {
  let score = 1

  if (exercise.level === 'intermediate') {
    score += 1
  } else if (exercise.level === 'beginner') {
    score += 0.5
  }

  return score
}

function weightedRandomSelect(
  exercises: Exercise[],
  template: SessionTemplate
): Exercise | undefined {
  if (exercises.length === 0) return undefined
  if (exercises.length === 1) return exercises[0]

  const scored = exercises.map((ex) => ({
    exercise: ex,
    weight: scoreExercise(ex, template),
  }))

  const totalWeight = scored.reduce((sum, s) => sum + s.weight, 0)
  let random = Math.random() * totalWeight

  for (const s of scored) {
    random -= s.weight
    if (random <= 0) return s.exercise
  }

  return scored[scored.length - 1]?.exercise
}

function selectExerciseForTarget(
  target: MuscleGroupTarget,
  template: SessionTemplate,
  allExercises: Exercise[],
  recentExerciseIds: string[],
  userEquipment: Equipment[],
  alreadySelected: string[]
): Exercise | undefined {
  let candidates = filterByMuscleGroup(allExercises, target.muscleGroup)
  candidates = filterByEquipment(candidates, userEquipment)
  candidates = candidates.filter((ex) => !alreadySelected.includes(ex.id))

  if (candidates.length === 0) return undefined

  const { fresh, recent } = separateFreshAndRecent(candidates, recentExerciseIds)

  const pool = fresh.length >= 2 ? fresh : [...fresh, ...recent]

  return weightedRandomSelect(pool, template)
}

export function generateSession(
  template: SessionTemplate,
  allExercises: Exercise[],
  recentExerciseIds: string[],
  userEquipment: Equipment[]
): GeneratedSession {
  const selectedExercises: SelectedExercise[] = []
  const alreadySelected: string[] = []

  for (const target of template.muscleGroupTargets) {
    const exercise = selectExerciseForTarget(
      target,
      template,
      allExercises,
      recentExerciseIds,
      userEquipment,
      alreadySelected
    )

    if (!exercise) continue

    alreadySelected.push(exercise.id)

    const { loadTarget } = target

    selectedExercises.push({
      exercise,
      sets: loadTarget.sets,
      reps: loadTarget.reps,
      weightKg: loadTarget.weightKg,
      rpe: loadTarget.rpe,
      restSeconds: loadTarget.restSeconds,
    })
  }

  const totalSeconds = selectedExercises.reduce((sum, se) => {
    const seriesTime = se.exercise.estimatedSeriesDurationSeconds * se.sets
    const restTime = se.restSeconds * Math.max(0, se.sets - 1)
    return sum + seriesTime + restTime
  }, 0)

  const estimatedDurationMinutes = Math.ceil(totalSeconds / 60)

  return {
    templateId: template.id,
    mesocycleId: template.mesocycleId,
    exercises: selectedExercises,
    estimatedDurationMinutes,
  }
}
