import type { Exercise, MuscleGroup, ProgressionMetric } from '@/types/exercise'
import type { Mesocycle, SessionTemplate, MuscleGroupTarget, LoadTarget, ProgressionType, ExerciseAssignment } from '@/types/planning'
import type { UserConfig } from '@/types/user'
import { filterExercises } from '@/services/exercises/exerciseFilter'
import { PROGRESSION_RULES } from '@/data/progressionRules'
import { getPresetById } from '@/data/presets'

function generateId(): string {
  return crypto.randomUUID()
}

type MuscleAllocation = {
  muscleGroup: MuscleGroup
  percentage: number
  baseSets: number
}

function resolveMuscleDistribution(
  presetId: string,
  muscleDistribution?: Record<string, number>,
): Record<string, number> {
  if (muscleDistribution && Object.keys(muscleDistribution).length > 0) {
    return muscleDistribution
  }

  const preset = getPresetById(presetId)
  if (preset && Object.keys(preset.muscleDistribution).length > 0) {
    const dist: Record<string, number> = {}
    for (const [mg, pct] of Object.entries(preset.muscleDistribution)) {
      if (pct && pct > 0) dist[mg] = pct
    }
    return dist
  }

  const defaultGroups: MuscleGroup[] = ['quadriceps', 'isquiotibials', 'glutis', 'pectoral', 'dorsal', 'abdominal']
  const pct = Math.round(100 / defaultGroups.length)
  const dist: Record<string, number> = {}
  for (const mg of defaultGroups) {
    dist[mg] = pct
  }
  return dist
}

function computeBaseSets(
  minutesPerSession: number,
  muscleDistribution: Record<string, number>,
  avgSetDurationSeconds: number,
  avgRestSeconds: number,
): MuscleAllocation[] {
  const totalPercentage = Object.values(muscleDistribution).reduce((sum, p) => sum + p, 0)
  const totalAvailableSeconds = minutesPerSession * 60
  const timePerSet = avgSetDurationSeconds + avgRestSeconds

  const allocations: MuscleAllocation[] = []
  for (const [mg, pct] of Object.entries(muscleDistribution)) {
    const normalizedPct = pct / totalPercentage
    const timeForMuscle = totalAvailableSeconds * normalizedPct
    const sets = Math.max(1, Math.round(timeForMuscle / timePerSet))
    allocations.push({
      muscleGroup: mg as MuscleGroup,
      percentage: Math.round(normalizedPct * 100),
      baseSets: sets,
    })
  }

  return allocations
}

function computeLoadTarget(
  metric: ProgressionMetric,
  weekNumber: number,
  weekMultiplier: number,
  isDeload: boolean,
  progressionType: ProgressionType,
  sessionIndex: number,
): LoadTarget {
  const baseRpe = Math.min(10, 6 + (weekNumber - 1) * 0.25)
  const rpe = isDeload ? Math.min(baseRpe, 6) : baseRpe

  let undulatingMultiplier = 1
  if (progressionType === 'undulating' && !isDeload) {
    undulatingMultiplier = sessionIndex % 2 === 0 ? 1.15 : 0.85
  }

  const effectiveMultiplier = weekMultiplier * undulatingMultiplier

  if (metric === 'weight') {
    const sets = Math.max(1, Math.round(3 * effectiveMultiplier))
    return {
      sets,
      reps: [8, 12],
      rpe: Math.round(rpe * 10) / 10,
      restSeconds: isDeload ? 60 : 90,
    }
  }

  if (metric === 'reps') {
    const baseReps = 12
    const scaledReps = Math.max(6, Math.round(baseReps * effectiveMultiplier))
    const sets = Math.max(1, Math.round(3 * effectiveMultiplier))
    return {
      sets,
      reps: scaledReps,
      rpe: Math.round(rpe * 10) / 10,
      restSeconds: isDeload ? 45 : 60,
    }
  }

  // seconds
  const baseSeconds = 30
  const scaledSeconds = Math.max(15, Math.round(baseSeconds * effectiveMultiplier))
  const sets = Math.max(1, Math.round(3 * effectiveMultiplier))
  return {
    sets,
    reps: scaledSeconds,
    rpe: Math.round(rpe * 10) / 10,
    restSeconds: isDeload ? 30 : 45,
  }
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

function trimToFitDuration(
  targets: MuscleGroupTarget[],
  assignments: ExerciseAssignment[],
  maxMinutes: number,
): { targets: MuscleGroupTarget[]; assignments: ExerciseAssignment[] } {
  let sorted = [...targets].sort((a, b) => a.percentageOfSession - b.percentageOfSession)
  let filteredAssignments = [...assignments]

  while (sorted.length > 1 && estimateSessionDuration(sorted) > maxMinutes * 1.1) {
    const removed = sorted.shift()!
    filteredAssignments = filteredAssignments.filter((a) => a.muscleGroup !== removed.muscleGroup)
  }

  // If still over budget with 1 target, reduce sets
  if (sorted.length === 1 && estimateSessionDuration(sorted) > maxMinutes * 1.1) {
    const original = sorted[0]!
    const updatedLoad: LoadTarget = {
      ...original.loadTarget,
      sets: Math.max(1, original.loadTarget.sets - 1),
    }
    sorted = [{ ...original, loadTarget: updatedLoad }]
  }

  return { targets: sorted, assignments: filteredAssignments }
}

function assignDayOfWeek(dayIndex: number, daysPerWeek: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  if (daysPerWeek <= 1) return 1

  const spacing = 7 / daysPerWeek
  const day = Math.round(1 + dayIndex * spacing)
  return Math.min(7, Math.max(1, day)) as 1 | 2 | 3 | 4 | 5 | 6 | 7
}

function buildCandidatePool(
  exercises: Exercise[],
  muscleGroup: MuscleGroup,
): Exercise[] {
  return exercises.filter((ex) => ex.primaryMuscles.includes(muscleGroup))
}

function selectExercise(
  candidates: Exercise[],
  previousSessionExerciseIds: Set<string>,
  usedInSession: Set<string>,
): Exercise | null {
  // Prefer exercises not used in previous session and not yet in this session
  const preferred = candidates.filter(
    (ex) => !previousSessionExerciseIds.has(ex.id) && !usedInSession.has(ex.id),
  )

  if (preferred.length > 0) {
    return preferred[Math.floor(Math.random() * preferred.length)] ?? null
  }

  // Relax anti-repeat: allow previous session exercises but not in-session duplicates
  const fallback = candidates.filter((ex) => !usedInSession.has(ex.id))
  if (fallback.length > 0) {
    return fallback[Math.floor(Math.random() * fallback.length)] ?? null
  }

  // Last resort: any candidate
  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null
  }

  return null
}

