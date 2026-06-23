import { describe, expect, it } from 'vitest'
import type { GeneratedSession, SelectedExercise } from '@/services/exercises/sessionGenerator'
import { assertDefined } from '@/utils/assertDefined'
import {
  type BuildSessionExecutionInput,
  buildSessionExecutionModel,
} from '@/services/session/buildSessionExecutionModel'
import type { Exercise } from '@/types/exercise'
import type { ExecutedSet } from '@/types/session'

const NOW_MS = 1_700_000_000_000
const STARTED_AT = new Date(NOW_MS - 60_000).toISOString() // 60s ago

function makeExercise(id: string): Exercise {
  return {
    id,
    nameKey: `exercises:${id}`,
    primaryMuscles: ['pectoral'],
    secondaryMuscles: [],
    equipment: [],
    level: 'beginner',
    category: 'strength',
    estimatedSeriesDurationSeconds: 30,
    progressionMetric: 'reps',
    tags: [],
    restrictions: [],
    instructions: [],
    images: [],
  }
}

function makeSelected(id: string, sets: number, weightKg = 50): SelectedExercise {
  return {
    exercise: makeExercise(id),
    sets,
    reps: 10,
    weightKg,
    restSeconds: 60,
  }
}

function makeGeneratedSession(...exs: SelectedExercise[]): GeneratedSession {
  return {
    templateId: 't1',
    mesocycleId: 'm1',
    exercises: exs,
    estimatedDurationMinutes: 30,
  }
}

function makeExecutedSet(
  exerciseId: string,
  setNumber: number,
  overrides: Partial<ExecutedSet> = {}
): ExecutedSet {
  return {
    id: `set-${exerciseId}-${setNumber}`,
    sessionId: '',
    sessionTemplateId: 't1',
    date: '2026-05-04',
    exerciseId,
    setNumber,
    repsPlanned: 10,
    repsActual: 10,
    weightKgPlanned: 50,
    weightKgActual: 50,
    completedAt: new Date(NOW_MS).toISOString(),
    ...overrides,
  }
}

function baseInput(over: Partial<BuildSessionExecutionInput>): BuildSessionExecutionInput {
  return {
    generatedSession: null,
    executedSets: [],
    executionMode: 'standard',
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    currentRound: 0,
    totalRounds: 0,
    isResting: false,
    restSecondsRemaining: 0,
    sessionStartedAt: null,
    isFinished: false,
    nowMs: NOW_MS,
    ...over,
  }
}

