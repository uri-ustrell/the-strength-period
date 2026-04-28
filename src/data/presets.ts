import { ALL_MUSCLE_GROUPS } from '@/data/muscleGroups'
import type { ExerciseTag, MuscleGroup } from '@/types/exercise'
import type {
  PresetExerciseEntry,
  PresetSessionTemplate,
  ProgressionType,
  WeekProgressionRate,
} from '@/types/planning'
import presetCatalog from '../../data/ingestion/presets/catalog.json'

export interface CustomPreset {
  id: string
  name: string
  durationWeeks: number
  muscleDistribution: Partial<Record<MuscleGroup, number>>
  sessions?: PresetSessionTemplate[]
  weeklyProgression?: number
  weeklyProgressionRates?: WeekProgressionRate[]
  progressionType?: ProgressionType
  createdAt: string
}

export interface Preset {
  id: string
  nameKey: string
  descriptionKey: string
  durationOptions: number[]
  muscleDistribution: Partial<Record<MuscleGroup, number>>
  requiredTags: ExerciseTag[]
  autoRestrictions: string[]
  progressionType: ProgressionType
  notes?: string
  sessions?: PresetSessionTemplate[]
  weeklyProgression?: number
  weeklyProgressionRates?: WeekProgressionRate[]
  restSecondsDefault?: number
  defaultTempo?: string
  maxSetsPerExercise?: number
}

export const HARDCODED_PRESETS: Preset[] = [
  {
    id: 'corredor_general',
    nameKey: 'planning:presets.corredor_general',
    descriptionKey: 'planning:presets.corredor_general_desc',
    durationOptions: [6, 8, 12],
    muscleDistribution: {
      glutis: 30,
      quadriceps: 25,
      isquiotibials: 20,
      bessons: 10,
      abdominal: 15,
    },
    requiredTags: ['corredor'],
    autoRestrictions: [],
    progressionType: 'linear',
  },
  {
    id: 'pujada',
    nameKey: 'planning:presets.pujada',
    descriptionKey: 'planning:presets.pujada_desc',
    durationOptions: [6, 8],
    muscleDistribution: { glutis: 35, quadriceps: 30, psoes: 10, bessons: 10, abdominal: 15 },
    requiredTags: ['pujada'],
    autoRestrictions: [],
    progressionType: 'linear',
  },
  {
    id: 'rehab_tendinitis_anserina',
    nameKey: 'planning:presets.rehab_tendinitis_anserina',
    descriptionKey: 'planning:presets.rehab_tendinitis_anserina_desc',
    durationOptions: [8, 12],
    muscleDistribution: {
      isquiotibials: 25,
      adductors: 20,
      quadriceps: 20,
      glutis: 20,
      mobilitat_cadera: 15,
    },
    requiredTags: ['tendinitis_anserina'],
    autoRestrictions: ['tendinitis_anserina'],
    progressionType: 'linear',
  },
  {
    id: 'forca_general',
    nameKey: 'planning:presets.forca_general',
    descriptionKey: 'planning:presets.forca_general_desc',
    durationOptions: [8, 12],
    muscleDistribution: {
      quadriceps: 15,
      glutis: 15,
      isquiotibials: 10,
      pectoral: 12,
      dorsal: 13,
      abdominal: 15,
      mobilitat_cadera: 10,
      deltoides: 10,
    },
    requiredTags: [],
    autoRestrictions: [],
    progressionType: 'undulating',
  },
  {
    id: 'mobilitat_prevencio',
    nameKey: 'planning:presets.mobilitat_prevencio',
    descriptionKey: 'planning:presets.mobilitat_prevencio_desc',
    durationOptions: [4, 6, 8],
    muscleDistribution: {
      mobilitat_cadera: 25,
      mobilitat_toracica: 20,
      mobilitat_turmell: 15,
      estabilitzadors_cadera: 20,
      fascies: 10,
      abdominal: 10,
    },
    requiredTags: ['mobilitat'],
    autoRestrictions: [],
    progressionType: 'linear',
  },
]

type ParsedCatalogPreset = {
  id: string
  nameKey?: string
  descriptionKey?: string
  durationOptions?: number[]
  muscleDistribution?: Partial<Record<MuscleGroup, number>>
  requiredTags?: ExerciseTag[]
  autoRestrictions?: string[]
  progressionType?: ProgressionType
  notes?: string
  sessions?: PresetSessionTemplate[]
  weeklyProgression?: number
  restSecondsDefault?: number
  defaultTempo?: string
  maxSetsPerExercise?: number
}

