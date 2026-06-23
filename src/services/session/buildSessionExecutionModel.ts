import type { GeneratedSession, SelectedExercise } from '@/services/exercises/sessionGenerator'
import type { ExecutionMode } from '@/stores/sessionStore'
import type { Exercise } from '@/types/exercise'
import type { ExecutedSet } from '@/types/session'

/**
 * Shared session-execution model. The single source of truth for
 * session-execution rendering. Pure function: zero React, zero IO, zero
 * `matchMedia`, zero direct store reads. `nowMs` is injected so callers control
 * the clock (deterministic in tests, fresh in production).
 */

export type SetExecutionState = 'pending' | 'active' | 'completed' | 'skipped'

/** Coordinate identifying a single set inside the generated session. */
export type SkippedSetMarker = {
  exerciseIndex: number
  setIndex: number
}

export type SetNode = {
  /** 0-based set index inside its exercise block (matches `currentSetIndex`). */
  setIndex: number
  /** 1-based set number for display (matches `ExecutedSet.setNumber`). */
  setNumber: number
  state: SetExecutionState
  /** The matching `ExecutedSet` when `state === 'completed'`, otherwise null. */
  loggedSet: ExecutedSet | null
}

export type ExerciseBlock = {
  /** 0-based index inside `generatedSession.exercises`. */
  exerciseIndex: number
  exercise: Exercise
  weightKg: number | undefined
  reps: number | [number, number]
  restSeconds: number
  sets: SetNode[]
}

export type RestState = {
  isResting: boolean
  /** Always >= 0; `0` whenever `isResting === false`. */
  secondsRemaining: number
}

export type SessionHud = {
  /** Whole seconds since `sessionStartedAt`; clamped at 0. */
  elapsedSec: number
  /** Sum of `weightKgActual ?? weightKgPlanned ?? 0` × `repsActual` over executed sets. */
  volumeKg: number
  setsCompleted: number
  setsTotal: number
  /** Mean RPE across executed sets that carry an explicit `rpe`; `null` otherwise. */
  meanRpe: number | null
}

export type SessionExecutionModel = {
  templateId: string | null
  exerciseBlocks: ExerciseBlock[]
  /** Pass-through of the navigation cursor; renderers may use it for focus. */
  currentExerciseIndex: number
  currentSetIndex: number
  rest: RestState
  hud: SessionHud
  /** Present only in circuit mode; null in standard mode. */
  circuit: { round: number; totalRounds: number } | null
  isFinished: boolean
  /** Epoch ms of session start (parsed once); null when not started. */
  sessionStartedAtMs: number | null
}

export type BuildSessionExecutionInput = {
  generatedSession: GeneratedSession | null
  executedSets: ReadonlyArray<ExecutedSet>
  executionMode: ExecutionMode
  currentExerciseIndex: number
  currentSetIndex: number
  currentRound: number
  totalRounds: number
  isResting: boolean
  restSecondsRemaining: number
  sessionStartedAt: string | null
  isFinished: boolean
  /**
   * Explicit per-set skip markers. The store does not yet persist these (the
   * `skipSet` action only advances navigation), so callers typically pass
   * `[]`. The shape is in place so renderers and a future explicit-skip
   * marker can reuse the same model without touching this contract.
   */
  skippedSets?: ReadonlyArray<SkippedSetMarker>
  /** Caller-injected clock. Required (no implicit `Date.now()`). */
  nowMs: number
}

const EMPTY_HUD: SessionHud = {
  elapsedSec: 0,
  volumeKg: 0,
  setsCompleted: 0,
  setsTotal: 0,
  meanRpe: null,
}

function emptyModel(input: BuildSessionExecutionInput): SessionExecutionModel {
  return {
    templateId: null,
    exerciseBlocks: [],
    currentExerciseIndex: input.currentExerciseIndex,
    currentSetIndex: input.currentSetIndex,
    rest: { isResting: false, secondsRemaining: 0 },
    hud: EMPTY_HUD,
    circuit: null,
    isFinished: input.isFinished,
    sessionStartedAtMs: null,
  }
}

