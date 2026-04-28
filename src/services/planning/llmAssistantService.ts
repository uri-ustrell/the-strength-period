import type { Equipment, Exercise, MuscleGroup } from '@/types/exercise'
import type {
  ExerciseAssignment,
  LoadTarget,
  Mesocycle,
  MuscleGroupTarget,
  SessionTemplate,
} from '@/types/planning'

// --- LLM Response Types ---

export type LLMExercise = {
  exerciseId: string
  sets: number
  reps: number | [number, number]
  weightKg?: number
  rpe?: number
  restSeconds: number
}

export type LLMSession = {
  weekNumber: number
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7
  durationMinutes: number
  exercises: LLMExercise[]
}

export type LLMPlanResponse = {
  name: string
  durationWeeks: number
  sessions: LLMSession[]
}

// --- Validation Types ---

export type ValidationError = {
  key: string
  params?: Record<string, string | number>
}

export type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  parsed?: LLMPlanResponse
}

// --- Label Helpers ---

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  pes_corporal: 'Bodyweight',
  manueles: 'Dumbbells',
  kettlebell: 'Kettlebell',
  barra: 'Barbell',
  discos: 'Weight plates',
  weight_vest: 'Weight vest',
  banda_elastica: 'Resistance band',
  mini_band: 'Mini band',
  banda_tubular: 'Tubular band',
  trx: 'TRX / Suspension',
  barra_dominades: 'Pull-up bar',
  anelles: 'Gymnastic rings',
  corda: 'Climbing rope',
  comba: 'Jump rope',
  step: 'Step platform',
  bicicleta: 'Stationary bike',
  cinta: 'Treadmill',
  foam_roller: 'Foam roller',
  pilota_massatge: 'Massage ball',
  mat: 'Mat',
  fitball: 'Stability ball',
  bosu: 'BOSU',
  plataforma_inestable: 'Balance pad',
  paralettes: 'Parallettes',
  plyo_box: 'Plyo box',
  sandbag: 'Sandbag',
}

const DAY_NAMES: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

// --- Prompt Generation ---

export function generatePromptTemplate(params: {
  presetName: string
  durationWeeks: number
  daysPerWeek: number
  dayNames: string
  minutesPerSession: number
  equipmentList: string
  restrictionsList: string
  weeklyProgression: number
  personalNotes?: string
}): string {
  const personalNotesSection = params.personalNotes?.trim()
    ? `\n## Personal Notes\n\n${params.personalNotes.trim()}\n`
    : ''

  return `You are an expert personal trainer specializing in periodized strength training.

## Task

Generate a structured training plan (mesocycle) in JSON format based on the user's parameters and the exercise catalog provided in the attached CSV file.

## User Parameters

- Goal: ${params.presetName}
- Duration: ${params.durationWeeks} weeks
- Training days per week: ${params.daysPerWeek} (${params.dayNames})
- Minutes per session: ${params.minutesPerSession}
- Equipment available: ${params.equipmentList}
- Active restrictions: ${params.restrictionsList}
- Progression intensity: ${params.weeklyProgression}/10 (0 = maintenance, 10 = aggressive)
${personalNotesSection}
## Exercise Catalog

See the attached CSV file. Each row is an exercise you may use. Use ONLY exercise IDs from this catalog. The CSV columns are:
- id: unique identifier (use this in exerciseId)
- name: exercise name
- primaryMuscles: main muscles targeted (semicolon-separated)
- secondaryMuscles: supporting muscles (semicolon-separated)
- equipment: required equipment (semicolon-separated)
- level: beginner / intermediate / expert
- category: strength / mobility / stability / plyometrics / cardio
- progressionMetric: weight / reps / seconds
- estimatedSeriesDurationSeconds: approximate time per set
- restrictions: conditions where this exercise should be avoided (semicolon-separated)

## Required JSON Output

Return a JSON object with this EXACT structure:

\`\`\`json
{
  "name": "string — descriptive plan name",
  "durationWeeks": <number>,
  "sessions": [
    {
      "weekNumber": <number, 1-based>,
      "dayOfWeek": <number, 1=Monday ... 7=Sunday>,
      "durationMinutes": <number>,
      "exercises": [
        {
          "exerciseId": "string — must match an id from the CSV",
          "sets": <number, 1-6>,
          "reps": <number OR [min, max]>,
          "weightKg": <number, optional — only for progressionMetric=weight>,
          "rpe": <number, 5-10, optional>,
          "restSeconds": <number, 30-180>
        }
      ]
    }
  ]
}
\`\`\`

## Rules

1. Use ONLY exerciseId values from the provided CSV — do not invent IDs.
2. Each session's total time (sum of sets × estimatedSeriesDurationSeconds + restSeconds × (sets-1) for each exercise) must be within ±10% of ${params.minutesPerSession} minutes.
3. Apply progressive overload: gradually increase volume or intensity across weeks.
4. Schedule a deload week (60% volume) at every 4th week (weeks 4, 8, 12...).
5. No exercise should appear in two consecutive sessions.
6. Avoid repeating exercises targeting the same primary muscle group within the same session.
7. RPE: start around 6.0 in week 1, increase ~0.25 per week, cap at 9.5. Deload weeks use RPE ≤ 6.
8. restSeconds: between 30 and 180.
9. If the user has active restrictions, do NOT use exercises whose restrictions column includes those conditions.
10. For progressionMetric "weight": use reps as a range [8,12], increase weightKg ~5% per week.
11. For progressionMetric "reps": increase reps each week.
12. For progressionMetric "seconds": increase hold duration each week.
13. Scale weekly progression proportionally to the progression intensity (${params.weeklyProgression}/10).

Return ONLY the JSON object — no explanations, no markdown code fences, no additional text.`
}

