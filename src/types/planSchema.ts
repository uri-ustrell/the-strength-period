import { z } from 'zod'
import type { MuscleGroup } from './exercise'

// Keep in sync with MuscleGroup in exercise.ts
const MUSCLE_GROUPS = [
  'quadriceps',
  'isquiotibials',
  'glutis',
  'bessons',
  'tibial_anterior',
  'adductors',
  'abductors',
  'psoes',
  'pectoral',
  'dorsal',
  'trapezi',
  'deltoides',
  'biceps',
  'triceps',
  'avantbras',
  'abdominal',
  'oblics',
  'lumbar',
  'estabilitzadors_cadera',
  'mobilitat_cadera',
  'mobilitat_turmell',
  'mobilitat_toracica',
  'fascies',
] as const satisfies readonly MuscleGroup[]

export const MuscleGroupSchema = z.enum(MUSCLE_GROUPS)

const dayOfWeekSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
])

// reps as [min, max] range — shared rule enforced by both schemas
const repsRangeSchema = z
  .tuple([z.number().int().positive(), z.number().int().positive()])
  .refine(([min, max]) => min <= max, { message: 'reps[0] must be <= reps[1]' })

// --- Gemini API response schema (muscleGroupTargets format) ---
// Validates the JSON produced by the system prompt in api/generate-plan.ts.

const GeminiMuscleGroupTargetSchema = z.object({
  muscleGroup: MuscleGroupSchema,
  percentageOfSession: z.number().min(0).max(100),
  sets: z.number().int().min(1).max(10),
  reps: repsRangeSchema,
  rpe: z.number().min(5).max(10),
  restSeconds: z.number().min(30).max(180),
})

const GeminiSessionSchema = z.object({
  dayOfWeek: dayOfWeekSchema,
  durationMinutes: z.number().positive(),
  muscleGroupTargets: z.array(GeminiMuscleGroupTargetSchema).min(1),
})

const GeminiWeekSchema = z.object({
  weekNumber: z.number().int().min(1),
  focus: z.string(),
  loadPercentage: z.number().min(0).max(100),
  sessions: z.array(GeminiSessionSchema).min(1),
})

const GeminiMesocycleSchema = z.object({
  name: z.string().min(1),
  durationWeeks: z.number().int().min(1),
  weeks: z.array(GeminiWeekSchema).min(1),
})

export const GeminiPlanSchema = z.object({
  mesocycle: GeminiMesocycleSchema,
})

export type GeminiPlan = z.infer<typeof GeminiPlanSchema>

// --- LLM Assistant client schema (exercises format) ---
// Validates JSON produced by the prompt in generatePromptTemplate / pasted by the user.

const LLMExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(10),
  reps: z.union([z.number().int().positive(), repsRangeSchema]),
  weightKg: z.number().positive().optional(),
  rpe: z.number().min(5).max(10).optional(),
  restSeconds: z.number().min(30).max(180),
})

const LLMSessionSchema = z.object({
  weekNumber: z.number().int().min(1),
  dayOfWeek: dayOfWeekSchema,
  durationMinutes: z.number().positive(),
  exercises: z.array(LLMExerciseSchema).min(1),
})

export const LLMPlanResponseSchema = z.object({
  name: z.string().min(1),
  durationWeeks: z.number().int().min(1),
  sessions: z.array(LLMSessionSchema).min(1),
})

export type LLMExercise = z.infer<typeof LLMExerciseSchema>
export type LLMSession = z.infer<typeof LLMSessionSchema>
export type LLMPlanResponse = z.infer<typeof LLMPlanResponseSchema>
