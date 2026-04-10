import type {
  CanonicalExercise,
  CanonicalPreset,
  NormalizedCandidate,
  SourceLicenseMetadata,
  ValidationResult,
} from './contracts'
import {
  CANONICAL_CATEGORIES,
  CANONICAL_EQUIPMENT,
  CANONICAL_EXERCISE_TAGS,
  CANONICAL_LEVELS,
  CANONICAL_MUSCLE_GROUPS,
  CANONICAL_PROGRESSION_METRICS,
  CANONICAL_PROGRESSION_TYPES,
  CANONICAL_RESTRICTION_CONDITIONS,
} from './contracts'

const MUSCLE_GROUP_SET = new Set<string>(CANONICAL_MUSCLE_GROUPS)
const EQUIPMENT_SET = new Set<string>(CANONICAL_EQUIPMENT)
const TAG_SET = new Set<string>(CANONICAL_EXERCISE_TAGS)
const RESTRICTION_SET = new Set<string>(CANONICAL_RESTRICTION_CONDITIONS)
const LEVEL_SET = new Set<string>(CANONICAL_LEVELS)
const CATEGORY_SET = new Set<string>(CANONICAL_CATEGORIES)
const METRIC_SET = new Set<string>(CANONICAL_PROGRESSION_METRICS)
const PROGRESSION_TYPE_SET = new Set<string>(CANONICAL_PROGRESSION_TYPES)

function pushError(result: ValidationResult, field: string, message: string): void {
  result.errors.push({ field, message })
}

function pushWarning(result: ValidationResult, field: string, message: string): void {
  result.warnings.push({ field, message })
}

function createResult(): ValidationResult {
  return {
    errors: [],
    warnings: [],
  }
}

export function validateLicenseMetadata(license: SourceLicenseMetadata): ValidationResult {
  const result = createResult()

  if (!license.licenseName.trim()) {
    pushError(result, 'license.licenseName', 'License name is required.')
  }

  if (!license.provenance.trim()) {
    pushError(result, 'license.provenance', 'License provenance note is required.')
  }

  if (!license.verifiedBy.trim()) {
    pushError(result, 'license.verifiedBy', 'License verification owner is required.')
  }

  if (!license.verifiedAt.trim()) {
    pushError(result, 'license.verifiedAt', 'License verification timestamp is required.')
  }

  if (!license.allowsRedistribution) {
    pushError(
      result,
      'license.allowsRedistribution',
      'Source license must explicitly allow redistribution before merge.'
    )
  }

  if (license.requiresAttribution && !license.attributionText?.trim()) {
    pushError(
      result,
      'license.attributionText',
      'Attribution text is required when license.requiresAttribution is true.'
    )
  }

  if (!license.allowsCommercialUse) {
    pushWarning(
      result,
      'license.allowsCommercialUse',
      'Source does not allow commercial use. Verify this matches project distribution intent.'
    )
  }

  return result
}