const EXERCISE_TAGS: ExerciseTag[] = [
  'corredor',
  'pujada',
  'baixada',
  'velocitat',
  'rehab_genoll',
  'rehab_turmell',
  'rehab_lumbar',
  'tendinitis_rotuliana',
  'tendinitis_anserina',
  'core_estabilitat',
  'equilibri',
  'pliometria',
  'mobilitat',
  'escalfament',
  'tornada_calma',
]

const EXERCISE_TAG_SET = new Set<ExerciseTag>(EXERCISE_TAGS)
const MUSCLE_GROUP_SET = new Set<MuscleGroup>(ALL_MUSCLE_GROUPS)
const PROGRESSION_TYPE_SET = new Set<ProgressionType>(['linear', 'undulating', 'block'])
const HARDCODED_PRESET_ORDER = HARDCODED_PRESETS.map((preset) => preset.id)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function toSortedUniqueNumbers(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized = [...new Set(value.filter((item): item is number => typeof item === 'number'))]
    .filter((item) => Number.isFinite(item) && item > 0)
    .sort((left, right) => left - right)

  return normalized
}

function toUniqueStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const values: string[] = []

  for (const rawItem of value) {
    const item = toTrimmedString(rawItem)
    if (!item || values.includes(item)) {
      continue
    }
    values.push(item)
  }

  return values
}

function toCatalogMuscleDistribution(value: unknown): Partial<Record<MuscleGroup, number>> {
  if (!isRecord(value)) {
    return {}
  }

  const distribution: Partial<Record<MuscleGroup, number>> = {}

  for (const [muscleGroup, percentage] of Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    if (!MUSCLE_GROUP_SET.has(muscleGroup as MuscleGroup)) {
      continue
    }

    if (typeof percentage !== 'number' || !Number.isFinite(percentage) || percentage <= 0) {
      continue
    }

    distribution[muscleGroup as MuscleGroup] = percentage
  }

  return distribution
}

function toCatalogRequiredTags(value: unknown): ExerciseTag[] {
  const tags = toUniqueStringArray(value)
    .filter((tag): tag is ExerciseTag => EXERCISE_TAG_SET.has(tag as ExerciseTag))
    .sort((left, right) => left.localeCompare(right))

  return tags
}

function toCatalogProgressionType(value: unknown): ProgressionType | undefined {
  const progressionType = toTrimmedString(value)
  if (!progressionType) {
    return undefined
  }

  return PROGRESSION_TYPE_SET.has(progressionType as ProgressionType)
    ? (progressionType as ProgressionType)
    : undefined
}

function toOptionalNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (value < min || value > max) return undefined
  return value
}

function parsePresetExerciseEntry(value: unknown): PresetExerciseEntry | undefined {
  if (!isRecord(value)) return undefined
  const exerciseId = toTrimmedString(value.exerciseId)
  if (!exerciseId) return undefined

  const sets = typeof value.sets === 'number' && value.sets > 0 ? value.sets : undefined
  if (!sets) return undefined

  let reps: number | [number, number] | undefined
  if (Array.isArray(value.reps) && value.reps.length === 2) {
    const [lo, hi] = value.reps
    if (typeof lo === 'number' && typeof hi === 'number' && lo > 0 && hi > 0) {
      reps = [lo, hi]
    }
  } else if (typeof value.reps === 'number' && value.reps > 0) {
    reps = value.reps
  }
  if (!reps) return undefined

  const restSeconds =
    typeof value.restSeconds === 'number' && value.restSeconds >= 0 ? value.restSeconds : undefined
  if (restSeconds === undefined) return undefined

  const entry: PresetExerciseEntry = { exerciseId, sets, reps, restSeconds }
  const tempo = toTrimmedString(value.tempo)
  if (tempo) entry.tempo = tempo
  const rpe = toOptionalNumber(value.rpe, 1, 10)
  if (rpe !== undefined) entry.rpe = rpe
  const notes = toTrimmedString(value.notes)
  if (notes) entry.notes = notes
  if (typeof value.initialLoadKg === 'number' && value.initialLoadKg > 0) {
    entry.initialLoadKg = value.initialLoadKg
  }
  return entry
}

function parseCatalogSessions(value: unknown): PresetSessionTemplate[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined

  const TEMPLATE_KEYS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D']
  const sessions: PresetSessionTemplate[] = []
  for (const rawSession of value) {
    if (!isRecord(rawSession)) continue
    if (!Array.isArray(rawSession.exercises) || rawSession.exercises.length === 0) continue

    const exercises: PresetExerciseEntry[] = []
    for (const rawEx of rawSession.exercises) {
      const parsed = parsePresetExerciseEntry(rawEx)
      if (parsed) exercises.push(parsed)
    }
    if (exercises.length === 0) continue

    const idx = sessions.length
    const templateKey = TEMPLATE_KEYS[idx] ?? 'D'
    const label = toTrimmedString(rawSession.label)
    const session: PresetSessionTemplate = {
      templateKey,
      name: label || templateKey,
      exercises,
    }
    if (rawSession.isDeload === true) session.isDeload = true
    sessions.push(session)
    if (sessions.length >= 4) break
  }

  return sessions.length > 0 ? sessions : undefined
}