export function resolvePromptParams(params: {
  presetName: string
  durationWeeks: number
  trainingDays: number[]
  minutesPerSession: number
  equipment: Equipment[]
  weeklyProgression: number
  personalNotes?: string
}): Parameters<typeof generatePromptTemplate>[0] {
  return {
    presetName: params.presetName,
    durationWeeks: params.durationWeeks,
    daysPerWeek: params.trainingDays.length,
    dayNames: params.trainingDays.map((d) => DAY_NAMES[d] ?? `Day ${d}`).join(', '),
    minutesPerSession: params.minutesPerSession,
    equipmentList: params.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', '),
    restrictionsList: 'None',
    weeklyProgression: params.weeklyProgression,
    personalNotes: params.personalNotes,
  }
}

// --- CSV Generation ---

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes(';') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function generateExerciseCsv(
  exercises: Exercise[],
  getEnglishName: (nameKey: string) => string
): string {
  const headers = [
    'id',
    'name',
    'primaryMuscles',
    'secondaryMuscles',
    'equipment',
    'level',
    'category',
    'progressionMetric',
    'estimatedSeriesDurationSeconds',
    'restrictions',
  ]

  const rows = exercises.map((ex) => [
    escapeCsvField(ex.id),
    escapeCsvField(getEnglishName(ex.nameKey)),
    escapeCsvField(ex.primaryMuscles.join(';')),
    escapeCsvField(ex.secondaryMuscles.join(';')),
    escapeCsvField(ex.equipment.join(';')),
    ex.level,
    ex.category,
    ex.progressionMetric,
    String(ex.estimatedSeriesDurationSeconds),
    escapeCsvField(ex.restrictions.map((r) => `${r.condition}:${r.action}`).join(';')),
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

// --- Validation ---

const MAX_PASTE_SIZE = 500 * 1024 // 500KB

function stripMarkdownFences(input: string): string {
  let trimmed = input.trim()
  // Remove leading ```json or ``` and trailing ```
  const fenceStart = /^```(?:json)?\s*\n?/
  const fenceEnd = /\n?\s*```\s*$/
  if (fenceStart.test(trimmed) && fenceEnd.test(trimmed)) {
    trimmed = trimmed.replace(fenceStart, '').replace(fenceEnd, '')
  }
  return trimmed.trim()
}

function isValidDayOfWeek(v: unknown): v is 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 7
}

export function validateLLMResponse(
  jsonString: string,
  validExerciseIds: Set<string>,
  minutesPerSession: number,
  exerciseMap: Map<string, Exercise>
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Size check
  if (jsonString.length > MAX_PASTE_SIZE) {
    return { valid: false, errors: [{ key: 'llm.error_invalid_json' }], warnings: [] }
  }

  // Strip markdown fences
  const cleaned = stripMarkdownFences(jsonString)

  // Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return { valid: false, errors: [{ key: 'llm.error_invalid_json' }], warnings: [] }
  }

  // Rule 2: Top-level structure
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, errors: [{ key: 'llm.error_missing_fields' }], warnings: [] }
  }

  const obj = parsed as Record<string, unknown>

  if (
    typeof obj.name !== 'string' ||
    typeof obj.durationWeeks !== 'number' ||
    obj.durationWeeks < 1 ||
    !Array.isArray(obj.sessions) ||
    obj.sessions.length === 0
  ) {
    return { valid: false, errors: [{ key: 'llm.error_missing_fields' }], warnings: [] }
  }

  const sessions = obj.sessions as unknown[]

  // Track sessions for warning checks
  const allSessionExercises: string[][] = []

  // Rule 3 & 4: Validate each session
  for (let si = 0; si < sessions.length; si++) {
    const session = sessions[si] as Record<string, unknown>
    const sessionIndex = si + 1

    if (
      typeof session !== 'object' ||
      session === null ||
      typeof session.weekNumber !== 'number' ||
      session.weekNumber < 1 ||
      !isValidDayOfWeek(session.dayOfWeek) ||
      typeof session.durationMinutes !== 'number' ||
      session.durationMinutes <= 0 ||
      !Array.isArray(session.exercises) ||
      (session.exercises as unknown[]).length === 0
    ) {
      errors.push({
        key: 'llm.error_invalid_session',
        params: { index: sessionIndex },
      })
      allSessionExercises.push([])
      continue
    }

    const exs = session.exercises as unknown[]
    const sessionExerciseIds: string[] = []
    const sessionPrimaryMuscles: Map<MuscleGroup, number> = new Map()

    for (let ei = 0; ei < exs.length; ei++) {
      const ex = exs[ei] as Record<string, unknown>
      const exIndex = ei + 1

      // Rule 4: basic structure
      if (
        typeof ex !== 'object' ||
        ex === null ||
        typeof ex.exerciseId !== 'string' ||
        typeof ex.sets !== 'number' ||
        ex.sets < 1 ||
        ex.sets > 10 ||
        typeof ex.restSeconds !== 'number' ||
        ex.restSeconds < 15 ||
        ex.restSeconds > 300
      ) {
        errors.push({
          key: 'llm.error_invalid_exercise',
          params: { session: sessionIndex, index: exIndex },
        })
        continue
      }

      // Validate reps
      const reps = ex.reps
      const repsValid =
        (typeof reps === 'number' && reps > 0) ||
        (Array.isArray(reps) &&
          reps.length === 2 &&
          typeof reps[0] === 'number' &&
          typeof reps[1] === 'number' &&
          reps[0] > 0 &&
          reps[0] <= reps[1])

      if (!repsValid) {
        errors.push({
          key: 'llm.error_invalid_exercise',
          params: { session: sessionIndex, index: exIndex },
        })
        continue
      }

      // Rule 5: exerciseId must exist
      if (!validExerciseIds.has(ex.exerciseId)) {
        errors.push({
          key: 'llm.error_unknown_exercise',
          params: { exerciseId: ex.exerciseId },
        })
        continue
      }

      // Rule 6: weightKg
      if (ex.weightKg !== undefined && (typeof ex.weightKg !== 'number' || ex.weightKg <= 0)) {
        errors.push({
          key: 'llm.error_invalid_weight',
          params: { exerciseId: ex.exerciseId },
        })
        continue
      }

      // Rule 7: rpe
      if (ex.rpe !== undefined && (typeof ex.rpe !== 'number' || ex.rpe < 1 || ex.rpe > 10)) {
        errors.push({
          key: 'llm.error_invalid_rpe',
          params: { exerciseId: ex.exerciseId },
        })
        continue
      }

      sessionExerciseIds.push(ex.exerciseId)

      // Track primary muscles for W2
      const catalogEx = exerciseMap.get(ex.exerciseId)
      if (catalogEx) {
        const primaryMuscle = catalogEx.primaryMuscles[0]
        if (primaryMuscle) {
          const count = sessionPrimaryMuscles.get(primaryMuscle) ?? 0
          sessionPrimaryMuscles.set(primaryMuscle, count + 1)
        }
      }
    }

    allSessionExercises.push(sessionExerciseIds)

    // W2: Duplicate muscle in same session
    for (const [muscle, count] of sessionPrimaryMuscles.entries()) {
      if (count > 1) {
        warnings.push({
          key: 'llm.warn_duplicate_muscle',
          params: { muscle, session: sessionIndex },
        })
      }
    }

    // W3: Duration mismatch
    let estimatedSeconds = 0
    for (const rawEx of exs) {
      const ex = rawEx as Record<string, unknown>
      if (
        typeof ex.exerciseId !== 'string' ||
        typeof ex.sets !== 'number' ||
        typeof ex.restSeconds !== 'number'
      )
        continue
      const catalogEx = exerciseMap.get(ex.exerciseId)
      if (catalogEx) {
        const sets = ex.sets
        const seriesDuration = catalogEx.estimatedSeriesDurationSeconds
        estimatedSeconds += sets * seriesDuration + (sets - 1) * ex.restSeconds
      }
    }
    const estimatedMinutes = Math.round(estimatedSeconds / 60)
    const targetMinutes = minutesPerSession
    if (estimatedMinutes > targetMinutes * 1.1 || estimatedMinutes < targetMinutes * 0.5) {
      warnings.push({
        key: 'llm.warn_duration_mismatch',
        params: { session: sessionIndex, estimated: estimatedMinutes, target: targetMinutes },
      })
    }
  }

  // W1: Consecutive session exercise overlap
  for (let i = 1; i < allSessionExercises.length; i++) {
    const prev = allSessionExercises[i - 1] ?? []
    const curr = allSessionExercises[i] ?? []
    for (const exId of curr) {
      if (prev.includes(exId)) {
        warnings.push({
          key: 'llm.warn_consecutive_exercise',
          params: { exerciseId: exId },
        })
      }
    }
  }

  // W4: durationWeeks mismatch
  const maxWeek = Math.max(
    ...sessions
      .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
      .map((s) => (typeof s.weekNumber === 'number' ? s.weekNumber : 0))
  )
  if (maxWeek !== (obj.durationWeeks as number)) {
    warnings.push({ key: 'llm.warn_weeks_mismatch' })
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings }
  }

  // Build typed response
  const response: LLMPlanResponse = {
    name: obj.name as string,
    durationWeeks: obj.durationWeeks as number,
    sessions: (obj.sessions as Record<string, unknown>[]).map((s) => ({
      weekNumber: s.weekNumber as number,
      dayOfWeek: s.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      durationMinutes: s.durationMinutes as number,
      exercises: (s.exercises as Record<string, unknown>[]).map((e) => ({
        exerciseId: e.exerciseId as string,
        sets: e.sets as number,
        reps: e.reps as number | [number, number],
        weightKg: e.weightKg as number | undefined,
        rpe: e.rpe as number | undefined,
        restSeconds: e.restSeconds as number,
      })),
    })),
  }

  return { valid: true, errors: [], warnings, parsed: response }
}