function validateCanonicalExercise(exercise: CanonicalExercise): ValidationResult {
  const result = createResult()

  if (!exercise.id.trim()) {
    pushError(result, 'exercise.id', 'Exercise id is required.')
  }

  if (!exercise.nameKey.startsWith('exercises:')) {
    pushError(result, 'exercise.nameKey', 'Exercise nameKey must start with "exercises:".')
  }

  if (exercise.primaryMuscles.length === 0) {
    pushError(result, 'exercise.primaryMuscles', 'At least one primary muscle is required.')
  }

  for (const muscle of exercise.primaryMuscles) {
    if (!MUSCLE_GROUP_SET.has(muscle)) {
      pushError(result, 'exercise.primaryMuscles', `Unknown primary muscle: ${muscle}`)
    }
  }

  for (const muscle of exercise.secondaryMuscles) {
    if (!MUSCLE_GROUP_SET.has(muscle)) {
      pushError(result, 'exercise.secondaryMuscles', `Unknown secondary muscle: ${muscle}`)
    }
  }

  if (exercise.equipment.length === 0) {
    pushError(result, 'exercise.equipment', 'At least one equipment item is required.')
  }

  for (const equipment of exercise.equipment) {
    if (!EQUIPMENT_SET.has(equipment)) {
      pushError(result, 'exercise.equipment', `Unknown equipment: ${equipment}`)
    }
  }

  if (!LEVEL_SET.has(exercise.level)) {
    pushError(result, 'exercise.level', `Unknown level: ${exercise.level}`)
  }

  if (!CATEGORY_SET.has(exercise.category)) {
    pushError(result, 'exercise.category', `Unknown category: ${exercise.category}`)
  }

  if (!METRIC_SET.has(exercise.progressionMetric)) {
    pushError(
      result,
      'exercise.progressionMetric',
      `Unknown progression metric: ${exercise.progressionMetric}`
    )
  }

  if (
    !Number.isFinite(exercise.estimatedSeriesDurationSeconds) ||
    exercise.estimatedSeriesDurationSeconds < 10 ||
    exercise.estimatedSeriesDurationSeconds > 600
  ) {
    pushError(
      result,
      'exercise.estimatedSeriesDurationSeconds',
      'Estimated series duration must be between 10 and 600 seconds.'
    )
  }

  for (const tag of exercise.tags) {
    if (!TAG_SET.has(tag)) {
      pushError(result, 'exercise.tags', `Unknown tag: ${tag}`)
    }
  }

  for (const restriction of exercise.restrictions) {
    if (!RESTRICTION_SET.has(restriction.condition)) {
      pushError(
        result,
        'exercise.restrictions.condition',
        `Unknown restriction condition: ${restriction.condition}`
      )
    }

    if (restriction.action !== 'avoid' && restriction.action !== 'modify') {
      pushError(
        result,
        'exercise.restrictions.action',
        `Invalid restriction action: ${restriction.action}`
      )
    }
  }

  if (exercise.instructions.length === 0) {
    pushError(result, 'exercise.instructions', 'At least one instruction is required.')
  }

  const representativeImages = exercise.images.filter((image) => image.isRepresentative)
  if (representativeImages.length !== 1) {
    pushError(
      result,
      'exercise.images',
      'Exercise must contain exactly one representative image (isRepresentative=true).'
    )
  }

  for (const image of exercise.images) {
    if (!image.url.trim()) {
      pushError(result, 'exercise.images.url', 'Image URL must not be empty.')
    }
    if (!image.alt.trim()) {
      pushWarning(result, 'exercise.images.alt', 'Image alt text is empty.')
    }
  }

  return result
}

