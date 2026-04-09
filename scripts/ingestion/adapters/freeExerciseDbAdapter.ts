import type {
  CandidateEnvelope,
  ExerciseCandidateInput,
  SourceAdapter,
  SourceRunConfig,
} from '../contracts'
import { ROOT_DIR } from '../paths'
import { loadJsonInput, toIsoTimestamp, uniqueArray } from '../utils'

type RawFreeExerciseDbExercise = {
  id: string
  name: string
  force: string | null
  level: string
  mechanic: string | null
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string
  images?: string[]
}

function inferProgressionMetric(raw: RawFreeExerciseDbExercise): string {
  const equipment = raw.equipment?.toLowerCase() ?? ''
  const category = raw.category?.toLowerCase() ?? ''

  if (!equipment || equipment === 'body only') {
    if (category.includes('stretch') || category.includes('mobility')) {
      return 'seconds'
    }
    return 'reps'
  }

  return 'weight'
}

function inferCategory(raw: string): string {
  const normalized = raw.toLowerCase()

  if (normalized.includes('plyo')) return 'plyometrics'
  if (normalized.includes('stretch') || normalized.includes('mobility')) return 'mobility'
  if (normalized.includes('cardio')) return 'cardio'
  if (normalized.includes('stability') || normalized.includes('balance')) return 'stability'

  return 'strength'
}

function buildExercisePayload(
  raw: RawFreeExerciseDbExercise,
  config: SourceRunConfig
): ExerciseCandidateInput {
  const options = config.options ?? {}
  const defaultSetDuration =
    typeof options.defaultSetDurationSeconds === 'number' && options.defaultSetDurationSeconds > 0
      ? options.defaultSetDurationSeconds
      : 40

  const defaultTags = Array.isArray(options.defaultTags)
    ? options.defaultTags.filter((value): value is string => typeof value === 'string')
    : []

  return {
    kind: 'exercise',
    sourceExternalId: raw.id,
    title: raw.name,
    aliases: uniqueArray([raw.name, raw.id]),
    primaryMuscles: raw.primaryMuscles,
    secondaryMuscles: raw.secondaryMuscles,
    equipment: raw.equipment ? [raw.equipment] : ['body only'],
    level: raw.level,
    category: inferCategory(raw.category),
    estimatedSeriesDurationSeconds: defaultSetDuration,
    progressionMetric: inferProgressionMetric(raw),
    tags: defaultTags,
    restrictions: [],
    instructions: raw.instructions,
  }
}

export const freeExerciseDbAdapter: SourceAdapter = {
  id: 'free-exercise-db',
  description: 'Reads free-exercise-db payloads from local JSON files or URLs.',
  fetchCandidates: async (config) => {
    const rawExercises = await loadJsonInput<RawFreeExerciseDbExercise[]>(config.input, ROOT_DIR)
    const fetchedAt = toIsoTimestamp()

    return rawExercises.map<CandidateEnvelope>((raw) => ({
      candidateId: `${config.sourceId}:exercise:${raw.id}`,
      source: {
        adapterId: 'free-exercise-db',
        sourceId: config.sourceId,
        sourceType: config.sourceType,
        sourceUrl: config.sourceUrl,
        fetchedAt,
      },
      license: config.license,
      payload: buildExercisePayload(raw, config),
    }))
  },
}
