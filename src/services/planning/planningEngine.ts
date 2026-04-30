import { getPresetById } from '@/data/presets'
import { PROGRESSION_RULES } from '@/data/progressionRules'
import { snapToAvailableWeight } from '@/services/planning/weightSnapping'
import type { Exercise, MuscleGroup } from '@/types/exercise'
import type {
  ExerciseAssignment,
  LoadTarget,
  Mesocycle,
  MuscleGroupTarget,
  PresetSessionTemplate,
  ProgressionType,
  SessionTemplate,
  WeekProgressionRate,
} from '@/types/planning'
import type { UserConfig, WeightEquipment } from '@/types/user'

function generateId(): string {
  return crypto.randomUUID()
}

function estimateSessionDuration(targets: MuscleGroupTarget[]): number {
  let totalSeconds = 0
  for (const target of targets) {
    const { sets, restSeconds } = target.loadTarget
    const setDuration = 45
    totalSeconds += sets * setDuration + restSeconds * Math.max(0, sets - 1)
  }
  return totalSeconds / 60
}

function assignDayOfWeek(dayIndex: number, daysPerWeek: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  if (daysPerWeek <= 1) return 1

  const spacing = 7 / daysPerWeek
  const day = Math.round(1 + dayIndex * spacing)
  return Math.min(7, Math.max(1, day)) as 1 | 2 | 3 | 4 | 5 | 6 | 7
}

const WEIGHT_EQUIPMENT: WeightEquipment[] = ['manueles', 'barra']

function resolveWeekMultiplier(
  week: number,
  isDeload: boolean,
  rule: { deloadPercentage: number; weeklyVolumeIncrease: number },
  weeklyProgressionRates: WeekProgressionRate[] | undefined,
  weeklyProgression: number
): number {
  if (isDeload) return rule.deloadPercentage

  // QA-1: cumulative-vs-previous-week semantics. Each week's effective multiplier is
  // the product of (1 + pct/100) across all weeks up to and including the current week.
  if (weeklyProgressionRates && weeklyProgressionRates.length > 0) {
    let mult = 1
    for (let i = 0; i < week && i < weeklyProgressionRates.length; i++) {
      mult *= 1 + (weeklyProgressionRates[i]?.progressionPct ?? 0) / 100
    }
    return mult
  }

  // Backward compat: cumulative slider formula (legacy presets).
  const scaledIncrease = rule.weeklyVolumeIncrease * (weeklyProgression / 10)
  return 1 + scaledIncrease * (week - 1)
}

function resolveExerciseWeights(exercise: Exercise, config: UserConfig): number[] | undefined {
  if (!config.availableWeights) return undefined

  for (const eq of exercise.equipment) {
    if (WEIGHT_EQUIPMENT.includes(eq as WeightEquipment)) {
      const weights = config.availableWeights[eq as WeightEquipment]
      if (weights && weights.length > 0) return weights
    }
  }

  return undefined
}

export function generateMesocycle(
  presetId: string,
  config: UserConfig,
  availableExercises: Exercise[],
  options?: {
    weeks?: number
    progressionType?: ProgressionType
    weeklyProgression?: number
    weeklyProgressionRates?: WeekProgressionRate[]
    presetSessions?: PresetSessionTemplate[]
  }
): Mesocycle {
  const preset = getPresetById(presetId)
  const presetSessions = options?.presetSessions ?? preset?.sessions
  if (!presetSessions || presetSessions.length === 0) {
    throw new Error(
      `Cannot generate mesocycle for preset "${presetId}": no faithful session templates provided.`
    )
  }
  return generateFaithfulMesocycle(presetId, config, availableExercises, presetSessions, options)
}