// --- Conversion ---

export function convertToMesocycle(
  response: LLMPlanResponse,
  presetId: string,
  exerciseMap: Map<string, Exercise>
): Mesocycle {
  const mesocycleId = crypto.randomUUID()

  const sessions: SessionTemplate[] = response.sessions.map((s) => {
    const muscleGroupTargets: MuscleGroupTarget[] = []
    const exerciseAssignments: ExerciseAssignment[] = []
    const percentagePerExercise = Math.round(100 / s.exercises.length)

    for (const ex of s.exercises) {
      const catalogEx = exerciseMap.get(ex.exerciseId)
      const muscleGroup: MuscleGroup = catalogEx?.primaryMuscles[0] ?? 'quadriceps'

      const loadTarget: LoadTarget = {
        sets: ex.sets,
        reps: ex.reps,
        weightKg: ex.weightKg,
        rpe: ex.rpe,
        restSeconds: ex.restSeconds,
      }

      muscleGroupTargets.push({
        muscleGroup,
        percentageOfSession: percentagePerExercise,
        loadTarget,
      })

      exerciseAssignments.push({
        muscleGroup,
        exerciseId: ex.exerciseId,
        progressionMetric: catalogEx?.progressionMetric ?? 'reps',
      })
    }

    return {
      id: crypto.randomUUID(),
      mesocycleId,
      weekNumber: s.weekNumber,
      dayOfWeek: s.dayOfWeek,
      durationMinutes: s.durationMinutes,
      muscleGroupTargets,
      progressionType: 'linear',
      restrictions: [],
      exerciseAssignments,
      completed: false,
      skipped: false,
    }
  })

  return {
    id: mesocycleId,
    name: response.name,
    presetId,
    startDate: new Date().toISOString().split('T')[0] ?? '',
    durationWeeks: response.durationWeeks,
    sessions,
    createdAt: new Date().toISOString(),
    active: true,
  }
}
