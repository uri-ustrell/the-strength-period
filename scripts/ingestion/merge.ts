import type {
  AliasMap,
  ExerciseCatalogEntry,
  MergeWriteResult,
  NormalizedCandidate,
  PresetCatalogEntry,
  SourceRegistry,
} from './contracts'
import {
  ALIAS_MAP_PATH,
  EXERCISE_CATALOG_PATH,
  INGESTION_BACKUPS_DIR,
  PRESET_CATALOG_PATH,
  SOURCE_REGISTRY_PATH,
} from './paths'
import { normalizeText, readJsonFileOrDefault, writeJsonRollbackSafe } from './utils'

export type MergeState = {
  exercises: ExerciseCatalogEntry[]
  presets: PresetCatalogEntry[]
  sourceRegistry: SourceRegistry
  aliasMap: AliasMap
}

function sourceRegistryKey(sourceId: string, sourceExternalId: string): string {
  return `${sourceId}::${sourceExternalId}`
}

function buildExerciseSourceRecord(candidate: NormalizedCandidate) {
  return {
    sourceId: candidate.source.sourceId,
    sourceExternalId: candidate.sourceExternalId,
    adapterId: candidate.source.adapterId,
    ingestedAt: candidate.source.fetchedAt,
    licenseName: candidate.license.licenseName,
    provenance: candidate.license.provenance,
  }
}

function upsertExerciseEntry(
  list: ExerciseCatalogEntry[],
  candidate: Extract<NormalizedCandidate, { kind: 'exercise' }>
): void {
  const existingIndex = list.findIndex((exercise) => exercise.id === candidate.canonical.id)
  const sourceRecord = buildExerciseSourceRecord(candidate)

  if (existingIndex >= 0) {
    const existing = list[existingIndex]
    const currentRecords = existing.ingestionMeta?.sourceRecords ?? []

    list[existingIndex] = {
      ...existing,
      ingestionMeta: {
        sourceRecords: [...currentRecords, sourceRecord],
      },
    }
    return
  }

  list.push({
    ...candidate.canonical,
    ingestionMeta: {
      sourceRecords: [sourceRecord],
    },
  })
}

function upsertPresetEntry(
  list: PresetCatalogEntry[],
  candidate: Extract<NormalizedCandidate, { kind: 'preset' }>
): void {
  const existingIndex = list.findIndex((preset) => preset.id === candidate.canonical.id)
  const sourceRecord = buildExerciseSourceRecord(candidate)

  if (existingIndex >= 0) {
    const existing = list[existingIndex]
    const currentRecords = existing.ingestionMeta?.sourceRecords ?? []

    list[existingIndex] = {
      ...existing,
      ingestionMeta: {
        sourceRecords: [...currentRecords, sourceRecord],
      },
    }
    return
  }

  list.push({
    ...candidate.canonical,
    ingestionMeta: {
      sourceRecords: [sourceRecord],
    },
  })
}

function mergeAliasMap(aliasMap: AliasMap, candidate: NormalizedCandidate): void {
  for (const alias of candidate.aliases) {
    const key = normalizeText(alias)
    if (!key) continue
    aliasMap.aliases[key] = candidate.canonical.id
  }
}

function mergeSourceRegistry(registry: SourceRegistry, candidate: NormalizedCandidate): void {
  const key = sourceRegistryKey(candidate.source.sourceId, candidate.sourceExternalId)
  if (candidate.kind === 'exercise') {
    registry.exercises[key] = candidate.canonical.id
  } else {
    registry.presets[key] = candidate.canonical.id
  }
}

export async function loadMergeState(): Promise<MergeState> {
  const exercises = await readJsonFileOrDefault<ExerciseCatalogEntry[]>(EXERCISE_CATALOG_PATH, [])
  const presets = await readJsonFileOrDefault<PresetCatalogEntry[]>(PRESET_CATALOG_PATH, [])
  const sourceRegistry = await readJsonFileOrDefault<SourceRegistry>(SOURCE_REGISTRY_PATH, {
    exercises: {},
    presets: {},
  })
  const aliasMap = await readJsonFileOrDefault<AliasMap>(ALIAS_MAP_PATH, {
    aliases: {},
  })

  return {
    exercises,
    presets,
    sourceRegistry,
    aliasMap,
  }
}

export function applyAcceptedCandidates(
  state: MergeState,
  acceptedCandidates: NormalizedCandidate[]
): MergeState {
  const exercises = [...state.exercises]
  const presets = [...state.presets]
  const sourceRegistry: SourceRegistry = {
    exercises: { ...state.sourceRegistry.exercises },
    presets: { ...state.sourceRegistry.presets },
  }
  const aliasMap: AliasMap = {
    aliases: { ...state.aliasMap.aliases },
  }

  for (const candidate of acceptedCandidates) {
    if (candidate.kind === 'exercise') {
      upsertExerciseEntry(exercises, candidate)
    } else {
      upsertPresetEntry(presets, candidate)
    }

    mergeSourceRegistry(sourceRegistry, candidate)
    mergeAliasMap(aliasMap, candidate)
  }

  const dedupedExercises = Object.values(
    exercises.reduce<Record<string, ExerciseCatalogEntry>>((accumulator, exercise) => {
      accumulator[exercise.id] = exercise
      return accumulator
    }, {})
  ).sort((left, right) => left.id.localeCompare(right.id))

  const dedupedPresets = Object.values(
    presets.reduce<Record<string, PresetCatalogEntry>>((accumulator, preset) => {
      accumulator[preset.id] = preset
      return accumulator
    }, {})
  ).sort((left, right) => left.id.localeCompare(right.id))

  return {
    exercises: dedupedExercises,
    presets: dedupedPresets,
    sourceRegistry,
    aliasMap,
  }
}

export async function persistMergeState(options: {
  state: MergeState
  dryRun: boolean
  runId: string
}): Promise<MergeWriteResult[]> {
  const { state, dryRun, runId } = options

  const writes: MergeWriteResult[] = []
  writes.push(
    await writeJsonRollbackSafe({
      targetPath: EXERCISE_CATALOG_PATH,
      value: state.exercises,
      backupDir: INGESTION_BACKUPS_DIR,
      dryRun,
      backupPrefix: `${runId}-exercises`,
    })
  )

  writes.push(
    await writeJsonRollbackSafe({
      targetPath: PRESET_CATALOG_PATH,
      value: state.presets,
      backupDir: INGESTION_BACKUPS_DIR,
      dryRun,
      backupPrefix: `${runId}-presets`,
    })
  )

  writes.push(
    await writeJsonRollbackSafe({
      targetPath: SOURCE_REGISTRY_PATH,
      value: state.sourceRegistry,
      backupDir: INGESTION_BACKUPS_DIR,
      dryRun,
      backupPrefix: `${runId}-source-registry`,
    })
  )

  writes.push(
    await writeJsonRollbackSafe({
      targetPath: ALIAS_MAP_PATH,
      value: state.aliasMap,
      backupDir: INGESTION_BACKUPS_DIR,
      dryRun,
      backupPrefix: `${runId}-alias-map`,
    })
  )

  return writes
}