function validatePresetExercises(
  presetSessions: PresetSessionTemplate[],
  exerciseMap: Map<string, Exercise>
): void {
  const missing: string[] = []
  for (const session of presetSessions) {
    for (const entry of session.exercises) {
      if (!exerciseMap.has(entry.exerciseId)) {
        if (!missing.includes(entry.exerciseId)) {
          missing.push(entry.exerciseId)
        }
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing exercises in catalog: ${missing.join(', ')}`)
  }
}

function generateFaithfulMesocycle(
  presetId: string,
  config: UserConfig,
  availableExercises: Exercise[],
  presetSessions: PresetSessionTemplate[],
  options?: {
    weeks?: number
    progressionType?: ProgressionType
    weeklyProgression?: number
    weeklyProgressionRates?: WeekProgressionRate[]
  }
): Mesocycle {
  const preset = getPresetById(presetId)
  const progressionType: ProgressionType =
    options?.progressionType ?? preset?.progressionType ?? 'linear'
  const weeklyProgression = options?.weeklyProgression ?? preset?.weeklyProgression ?? 5
  const weeklyProgressionRates = options?.weeklyProgressionRates ?? preset?.weeklyProgressionRates
  const totalWeeks = options?.weeks ?? 4

  const rule = PROGRESSION_RULES[progressionType]

  // Build exercise lookup map for validation and metadata
  const exerciseMap = new Map<string, Exercise>()
  for (const ex of availableExercises) {
    exerciseMap.set(ex.id, ex)
  }

  // Validate all preset exercises exist in the catalog
  validatePresetExercises(presetSessions, exerciseMap)

  const sessionsPerWeek = presetSessions.length
  const mesocycleId = generateId()
  const sessions: SessionTemplate[] = []

  for (let week = 1; week <= totalWeeks; week++) {
    for (let dayIdx = 0; dayIdx < sessionsPerWeek; dayIdx++) {
      const template = presetSessions[dayIdx]
      if (!template) continue
      const isDeload = template.isDeload === true || week === totalWeeks
      const weekMultiplier = resolveWeekMultiplier(
        week,
        isDeload,
        rule,
        weeklyProgressionRates,
        weeklyProgression
      )
      const sessionIndex = (week - 1) * sessionsPerWeek + dayIdx

      const muscleGroupTargets: MuscleGroupTarget[] = []
      const exerciseAssignments: ExerciseAssignment[] = []
      const totalExercises = template.exercises.length

      let undulatingMultiplier = 1
      if (progressionType === 'undulating' && !isDeload) {
        undulatingMultiplier = sessionIndex % 2 === 0 ? 1.15 : 0.85
      }

      const effectiveMultiplier = weekMultiplier * undulatingMultiplier

      for (const entry of template.exercises) {
        const exercise = exerciseMap.get(entry.exerciseId)
        if (!exercise) continue

        const metric = exercise.progressionMetric
        const baseSets = entry.sets
        const baseReps = entry.reps
        const baseRest = entry.restSeconds
        const baseRpe = entry.rpe ?? Math.min(10, 6 + (week - 1) * 0.25)
        const rpe = isDeload ? Math.min(baseRpe, 6) : baseRpe

        let scaledSets: number
        let scaledReps: number | [number, number]
        let weightKg: number | undefined

        if (metric === 'weight') {
          scaledSets = isDeload
            ? Math.max(1, Math.round(baseSets * rule.deloadPercentage))
            : Math.max(1, Math.round(baseSets * effectiveMultiplier))
          scaledReps = baseReps

          let baseWeight = 0
          if (entry.initialLoadKg && entry.initialLoadKg > 0) {
            baseWeight = entry.initialLoadKg
          } else {
            const exerciseWeights = resolveExerciseWeights(exercise, config)
            if (exerciseWeights && exerciseWeights.length > 0) {
              const sorted = [...exerciseWeights].sort((a, b) => a - b)
              const midIndex = Math.floor(sorted.length * 0.3)
              baseWeight = sorted[midIndex] ?? sorted[0] ?? 0
            }
          }

          if (baseWeight > 0) {
            const exerciseWeights = resolveExerciseWeights(exercise, config)
            const progressedWeight = baseWeight * weekMultiplier
            const targetWeight = isDeload ? baseWeight * rule.deloadPercentage : progressedWeight
            if (exerciseWeights && exerciseWeights.length > 0) {
              const sorted = [...exerciseWeights].sort((a, b) => a - b)
              weightKg = snapToAvailableWeight(targetWeight, sorted, 'nearest')
            } else {
              weightKg = Math.round(targetWeight * 10) / 10
            }
          }
        } else if (metric === 'reps') {
          scaledSets = isDeload
            ? Math.max(1, Math.round(baseSets * rule.deloadPercentage))
            : Math.max(1, Math.round(baseSets * effectiveMultiplier))
          if (Array.isArray(baseReps)) {
            const midReps = (baseReps[0] + baseReps[1]) / 2
            scaledReps = isDeload
              ? baseReps
              : Math.max(baseReps[0], Math.round(midReps * effectiveMultiplier))
          } else {
            scaledReps = isDeload
              ? baseReps
              : Math.max(6, Math.round(baseReps * effectiveMultiplier))
          }
        } else {
          // seconds
          scaledSets = isDeload
            ? Math.max(1, Math.round(baseSets * rule.deloadPercentage))
            : Math.max(1, Math.round(baseSets * effectiveMultiplier))
          if (Array.isArray(baseReps)) {
            scaledReps = isDeload
              ? baseReps
              : Math.max(
                  baseReps[0],
                  Math.round(((baseReps[0] + baseReps[1]) / 2) * effectiveMultiplier)
                )
          } else {
            scaledReps = isDeload
              ? baseReps
              : Math.max(15, Math.round(baseReps * effectiveMultiplier))
          }
        }

        const loadTarget: LoadTarget = {
          sets: scaledSets,
          reps: scaledReps,
          rpe: Math.round(rpe * 10) / 10,
          restSeconds: isDeload ? Math.round(baseRest * 0.7) : baseRest,
        }
        if (weightKg !== undefined) loadTarget.weightKg = weightKg

        const primaryMuscle = exercise.primaryMuscles[0] ?? ('quadriceps' as MuscleGroup)
        const percentageOfSession = totalExercises > 0 ? Math.round(100 / totalExercises) : 100

        muscleGroupTargets.push({
          muscleGroup: primaryMuscle,
          percentageOfSession,
          loadTarget,
        })

        exerciseAssignments.push({
          muscleGroup: primaryMuscle,
          exerciseId: exercise.id,
          progressionMetric: metric,
        })
      }

      const sessionDuration = Math.round(estimateSessionDuration(muscleGroupTargets))

      sessions.push({
        id: generateId(),
        mesocycleId,
        weekNumber: week,
        dayOfWeek:
          config.trainingDays[dayIdx % config.trainingDays.length] ??
          assignDayOfWeek(dayIdx, sessionsPerWeek),
        durationMinutes: sessionDuration,
        muscleGroupTargets,
        progressionType,
        restrictions: [],
        exerciseAssignments,
        completed: false,
        skipped: false,
      })
    }
  }

  const presetName = preset?.nameKey ?? 'planning:custom'

  return {
    id: mesocycleId,
    name: presetName,
    presetId,
    startDate: new Date().toISOString().split('T')[0] ?? '',
    durationWeeks: totalWeeks,
    sessions,
    createdAt: new Date().toISOString(),
    active: true,
  }
}
