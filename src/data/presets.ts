import { ALL_MUSCLE_GROUPS } from '@/data/muscleGroups'
import type { ExerciseTag, MuscleGroup } from '@/types/exercise'
import type { ProgressionType } from '@/types/planning'
import presetCatalog from '../../data/ingestion/presets/catalog.json'

export interface CustomPreset {
  id: string
  name: string
  durationWeeks: number
  muscleDistribution: Partial<Record<MuscleGroup, number>>
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
  }
}

function buildPresetFromCatalog(options: {
  parsedPreset: ParsedCatalogPreset
  fallbackPreset?: Preset
}): Preset | undefined {
  const { parsedPreset, fallbackPreset } = options

  const nameKey = parsedPreset.nameKey ?? fallbackPreset?.nameKey
  const descriptionKey = parsedPreset.descriptionKey ?? fallbackPreset?.descriptionKey
  const durationOptions =
    parsedPreset.durationOptions && parsedPreset.durationOptions.length > 0
      ? parsedPreset.durationOptions
      : fallbackPreset?.durationOptions

  if (!nameKey || !descriptionKey || !durationOptions || durationOptions.length === 0) {
    return undefined
  }

  const parsedMuscleDistribution = parsedPreset.muscleDistribution
  const muscleDistribution =
    parsedMuscleDistribution && Object.keys(parsedMuscleDistribution).length > 0
      ? parsedMuscleDistribution
      : (fallbackPreset?.muscleDistribution ?? {})

  const requiredTags =
    parsedPreset.requiredTags && parsedPreset.requiredTags.length > 0
      ? parsedPreset.requiredTags
      : (fallbackPreset?.requiredTags ?? [])

  const autoRestrictions =
    parsedPreset.autoRestrictions && parsedPreset.autoRestrictions.length > 0
      ? parsedPreset.autoRestrictions
      : (fallbackPreset?.autoRestrictions ?? [])

  return {
    id: parsedPreset.id,
    nameKey,
    descriptionKey,
    durationOptions,
    muscleDistribution,
    requiredTags,
    autoRestrictions,
    progressionType: parsedPreset.progressionType ?? fallbackPreset?.progressionType ?? 'linear',
    notes: parsedPreset.notes ?? fallbackPreset?.notes,
  }
}

function buildPresetsFromCatalog(catalog: unknown, fallbackPresets: Preset[]): Preset[] {
  if (!Array.isArray(catalog)) {
    return fallbackPresets
  }

  const presetsById = new Map(fallbackPresets.map((preset) => [preset.id, preset]))

  for (const rawPreset of catalog) {
    const parsedPreset = parseCatalogPreset(rawPreset)
    if (!parsedPreset) {
      continue
    }

    const mergedPreset = buildPresetFromCatalog({
      parsedPreset,
      fallbackPreset: presetsById.get(parsedPreset.id),
    })

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

export const PRESETS: Preset[] = buildPresetsFromCatalog(presetCatalog, HARDCODED_PRESETS)

export function getPresetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id)
}
