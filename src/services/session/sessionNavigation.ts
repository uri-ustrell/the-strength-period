import type { ExecutionMode } from '@/stores/sessionStore'

export interface NavigationInput {
  executionMode: ExecutionMode
  currentExerciseIndex: number
  currentSetIndex: number
  currentRound: number
  totalExercises: number
  currentExerciseSets: number
  allExerciseSets: number[]
}

export interface NavigationResult {
  currentExerciseIndex: number
  currentSetIndex: number
  currentRound: number
  isFinished: boolean
  isResting: boolean
  restSecondsRemaining: number
}

const CIRCUIT_REST_BETWEEN_EXERCISES = 10
const CIRCUIT_REST_BETWEEN_ROUNDS = 120

export function computeNextAfterLog(
  input: NavigationInput,
  restSecondsForExercise: number
): NavigationResult {
  const {
    executionMode,
    currentExerciseIndex,
    currentSetIndex,
    currentRound,
    totalExercises,
    currentExerciseSets,
    allExerciseSets,
  } = input

  if (executionMode === 'circuit') {
    const isLastExercise = currentExerciseIndex + 1 >= totalExercises
    const nextRound = currentRound + (isLastExercise ? 1 : 0)
    const maxSets = Math.max(...allExerciseSets)

    if (isLastExercise && nextRound >= maxSets) {
      return {
        currentExerciseIndex,
        currentSetIndex,
        currentRound,
        isFinished: true,
        isResting: false,
        restSecondsRemaining: 0,
      }
    } else if (isLastExercise) {
      return {
        currentExerciseIndex: 0,
        currentSetIndex: nextRound,
        currentRound: nextRound,
        isFinished: false,
        isResting: true,
        restSecondsRemaining: CIRCUIT_REST_BETWEEN_ROUNDS,
      }
    } else {
      return {
        currentExerciseIndex: currentExerciseIndex + 1,
        currentSetIndex,
        currentRound,
        isFinished: false,
        isResting: true,
        restSecondsRemaining: CIRCUIT_REST_BETWEEN_EXERCISES,
      }
    }
  }

  // Standard mode
  const isLastSet = currentSetIndex + 1 >= currentExerciseSets
  const isLastExercise = currentExerciseIndex + 1 >= totalExercises

  if (isLastSet && isLastExercise) {
    return {
      currentExerciseIndex,
      currentSetIndex: currentSetIndex + 1,
      currentRound,
      isFinished: true,
      isResting: false,
      restSecondsRemaining: 0,
    }
  } else if (isLastSet) {
    return {
      currentExerciseIndex: currentExerciseIndex + 1,
      currentSetIndex: 0,
      currentRound,
      isFinished: false,
      isResting: false,
      restSecondsRemaining: 0,
    }
  } else {
    return {
      currentExerciseIndex,
      currentSetIndex: currentSetIndex + 1,
      currentRound,
      isFinished: false,
      isResting: true,
      restSecondsRemaining: restSecondsForExercise,
    }
  }
}

export function computeNextAfterSkip(input: NavigationInput): NavigationResult {
  const {
    executionMode,
    currentExerciseIndex,
    currentSetIndex,
    currentRound,
    totalExercises,
    currentExerciseSets,
    allExerciseSets,
  } = input

  if (executionMode === 'circuit') {
    const isLastExercise = currentExerciseIndex + 1 >= totalExercises
    const nextRound = currentRound + (isLastExercise ? 1 : 0)
    const maxSets = Math.max(...allExerciseSets)

    if (isLastExercise && nextRound >= maxSets) {
      return {
        currentExerciseIndex,
        currentSetIndex,
        currentRound,
        isFinished: true,
        isResting: false,
        restSecondsRemaining: 0,
      }
    } else if (isLastExercise) {
      return {
        currentExerciseIndex: 0,
        currentSetIndex: nextRound,
        currentRound: nextRound,
        isFinished: false,
        isResting: false,
        restSecondsRemaining: 0,
      }
    } else {
      return {
        currentExerciseIndex: currentExerciseIndex + 1,
        currentSetIndex,
        currentRound,
        isFinished: false,
        isResting: false,
        restSecondsRemaining: 0,
      }
    }
  }

  // Standard mode
  const isLastSet = currentSetIndex + 1 >= currentExerciseSets
  const isLastExercise = currentExerciseIndex + 1 >= totalExercises

  if (isLastSet && isLastExercise) {
    return {
      currentExerciseIndex,
      currentSetIndex,
      currentRound,
      isFinished: true,
      isResting: false,
      restSecondsRemaining: 0,
    }
  } else if (isLastSet) {
    return {
      currentExerciseIndex: currentExerciseIndex + 1,
      currentSetIndex: 0,
      currentRound,
      isFinished: false,
      isResting: false,
      restSecondsRemaining: 0,
    }
  } else {
    return {
      currentExerciseIndex,
      currentSetIndex: currentSetIndex + 1,
      currentRound,
      isFinished: false,
      isResting: false,
      restSecondsRemaining: 0,
    }
  }
}