export function generateMesocycle(
  presetId: string,
  config: UserConfig,
  availableExercises: Exercise[],
  options?: {
    weeks?: number
    muscleDistribution?: Record<string, number>
    progressionType?: ProgressionType
    weeklyProgression?: number
    exerciseSelections?: Record<string, string[]>
  },
): Mesocycle {
  const preset = getPresetById(presetId)
  const progressionType: ProgressionType = options?.progressionType ?? preset?.progressionType ?? 'linear'
  const weeklyProgression = options?.weeklyProgression ?? config.weeklyProgression ?? 5
  const totalWeeks = options?.weeks ?? 8
  const daysPerWeek = config.availableDaysPerWeek
  const minutesPerSession = config.minutesPerSession

  const rule = PROGRESSION_RULES[progressionType]

  // 1. Resolve muscle distribution
  const muscleDistribution = resolveMuscleDistribution(presetId, options?.muscleDistribution)

  // 2. Pre-filter exercise pool by user equipment + restrictions
  const filteredPool = filterExercises(availableExercises, {
    equipment: config.equipment,
    excludeRestrictions: config.activeRestrictions,
  })

  // 3. Build candidate pool per muscle group
  const candidatePools: Record<string, Exercise[]> = {}
  for (const mg of Object.keys(muscleDistribution)) {
    let pool = buildCandidatePool(filteredPool, mg as MuscleGroup)

    // Apply user exercise selections if provided
    if (options?.exerciseSelections?.[mg]?.length) {
      const selectedIds = new Set(options.exerciseSelections[mg])
      pool = pool.filter((ex) => selectedIds.has(ex.id))
    }

    candidatePools[mg] = pool
  }

  // 4. Compute base sets from time budget
  const avgSetDuration = 45
  const avgRest = 75
  const baseAllocations = computeBaseSets(minutesPerSession, muscleDistribution, avgSetDuration, avgRest)

  // 5. Generate sessions
  const mesocycleId = generateId()
  const sessions: SessionTemplate[] = []
  let previousSessionExerciseIds = new Set<string>()

  for (let week = 1; week <= totalWeeks; week++) {
    const isDeload = week % rule.deloadWeek === 0
    const scaledIncrease = rule.weeklyVolumeIncrease * (weeklyProgression / 10)
    const weekMultiplier = isDeload
      ? rule.deloadPercentage
      : 1 + scaledIncrease * (week - 1)

    for (let day = 0; day < daysPerWeek; day++) {
      const sessionIndex = (week - 1) * daysPerWeek + day
      const usedInSession = new Set<string>()
      const muscleGroupTargets: MuscleGroupTarget[] = []
      const exerciseAssignments: ExerciseAssignment[] = []

      for (const alloc of baseAllocations) {
        const pool = candidatePools[alloc.muscleGroup] ?? []
        if (pool.length === 0) continue

        const exercise = selectExercise(pool, previousSessionExerciseIds, usedInSession)
        if (!exercise) continue

        usedInSession.add(exercise.id)

        const loadTarget = computeLoadTarget(
          exercise.progressionMetric,
          week,
          weekMultiplier,
          isDeload,
          progressionType,
          sessionIndex,
        )

        const scaledSets = Math.max(1, Math.round(alloc.baseSets * weekMultiplier))
        loadTarget.sets = isDeload
          ? Math.max(1, Math.round(alloc.baseSets * rule.deloadPercentage))
          : scaledSets

        muscleGroupTargets.push({
          muscleGroup: alloc.muscleGroup,
          percentageOfSession: alloc.percentage,
          loadTarget,
        })

        exerciseAssignments.push({
          muscleGroup: alloc.muscleGroup,
          exerciseId: exercise.id,
          progressionMetric: exercise.progressionMetric,
        })
      }

      // Duration check + trim
      const { targets: trimmedTargets, assignments: trimmedAssignments } = trimToFitDuration(
        muscleGroupTargets,
        exerciseAssignments,
        minutesPerSession,
      )

      const sessionDuration = Math.round(estimateSessionDuration(trimmedTargets))

      sessions.push({
        id: generateId(),
        mesocycleId,
        weekNumber: week,
        dayOfWeek: assignDayOfWeek(day, daysPerWeek),
        durationMinutes: sessionDuration,
        muscleGroupTargets: trimmedTargets,
        progressionType,
        restrictions: config.activeRestrictions,
        exerciseAssignments: trimmedAssignments,
        completed: false,
        skipped: false,
      })

      // Update anti-repeat for next session
      previousSessionExerciseIds = usedInSession
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
