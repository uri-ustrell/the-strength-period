import type { ExerciseTag } from '@/types/exercise'
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
  requiredTags: ExerciseTag[]
  autoRestrictions: string[]
  progressionType: ProgressionType
  notes?: string
  /** Required: 1–4 faithful session templates with non-empty exercises (length === sessionsPerWeek). */
  sessions: PresetSessionTemplate[]
  /** Required: per-week progression rates; length === durationOptions[0]. */
  weeklyProgressionRates: WeekProgressionRate[]
  weeklyProgression?: number
  restSecondsDefault?: number
  defaultTempo?: string
  maxSetsPerExercise?: number
}

/** Display order hint for known built-in presets. Catalog is the source of truth for content. */
export const HARDCODED_PRESET_ORDER: string[] = [
  'corredor_general',
  'pujada',
  'rehab_tendinitis_anserina',
  'forca_general',
  'mobilitat_prevencio',
]

const _LEGACY_HARDCODED_PRESETS_FOR_REFERENCE: ReadonlyArray<{ id: string }> = [
  { id: 'corredor_general' },
  { id: 'pujada' },
  { id: 'rehab_tendinitis_anserina' },
  { id: 'forca_general' },
  { id: 'mobilitat_prevencio' },
]

type ParsedCatalogPreset = {
  id: string
  nameKey?: string
  descriptionKey?: string
  durationOptions?: number[]
  requiredTags?: ExerciseTag[]
  autoRestrictions?: string[]
  progressionType?: ProgressionType
  notes?: string
  sessions?: PresetSessionTemplate[]
  weeklyProgression?: number
  weeklyProgressionRates?: WeekProgressionRate[]
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
const PROGRESSION_TYPE_SET = new Set<ProgressionType>(['linear', 'undulating', 'block'])

// Suppress unused-var warning for the legacy reference list (kept only for documentation).
void _LEGACY_HARDCODED_PRESETS_FOR_REFERENCE

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

function parseCatalogWeeklyRates(value: unknown): WeekProgressionRate[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const rates: WeekProgressionRate[] = []
  for (const raw of value) {
    if (!isRecord(raw)) continue
    const week = typeof raw.week === 'number' ? raw.week : undefined
    const pct = typeof raw.progressionPct === 'number' ? raw.progressionPct : undefined
    if (week === undefined || pct === undefined) continue
    rates.push({ week, progressionPct: pct })
  }
  return rates.length > 0 ? rates : undefined
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
    weeklyProgressionRates: parseCatalogWeeklyRates(value.weeklyProgressionRates),
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

  // QA-7: Preset.sessions is required (1–4 entries), with non-empty exercises.
  if (!parsedPreset.sessions || parsedPreset.sessions.length === 0) {
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(`[presets] Skipping ${parsedPreset.id}: missing faithful sessions[].`)
    }
    return undefined
  }

  const sessions: PresetSessionTemplate[] = parsedPreset.sessions.slice(0, 4)

  const firstDuration = parsedPreset.durationOptions[0] ?? 4
  const weeklyProgressionRates: WeekProgressionRate[] =
    parsedPreset.weeklyProgressionRates && parsedPreset.weeklyProgressionRates.length > 0
      ? parsedPreset.weeklyProgressionRates
      : Array.from({ length: firstDuration }, (_, i) => {
          const week = i + 1
          return { week, progressionPct: week === firstDuration ? -40 : 5 }
        })

  const preset: Preset = {
    id: parsedPreset.id,
    nameKey: parsedPreset.nameKey,
    descriptionKey: parsedPreset.descriptionKey,
    durationOptions: parsedPreset.durationOptions,
    requiredTags: parsedPreset.requiredTags ?? [],
    autoRestrictions: parsedPreset.autoRestrictions ?? [],
    progressionType: parsedPreset.progressionType ?? 'linear',
    notes: parsedPreset.notes,
    sessions,
    weeklyProgressionRates,
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
