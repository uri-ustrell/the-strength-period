import { describe, expect, it } from 'vitest'
import { GeminiPlanSchema, LLMPlanResponseSchema } from './planSchema'

function makeGeminiTarget(overrides: Record<string, unknown> = {}) {
  return {
    muscleGroup: 'quadriceps',
    percentageOfSession: 100,
    sets: 3,
    reps: [8, 12],
    rpe: 7,
    restSeconds: 90,
    ...overrides,
  }
}

function makeGeminiPlan(targetOverrides: Record<string, unknown> = {}) {
  return {
    mesocycle: {
      name: 'Test Plan',
      durationWeeks: 4,
      weeks: [
        {
          weekNumber: 1,
          focus: 'Hypertrophy',
          loadPercentage: 70,
          sessions: [
            {
              dayOfWeek: 1,
              durationMinutes: 60,
              muscleGroupTargets: [makeGeminiTarget(targetOverrides)],
            },
          ],
        },
      ],
    },
  }
}

function makeLLMExercise(overrides: Record<string, unknown> = {}) {
  return {
    exerciseId: 'ex_001',
    sets: 3,
    reps: [8, 12],
    rpe: 7,
    restSeconds: 90,
    ...overrides,
  }
}

function makeLLMPlan(exerciseOverrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Plan',
    durationWeeks: 4,
    sessions: [
      {
        weekNumber: 1,
        dayOfWeek: 1,
        durationMinutes: 60,
        exercises: [makeLLMExercise(exerciseOverrides)],
      },
    ],
  }
}

describe('GeminiPlanSchema', () => {
  it('accepts a valid plan', () => {
    expect(GeminiPlanSchema.safeParse(makeGeminiPlan()).success).toBe(true)
  })

  it('rejects an invalid muscleGroup', () => {
    expect(GeminiPlanSchema.safeParse(makeGeminiPlan({ muscleGroup: 'chest' })).success).toBe(false)
  })

  it('rejects scalar reps (tuple required)', () => {
    expect(GeminiPlanSchema.safeParse(makeGeminiPlan({ reps: 10 })).success).toBe(false)
  })

  it('rejects rpe below 5', () => {
    expect(GeminiPlanSchema.safeParse(makeGeminiPlan({ rpe: 4 })).success).toBe(false)
  })

  it('rejects rpe above 10', () => {
    expect(GeminiPlanSchema.safeParse(makeGeminiPlan({ rpe: 11 })).success).toBe(false)
  })

  it('rejects restSeconds below 30', () => {
    expect(GeminiPlanSchema.safeParse(makeGeminiPlan({ restSeconds: 20 })).success).toBe(false)
  })

  it('rejects restSeconds above 180', () => {
    expect(GeminiPlanSchema.safeParse(makeGeminiPlan({ restSeconds: 200 })).success).toBe(false)
  })

  it('rejects reps with min > max', () => {
    expect(GeminiPlanSchema.safeParse(makeGeminiPlan({ reps: [12, 8] })).success).toBe(false)
  })
})

describe('LLMPlanResponseSchema', () => {
  it('accepts a valid plan', () => {
    expect(LLMPlanResponseSchema.safeParse(makeLLMPlan()).success).toBe(true)
  })

  it('accepts scalar reps', () => {
    expect(LLMPlanResponseSchema.safeParse(makeLLMPlan({ reps: 10 })).success).toBe(true)
  })

  it('rejects rpe below 5', () => {
    expect(LLMPlanResponseSchema.safeParse(makeLLMPlan({ rpe: 4 })).success).toBe(false)
  })

  it('rejects rpe above 10', () => {
    expect(LLMPlanResponseSchema.safeParse(makeLLMPlan({ rpe: 11 })).success).toBe(false)
  })

  it('rejects empty exerciseId', () => {
    expect(LLMPlanResponseSchema.safeParse(makeLLMPlan({ exerciseId: '' })).success).toBe(false)
  })

  it('rejects restSeconds out of range', () => {
    expect(LLMPlanResponseSchema.safeParse(makeLLMPlan({ restSeconds: 20 })).success).toBe(false)
  })

  it('rejects invalid dayOfWeek', () => {
    const plan = {
      name: 'Test Plan',
      durationWeeks: 4,
      sessions: [{ weekNumber: 1, dayOfWeek: 8, durationMinutes: 60, exercises: [makeLLMExercise()] }],
    }
    expect(LLMPlanResponseSchema.safeParse(plan).success).toBe(false)
  })

  it('rejects reps with min > max', () => {
    expect(LLMPlanResponseSchema.safeParse(makeLLMPlan({ reps: [12, 8] })).success).toBe(false)
  })
})