function parseCatalogPreset(value: unknown): ParsedCatalogPreset | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const id = toTrimmedString(value.id)
  if (!id) {
    return undefined
  }

  return {
    id,
    nameKey: toTrimmedString(value.nameKey),
    descriptionKey: toTrimmedString(value.descriptionKey),
    durationOptions: Array.isArray(value.durationOptions)
      ? toSortedUniqueNumbers(value.durationOptions)
      : undefined,
    muscleDistribution: isRecord(value.muscleDistribution)
      ? toCatalogMuscleDistribution(value.muscleDistribution)
      : undefined,
    requiredTags: Array.isArray(value.requiredTags)
      ? toCatalogRequiredTags(value.requiredTags)
      : undefined,
    autoRestrictions: Array.isArray(value.autoRestrictions)
      ? toUniqueStringArray(value.autoRestrictions)
      : undefined,
    progressionType: toCatalogProgressionType(value.progressionType),
    notes: toTrimmedString(value.notes),
    sessions: parseCatalogSessions(value.sessions),
    weeklyProgression: toOptionalNumber(value.weeklyProgression, 0, 10),
    restSecondsDefault: toOptionalNumber(value.restSecondsDefault, 1, 600),
    defaultTempo: toTrimmedString(value.defaultTempo),
    maxSetsPerExercise: toOptionalNumber(value.maxSetsPerExercise, 1, 20),
  }
}

function buildPresetFromCatalog(parsedPreset: ParsedCatalogPreset): Preset | undefined {
  if (
    !parsedPreset.nameKey ||
    !parsedPreset.descriptionKey ||
    !parsedPreset.durationOptions ||
    parsedPreset.durationOptions.length === 0
  ) {
    return undefined
  }

  const preset: Preset = {
    id: parsedPreset.id,
    nameKey: parsedPreset.nameKey,
    descriptionKey: parsedPreset.descriptionKey,
    durationOptions: parsedPreset.durationOptions,
    muscleDistribution: parsedPreset.muscleDistribution ?? {},
    requiredTags: parsedPreset.requiredTags ?? [],
    autoRestrictions: parsedPreset.autoRestrictions ?? [],
    progressionType: parsedPreset.progressionType ?? 'linear',
    notes: parsedPreset.notes,
  }

  if (parsedPreset.sessions && parsedPreset.sessions.length > 0) {
    preset.sessions = parsedPreset.sessions
  }
  if (parsedPreset.weeklyProgression !== undefined) {
    preset.weeklyProgression = parsedPreset.weeklyProgression
  }
  if (parsedPreset.restSecondsDefault !== undefined) {
    preset.restSecondsDefault = parsedPreset.restSecondsDefault
  }
  if (parsedPreset.defaultTempo !== undefined) {
    preset.defaultTempo = parsedPreset.defaultTempo
  }
  if (parsedPreset.maxSetsPerExercise !== undefined) {
    preset.maxSetsPerExercise = parsedPreset.maxSetsPerExercise
  }

  return preset
}

function buildPresetsFromCatalog(catalog: unknown): Preset[] {
  if (!Array.isArray(catalog)) {
    return []
  }

  const presetsById = new Map<string, Preset>()

  for (const rawPreset of catalog) {
    const parsedPreset = parseCatalogPreset(rawPreset)
    if (!parsedPreset) {
      continue
    }

    const mergedPreset = buildPresetFromCatalog(parsedPreset)

    if (!mergedPreset) {
      continue
    }

    presetsById.set(parsedPreset.id, mergedPreset)
  }

  const hardcodedOrder = HARDCODED_PRESET_ORDER.filter((presetId) => presetsById.has(presetId))
  const extraPresetIds = [...presetsById.keys()]
    .filter((presetId) => !HARDCODED_PRESET_ORDER.includes(presetId))
    .sort((left, right) => left.localeCompare(right))

  return [...hardcodedOrder, ...extraPresetIds]
    .map((presetId) => presetsById.get(presetId))
    .filter((preset): preset is Preset => Boolean(preset))
}

export const PRESETS: Preset[] = buildPresetsFromCatalog(presetCatalog)

export function getPresetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id)
}

export function hasExerciseRichSessions(preset: Preset | null | undefined): boolean {
  return Boolean(preset?.sessions && preset.sessions.length > 0)
}