function buildSetNodesForExercise(
  exerciseIndex: number,
  selected: SelectedExercise,
  executedSets: ReadonlyArray<ExecutedSet>,
  skippedSets: ReadonlyArray<SkippedSetMarker>,
  cursor: { exerciseIndex: number; setIndex: number; isResting: boolean; isFinished: boolean }
): SetNode[] {
  const completedBySetNumber = new Map<number, ExecutedSet>()
  for (const set of executedSets) {
    if (set.exerciseId !== selected.exercise.id) continue
    // If the same exercise id appears twice in a session (rare), the most
    // recently logged set wins for that setNumber. Sequential logging means
    // collisions are essentially impossible in normal flow.
    completedBySetNumber.set(set.setNumber, set)
  }
  const skippedSetIndexes = new Set<number>()
  for (const marker of skippedSets) {
    if (marker.exerciseIndex === exerciseIndex) {
      skippedSetIndexes.add(marker.setIndex)
    }
  }

  const nodes: SetNode[] = []
  for (let setIndex = 0; setIndex < selected.sets; setIndex += 1) {
    const setNumber = setIndex + 1
    const logged = completedBySetNumber.get(setNumber) ?? null

    let state: SetExecutionState
    if (logged) {
      // Rule 1: matching ExecutedSet → completed.
      state = 'completed'
    } else if (skippedSetIndexes.has(setIndex)) {
      // Rule 2: explicit skip marker → skipped.
      state = 'skipped'
    } else if (
      !cursor.isFinished &&
      cursor.exerciseIndex === exerciseIndex &&
      cursor.setIndex === setIndex
    ) {
      // Rule 3: matches navigation cursor → active (even while resting; the
      // active set does NOT change to a separate "resting" state — see Phase
      // C Shared Contracts → Per-Set State Model).
      state = 'active'
    } else {
      // Rule 4: ambiguous past sets → pending (NEVER speculatively skipped).
      state = 'pending'
    }

    nodes.push({ setIndex, setNumber, state, loggedSet: logged })
  }
  return nodes
}

function computeHud(
  blocks: ExerciseBlock[],
  executedSets: ReadonlyArray<ExecutedSet>,
  sessionStartedAtMs: number | null,
  nowMs: number
): SessionHud {
  let setsTotal = 0
  for (const block of blocks) setsTotal += block.sets.length

  let volumeKg = 0
  let rpeSum = 0
  let rpeCount = 0
  for (const set of executedSets) {
    // Warm-ups excluded from mean RPE
    if (set.isWarmup === true) continue
    const weight = set.weightKgActual ?? set.weightKgPlanned ?? 0
    volumeKg += weight * set.repsActual
    if (typeof set.rpe === 'number') {
      rpeSum += set.rpe
      rpeCount += 1
    }
  }

  const elapsedSec =
    sessionStartedAtMs !== null ? Math.max(0, Math.floor((nowMs - sessionStartedAtMs) / 1000)) : 0

  return {
    elapsedSec,
    volumeKg,
    setsCompleted: executedSets.length,
    setsTotal,
    meanRpe: rpeCount > 0 ? rpeSum / rpeCount : null,
  }
}

/**
 * Pure selector that turns the current session-store slice + clock into the
 * canonical {@link SessionExecutionModel}. Renderers never derive state from
 * `variant` — both `retro-platformer` and `classic-boring` consume the same
 * model.
 */
export function buildSessionExecutionModel(
  input: BuildSessionExecutionInput
): SessionExecutionModel {
  const { generatedSession } = input
  if (!generatedSession) return emptyModel(input)

  const skippedSets = input.skippedSets ?? []
  const cursor = {
    exerciseIndex: input.currentExerciseIndex,
    setIndex: input.currentSetIndex,
    isResting: input.isResting,
    isFinished: input.isFinished,
  }

  const exerciseBlocks: ExerciseBlock[] = generatedSession.exercises.map((selected, idx) => ({
    exerciseIndex: idx,
    exercise: selected.exercise,
    weightKg: selected.weightKg,
    reps: selected.reps,
    restSeconds: selected.restSeconds,
    sets: buildSetNodesForExercise(idx, selected, input.executedSets, skippedSets, cursor),
  }))

  const sessionStartedAtMs =
    input.sessionStartedAt !== null ? Date.parse(input.sessionStartedAt) : null

  const hud = computeHud(exerciseBlocks, input.executedSets, sessionStartedAtMs, input.nowMs)

  return {
    templateId: generatedSession.templateId,
    exerciseBlocks,
    currentExerciseIndex: input.currentExerciseIndex,
    currentSetIndex: input.currentSetIndex,
    rest: {
      isResting: input.isResting,
      secondsRemaining: input.isResting ? Math.max(0, input.restSecondsRemaining) : 0,
    },
    hud,
    circuit:
      input.executionMode === 'circuit'
        ? { round: input.currentRound, totalRounds: input.totalRounds }
        : null,
    isFinished: input.isFinished,
    sessionStartedAtMs,
  }
}
