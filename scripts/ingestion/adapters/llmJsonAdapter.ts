import type {
  CandidateEnvelope,
  ExerciseCandidateInput,
  IngestionCandidateInput,
  PresetCandidateInput,
  SourceAdapter,
  SourceRunConfig,
} from '../contracts'
import { ROOT_DIR } from '../paths'
import { loadJsonInput, slugify, toIsoTimestamp } from '../utils'

type CandidateLike = Record<string, unknown>

function isCandidateLike(value: unknown): value is CandidateLike {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function inferKind(raw: CandidateLike): 'exercise' | 'preset' {
  if (raw.kind === 'preset') {
    return 'preset'
  }

  if (raw.kind === 'exercise') {
    return 'exercise'
  }

  if (typeof raw.muscleDistribution === 'object' && raw.muscleDistribution !== null) {
    return 'preset'
  }

  return 'exercise'
}

function createStableSourceExternalId(raw: CandidateLike, fallbackSeed: string): string {
  const explicit = raw.sourceExternalId
  if (typeof explicit === 'string' && explicit.trim().length > 0) {
    return explicit.trim()
  }

  const id = raw.id
  if (typeof id === 'string' && id.trim().length > 0) {
    return id.trim()
  }

  const title = raw.title
  if (typeof title === 'string' && title.trim().length > 0) {
    const normalized = slugify(title)
    if (normalized) {
      return normalized
    }
  }

  return `candidate-${fallbackSeed}`
}

function toExercisePayload(raw: CandidateLike, sourceExternalId: string): ExerciseCandidateInput {
  const title = typeof raw.title === 'string' ? raw.title : sourceExternalId

  return {
    kind: 'exercise',
    sourceExternalId,
    title,
    aliases: toStringArray(raw.aliases),
    primaryMuscles: toStringArray(raw.primaryMuscles),
    secondaryMuscles: toStringArray(raw.secondaryMuscles),
    equipment: toStringArray(raw.equipment),
    level: typeof raw.level === 'string' ? raw.level : null,
    category: typeof raw.category === 'string' ? raw.category : null,
    estimatedSeriesDurationSeconds:
      typeof raw.estimatedSeriesDurationSeconds === 'number'
        ? raw.estimatedSeriesDurationSeconds
        : undefined,
    progressionMetric: typeof raw.progressionMetric === 'string' ? raw.progressionMetric : null,
    tags: toStringArray(raw.tags),
    restrictions: Array.isArray(raw.restrictions)
      ? raw.restrictions
          .filter(
            (value): value is Record<string, unknown> => typeof value === 'object' && value !== null
          )
          .map((value) => ({
            condition: typeof value.condition === 'string' ? value.condition : '',
            action: typeof value.action === 'string' ? value.action : '',
            note: typeof value.note === 'string' ? value.note : undefined,
          }))
      : [],
    instructions: toStringArray(raw.instructions),
    representativeImageUrl:
      typeof raw.representativeImageUrl === 'string' ? raw.representativeImageUrl : undefined,
  }
}

function toPresetPayload(raw: CandidateLike, sourceExternalId: string): PresetCandidateInput {
  const title = typeof raw.title === 'string' ? raw.title : sourceExternalId
  const muscleDistribution =
    typeof raw.muscleDistribution === 'object' && raw.muscleDistribution !== null
      ? (raw.muscleDistribution as Record<string, number>)
      : {}

  return {
    kind: 'preset',
    sourceExternalId,
    title,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    durationOptions: Array.isArray(raw.durationOptions)
      ? raw.durationOptions.filter((value): value is number => typeof value === 'number')
      : undefined,
    muscleDistribution,
    requiredTags: toStringArray(raw.requiredTags),
    autoRestrictions: toStringArray(raw.autoRestrictions),
    progressionType: typeof raw.progressionType === 'string' ? raw.progressionType : null,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    sessions: Array.isArray(raw.sessions)
      ? (raw.sessions as Array<Record<string, unknown>>).map((session) => ({
          label: typeof session.label === 'string' ? session.label : undefined,
          exercises: Array.isArray(session.exercises)
            ? (session.exercises as Array<Record<string, unknown>>).map((ex) => ({
                exerciseId: typeof ex.exerciseId === 'string' ? ex.exerciseId : '',
                sets: typeof ex.sets === 'number' ? ex.sets : undefined,
                reps: Array.isArray(ex.reps)
                  ? (() => {
                      const filtered = (ex.reps as Array<unknown>).filter(
                        (v): v is number => typeof v === 'number'
                      )
                      return filtered.length === 2
                        ? ([filtered[0], filtered[1]] as [number, number])
                        : (filtered[0] ?? undefined)
                    })()
                  : typeof ex.reps === 'number'
                    ? ex.reps
                    : undefined,
                restSeconds: typeof ex.restSeconds === 'number' ? ex.restSeconds : undefined,
                tempo: typeof ex.tempo === 'string' ? ex.tempo : undefined,
                rpe: typeof ex.rpe === 'number' ? ex.rpe : undefined,
                notes: typeof ex.notes === 'string' ? ex.notes : undefined,
              }))
            : [],
          isDeload: session.isDeload === true ? true : undefined,
        }))
      : undefined,
    weeklyProgression:
      typeof raw.weeklyProgression === 'number' ? raw.weeklyProgression : undefined,
  }
}

function normalizeLlmPayloadShape(payload: unknown): CandidateLike[] {
  if (Array.isArray(payload)) {
    return payload.filter(isCandidateLike)
  }

  if (!isCandidateLike(payload)) {
    return []
  }

  if (Array.isArray(payload.candidates)) {
    return payload.candidates.filter(isCandidateLike)
  }

  const exercises = Array.isArray(payload.exercises)
    ? payload.exercises.filter(isCandidateLike)
    : []

  const presets = Array.isArray(payload.presets) ? payload.presets.filter(isCandidateLike) : []

  return [...exercises, ...presets]
}

function toCandidatePayload(raw: CandidateLike, sourceExternalId: string): IngestionCandidateInput {
  const kind = inferKind(raw)
  return kind === 'exercise'
    ? toExercisePayload(raw, sourceExternalId)
    : toPresetPayload(raw, sourceExternalId)
}

export function buildLlmJsonCandidatesFromPayload(
  config: SourceRunConfig,
  payload: unknown,
  fetchedAt: string = toIsoTimestamp()
): CandidateEnvelope[] {
  const rawCandidates = normalizeLlmPayloadShape(payload)

  return rawCandidates.map<CandidateEnvelope>((raw, index) => {
    const sourceExternalId = createStableSourceExternalId(raw, String(index + 1))
    const candidateKind = inferKind(raw)

    return {
      candidateId: `${config.sourceId}:${candidateKind}:${sourceExternalId}`,
      source: {
        adapterId: 'llm-json',
        sourceId: config.sourceId,
        sourceType: config.sourceType,
        sourceUrl: config.sourceUrl,
        fetchedAt,
      },
      license: config.license,
      payload: toCandidatePayload(raw, sourceExternalId),
    }
  })
}

export const llmJsonAdapter: SourceAdapter = {
  id: 'llm-json',
  description: 'Reads LLM JSON artifacts and maps them to exercise/preset candidates.',
  fetchCandidates: async (config: SourceRunConfig) => {
    const payload = await loadJsonInput<unknown>(config.input, ROOT_DIR)
    return buildLlmJsonCandidatesFromPayload(config, payload)
  },
}
