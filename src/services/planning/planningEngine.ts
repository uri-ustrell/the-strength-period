import type { Exercise, Equipment } from '@/types/exercise'
import type { Mesocycle, SessionTemplate, MuscleGroupTarget, LoadTarget } from '@/types/planning'
import type { UserConfig } from '@/types/user'

interface PlanningRequest {
  profile: string
  equipment: string[]
  preset: string
  weeks: number
  daysPerWeek: number
  minutesPerSession: number
  restrictions: string[]
  muscleDistribution?: Record<string, number>
  progressionType?: string
  weeklyProgression?: number
  exerciseCatalog: Array<{
    id: string
    nameKey: string
    primaryMuscles: string[]
    secondaryMuscles: string[]
    equipment: string[]
    tags: string[]
    level: string
    category: string
  }>
}

export interface LLMSessionTarget {
  muscleGroup: string
  percentageOfSession: number
  sets: number
  reps: [number, number]
  rpe: number
  restSeconds: number
}

export interface LLMSession {
  dayOfWeek: number
  durationMinutes: number
  muscleGroupTargets: LLMSessionTarget[]
}

export interface LLMWeek {
  weekNumber: number
  focus: string
  loadPercentage: number
  sessions: LLMSession[]
}

export interface LLMResponse {
  mesocycle: {
    name: string
    durationWeeks: number
    weeks: LLMWeek[]
  }
}

function generateId(): string {
  return crypto.randomUUID()
}

function filterExercisesByEquipment(exercises: Exercise[], equipment: Equipment[]) {
  return exercises.filter((ex) =>
    ex.equipment.length === 0 || ex.equipment.some((eq) => equipment.includes(eq))
  )
}

function buildCatalogPayload(exercises: Exercise[]) {
  return exercises.map((ex) => ({
    id: ex.id,
    nameKey: ex.nameKey,
    primaryMuscles: ex.primaryMuscles,
    secondaryMuscles: ex.secondaryMuscles,
    equipment: ex.equipment,
    tags: ex.tags,
    level: ex.level,
    category: ex.category,
  }))
}

function mapSessionTemplate(
  mesocycleId: string,
  week: LLMWeek,
  session: LLMSession,
  progressionType: string,
  restrictions: string[],
): SessionTemplate {
  const muscleGroupTargets: MuscleGroupTarget[] = session.muscleGroupTargets.map((t) => {
    const loadTarget: LoadTarget = {
      sets: t.sets,
      reps: t.reps,
      rpe: t.rpe,
      restSeconds: t.restSeconds,
    }
    return {
      muscleGroup: t.muscleGroup as MuscleGroupTarget['muscleGroup'],
      percentageOfSession: t.percentageOfSession,
      loadTarget,
    }
  })

  return {
    id: generateId(),
    mesocycleId,
    weekNumber: week.weekNumber,
    dayOfWeek: session.dayOfWeek as SessionTemplate['dayOfWeek'],
    durationMinutes: session.durationMinutes,
    muscleGroupTargets,
    progressionType: progressionType as SessionTemplate['progressionType'],
    restrictions,
    completed: false,
    skipped: false,
  }
}

export async function generateMesocycle(
  presetId: string,
  config: UserConfig,
  availableExercises: Exercise[],
  options?: {
    weeks?: number
    muscleDistribution?: Record<string, number>
    progressionType?: string
    weeklyProgression?: number
  },
): Promise<Mesocycle> {
  const filtered = filterExercisesByEquipment(availableExercises, config.equipment)
  const catalog = buildCatalogPayload(filtered)

  const payload: PlanningRequest = {
    profile: config.profile,
    equipment: config.equipment,
    preset: presetId,
    weeks: options?.weeks ?? 8,
    daysPerWeek: config.availableDaysPerWeek,
    minutesPerSession: config.minutesPerSession,
    restrictions: config.activeRestrictions,
    muscleDistribution: options?.muscleDistribution,
    progressionType: options?.progressionType ?? 'linear',
    weeklyProgression: options?.weeklyProgression,
    exerciseCatalog: catalog,
  }

  const response = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Server error: ${response.status}`)
  }

  const data: LLMResponse = await response.json()
  const llm = data.mesocycle

  const mesocycleId = generateId()
  const progressionType = options?.progressionType ?? 'linear'

  const sessions: SessionTemplate[] = llm.weeks.flatMap((week) =>
    week.sessions.map((session) =>
      mapSessionTemplate(mesocycleId, week, session, progressionType, config.activeRestrictions)
    )
  )

  const mesocycle: Mesocycle = {
    id: mesocycleId,
    name: llm.name,
    presetId,
    startDate: new Date().toISOString().split('T')[0] ?? '',
    durationWeeks: llm.durationWeeks,
    sessions,
    createdAt: new Date().toISOString(),
    active: true,
  }

  return mesocycle
}