function validateCanonicalPreset(preset: CanonicalPreset): ValidationResult {
  const result = createResult()

  if (!preset.id.trim()) {
    pushError(result, 'preset.id', 'Preset id is required.')
  }

  if (preset.durationOptions.length === 0) {
    pushError(result, 'preset.durationOptions', 'Preset requires at least one duration option.')
  }

  for (const duration of preset.durationOptions) {
    if (!Number.isInteger(duration) || duration <= 0 || duration > 52) {
      pushError(
        result,
        'preset.durationOptions',
        `Invalid duration option: ${duration}. Expected integer between 1 and 52.`
      )
    }
  }

  const hasSessions = preset.sessions && preset.sessions.length > 0

  if (!hasSessions) {
    const distributionEntries = Object.entries(preset.muscleDistribution ?? {})
    if (distributionEntries.length === 0) {
      pushError(
        result,
        'preset.muscleDistribution',
        'Preset requires at least one muscle distribution entry.'
      )
    }

    let distributionTotal = 0
    for (const [muscle, value] of distributionEntries) {
      distributionTotal += value
      if (!MUSCLE_GROUP_SET.has(muscle)) {
        pushError(
          result,
          'preset.muscleDistribution',
          `Unknown muscle group in distribution: ${muscle}`
        )
      }
      if (!Number.isFinite(value) || value <= 0) {
        pushError(
          result,
          'preset.muscleDistribution',
          `Invalid distribution value for ${muscle}: ${value}.`
        )
      }
    }

    if (distributionTotal < 95 || distributionTotal > 105) {
      pushWarning(
        result,
        'preset.muscleDistribution',
        `Muscle distribution sums to ${distributionTotal}; expected approximately 100.`
      )
    }
  }

  for (const tag of preset.requiredTags) {
    if (!TAG_SET.has(tag)) {
      pushError(result, 'preset.requiredTags', `Unknown required tag: ${tag}`)
    }
  }

  for (const restriction of preset.autoRestrictions) {
    if (!RESTRICTION_SET.has(restriction)) {
      pushError(result, 'preset.autoRestrictions', `Unknown auto restriction: ${restriction}`)
    }
  }

  if (!PROGRESSION_TYPE_SET.has(preset.progressionType)) {
    pushError(
      result,
      'preset.progressionType',
      `Unknown progression type: ${preset.progressionType}`
    )
  }

  if (preset.weeklyProgression !== undefined) {
    if (!Number.isInteger(preset.weeklyProgression)) {
      pushError(
        result,
        'preset.weeklyProgression',
        `weeklyProgression must be an integer, got ${preset.weeklyProgression}.`
      )
    }
    if (preset.weeklyProgression < 0 || preset.weeklyProgression > 10) {
      pushError(
        result,
        'preset.weeklyProgression',
        `weeklyProgression must be between 0 and 10, got ${preset.weeklyProgression}.`
      )
    }
  }

  if (preset.sessions) {
    if (preset.sessions.length === 0) {
      pushWarning(result, 'preset.sessions', 'Preset sessions array is present but empty.')
    }

    for (const [sessionIndex, session] of preset.sessions.entries()) {
      const prefix = `preset.sessions[${sessionIndex}]`

      if (session.exercises.length === 0) {
        pushError(result, `${prefix}.exercises`, 'Session must have at least one exercise.')
      }

      for (const [exerciseIndex, exercise] of session.exercises.entries()) {
        const exPrefix = `${prefix}.exercises[${exerciseIndex}]`

        if (!exercise.exerciseId.trim()) {
          pushError(result, `${exPrefix}.exerciseId`, 'Exercise id must not be empty.')
        }

        if (!Number.isInteger(exercise.sets) || exercise.sets <= 0 || exercise.sets > 10) {
          pushError(
            result,
            `${exPrefix}.sets`,
            `Invalid sets: ${exercise.sets}. Expected integer between 1 and 10.`
          )
        }

        if (Array.isArray(exercise.reps)) {
          const [lo, hi] = exercise.reps
          if (lo <= 0 || hi <= 0 || lo > hi) {
            pushError(result, `${exPrefix}.reps`, `Invalid rep range: [${lo}, ${hi}].`)
          }
          if (lo > 30 || hi > 30) {
            pushError(result, `${exPrefix}.reps`, `reps exceeds maximum 30`)
          }
        } else if (typeof exercise.reps === 'number') {
          if (!Number.isInteger(exercise.reps) || exercise.reps <= 0) {
            pushError(
              result,
              `${exPrefix}.reps`,
              `Invalid reps: ${exercise.reps}. Expected positive integer.`
            )
          }
          if (exercise.reps > 30) {
            pushError(result, `${exPrefix}.reps`, `reps exceeds maximum 30`)
          }
        }

        if (exercise.restSeconds < 0) {
          pushError(
            result,
            `${exPrefix}.restSeconds`,
            `Invalid restSeconds: ${exercise.restSeconds}. Must be >= 0.`
          )
        }

        if (exercise.restSeconds > 600) {
          pushError(result, `${exPrefix}.restSeconds`, `restSeconds exceeds maximum 600`)
        }

        if (exercise.tempo !== undefined && !/^\d+-\d+-\d+-\d+$/.test(exercise.tempo)) {
          pushError(
            result,
            `${exPrefix}.tempo`,
            `Invalid tempo format: "${exercise.tempo}". Expected "d-d-d-d" (e.g. "3-1-0-1").`
          )
        }

        if (exercise.rpe !== undefined && (exercise.rpe < 1 || exercise.rpe > 10)) {
          pushError(result, `${exPrefix}.rpe`, `Invalid RPE: ${exercise.rpe}. Expected 1-10.`)
        }
      }
    }
  }

  return result
}

export function validateNormalizedCandidate(candidate: NormalizedCandidate): ValidationResult {
  return candidate.kind === 'exercise'
    ? validateCanonicalExercise(candidate.canonical)
    : validateCanonicalPreset(candidate.canonical)
}

export function validatePresetExerciseReferences(
  preset: CanonicalPreset,
  validExerciseIds: Set<string>
): ValidationResult {
  const result = createResult()

  if (preset.sessions) {
    for (const [sessionIndex, session] of preset.sessions.entries()) {
      for (const [exerciseIndex, exercise] of session.exercises.entries()) {
        if (!validExerciseIds.has(exercise.exerciseId)) {
          pushError(
            result,
            `preset.sessions[${sessionIndex}].exercises[${exerciseIndex}].exerciseId`,
            `Preset references unknown exercise id "${exercise.exerciseId}".`
          )
        }
      }
    }
  }

  return result
}