describe('buildSessionExecutionModel', () => {
  it('returns an empty model when no generated session is present', () => {
    const m = buildSessionExecutionModel(baseInput({}))
    expect(m.exerciseBlocks).toEqual([])
    expect(m.templateId).toBeNull()
    expect(m.hud).toEqual({
      elapsedSec: 0,
      volumeKg: 0,
      setsCompleted: 0,
      setsTotal: 0,
      meanRpe: null,
    })
    expect(m.rest.isResting).toBe(false)
    expect(m.circuit).toBeNull()
    expect(m.sessionStartedAtMs).toBeNull()
  })

  it('marks all sets as pending except the cursor when no executed sets exist', () => {
    const m = buildSessionExecutionModel(
      baseInput({
        generatedSession: makeGeneratedSession(makeSelected('a', 3)),
        sessionStartedAt: STARTED_AT,
      })
    )
    const states = assertDefined(m.exerciseBlocks[0]).sets.map((s) => s.state)
    expect(states).toEqual(['active', 'pending', 'pending'])
    expect(m.hud.setsTotal).toBe(3)
  })

  it('reports the cursor set as `active` (not "resting") even while isResting=true', () => {
    const m = buildSessionExecutionModel(
      baseInput({
        generatedSession: makeGeneratedSession(makeSelected('a', 3)),
        currentSetIndex: 1,
        isResting: true,
        restSecondsRemaining: 45,
        executedSets: [makeExecutedSet('a', 1)],
        sessionStartedAt: STARTED_AT,
      })
    )
    const states = assertDefined(m.exerciseBlocks[0]).sets.map((s) => s.state)
    expect(states).toEqual(['completed', 'active', 'pending'])
    expect(m.rest).toEqual({ isResting: true, secondsRemaining: 45 })
  })

  it('derives a mix of completed/active/pending across multiple exercises', () => {
    const m = buildSessionExecutionModel(
      baseInput({
        generatedSession: makeGeneratedSession(makeSelected('a', 2), makeSelected('b', 2)),
        executedSets: [makeExecutedSet('a', 1), makeExecutedSet('a', 2)],
        currentExerciseIndex: 1,
        currentSetIndex: 0,
        sessionStartedAt: STARTED_AT,
      })
    )
    expect(assertDefined(m.exerciseBlocks[0]).sets.map((s) => s.state)).toEqual([
      'completed',
      'completed',
    ])
    expect(assertDefined(m.exerciseBlocks[1]).sets.map((s) => s.state)).toEqual([
      'active',
      'pending',
    ])
    expect(m.hud.setsCompleted).toBe(2)
  })

  it('marks an explicit skip marker as `skipped`', () => {
    const m = buildSessionExecutionModel(
      baseInput({
        generatedSession: makeGeneratedSession(makeSelected('a', 3)),
        currentSetIndex: 2,
        skippedSets: [{ exerciseIndex: 0, setIndex: 1 }],
        executedSets: [makeExecutedSet('a', 1)],
        sessionStartedAt: STARTED_AT,
      })
    )
    expect(assertDefined(m.exerciseBlocks[0]).sets.map((s) => s.state)).toEqual([
      'completed',
      'skipped',
      'active',
    ])
  })

  it('passes through circuit-mode round counter', () => {
    const m = buildSessionExecutionModel(
      baseInput({
        generatedSession: makeGeneratedSession(makeSelected('a', 3), makeSelected('b', 3)),
        executionMode: 'circuit',
        currentRound: 1,
        totalRounds: 3,
        sessionStartedAt: STARTED_AT,
      })
    )
    expect(m.circuit).toEqual({ round: 1, totalRounds: 3 })
  })

  it('computes HUD volume as sum of (weightKgActual ?? planned) × repsActual', () => {
    const m = buildSessionExecutionModel(
      baseInput({
        generatedSession: makeGeneratedSession(makeSelected('a', 3)),
        executedSets: [
          makeExecutedSet('a', 1, { repsActual: 10, weightKgActual: 50 }),
          makeExecutedSet('a', 2, { repsActual: 8, weightKgActual: 60 }),
          makeExecutedSet('a', 3, {
            repsActual: 8,
            weightKgActual: undefined,
            weightKgPlanned: 40,
          }),
        ],
        sessionStartedAt: STARTED_AT,
      })
    )
    // 10*50 + 8*60 + 8*40 = 500 + 480 + 320 = 1300
    expect(m.hud.volumeKg).toBe(1300)
    expect(m.hud.setsCompleted).toBe(3)
  })

  it('excludes warm-up sets from volumeKg', () => {
    const m = buildSessionExecutionModel(
      baseInput({
        generatedSession: makeGeneratedSession(makeSelected('a', 5)),
        executedSets: [
          // 2 warm-up sets — must NOT contribute to volume.
          makeExecutedSet('a', 1, { repsActual: 5, weightKgActual: 20, isWarmup: true }),
          makeExecutedSet('a', 2, { repsActual: 5, weightKgActual: 30, isWarmup: true }),
          // 3 work sets — only these count.
          makeExecutedSet('a', 3, { repsActual: 10, weightKgActual: 50 }),
          makeExecutedSet('a', 4, { repsActual: 8, weightKgActual: 60 }),
          makeExecutedSet('a', 5, { repsActual: 6, weightKgActual: 70 }),
        ],
        sessionStartedAt: STARTED_AT,
      })
    )
    // Work sets only: 10*50 + 8*60 + 6*70 = 500 + 480 + 420 = 1400
    expect(m.hud.volumeKg).toBe(1400)
    // setsCompleted is the raw count of logged sets (warm-ups still happened).
    expect(m.hud.setsCompleted).toBe(5)
  })

  it('returns meanRpe = null when no executed set carries an explicit RPE', () => {
    const m = buildSessionExecutionModel(
      baseInput({
        generatedSession: makeGeneratedSession(makeSelected('a', 2)),
        executedSets: [makeExecutedSet('a', 1), makeExecutedSet('a', 2)],
        sessionStartedAt: STARTED_AT,
      })
    )
    expect(m.hud.meanRpe).toBeNull()
  })

  it('averages rpe across executed sets that carry it', () => {
    const m = buildSessionExecutionModel(
      baseInput({
        generatedSession: makeGeneratedSession(makeSelected('a', 2)),
        executedSets: [makeExecutedSet('a', 1, { rpe: 7 }), makeExecutedSet('a', 2, { rpe: 9 })],
        sessionStartedAt: STARTED_AT,
      })
    )
    expect(m.hud.meanRpe).toBe(8)
  })

  it('is deterministic w.r.t. injected nowMs', () => {
    const input = baseInput({
      generatedSession: makeGeneratedSession(makeSelected('a', 2)),
      sessionStartedAt: STARTED_AT,
    })
    const a = buildSessionExecutionModel({ ...input, nowMs: NOW_MS })
    const b = buildSessionExecutionModel({ ...input, nowMs: NOW_MS })
    expect(a).toEqual(b)
    const later = buildSessionExecutionModel({ ...input, nowMs: NOW_MS + 5_000 })
    expect(later.hud.elapsedSec).toBe(a.hud.elapsedSec + 5)
  })

  it('reports isFinished=true and no active set when finished', () => {
    const m = buildSessionExecutionModel(
      baseInput({
        generatedSession: makeGeneratedSession(makeSelected('a', 2)),
        executedSets: [makeExecutedSet('a', 1), makeExecutedSet('a', 2)],
        currentSetIndex: 2, // out of range — store sets this on finish
        isFinished: true,
        sessionStartedAt: STARTED_AT,
      })
    )
    expect(m.isFinished).toBe(true)
    const states = assertDefined(m.exerciseBlocks[0]).sets.map((s) => s.state)
    expect(states).toEqual(['completed', 'completed'])
  })
})
