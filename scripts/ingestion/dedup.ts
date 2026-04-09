import type {
  AliasMap,
  ExerciseCatalogEntry,
  MuscleGroup,
  NormalizedCandidate,
  PresetCatalogEntry,
  SourceRegistry,
} from './contracts'
import { jaccardSimilarity, normalizeText, overlapRatio, tokenize } from './utils'

type ExerciseSnapshot = {
  id: string
  slug: string
  titleTokens: string[]
  muscles: MuscleGroup[]
}

type PresetSnapshot = {
  id: string
  slug: string
  titleTokens: string[]
  muscleKeys: string[]
}

export type DedupResult = {
  status: 'unique' | 'duplicate' | 'review'
  reasons: string[]
  duplicateOf?: string
}

export type DedupContext = {
  exerciseSourceRegistry: Map<string, string>
  presetSourceRegistry: Map<string, string>
  exerciseSlugLookup: Map<string, string>
  presetSlugLookup: Map<string, string>
  aliasLookup: Map<string, string>
  exerciseSnapshots: ExerciseSnapshot[]
  presetSnapshots: PresetSnapshot[]
}

function sourceRegistryKey(sourceId: string, sourceExternalId: string): string {
  return `${sourceId}::${sourceExternalId}`
}

function exerciseTitleFromCatalog(entry: ExerciseCatalogEntry): string {
  const key = entry.nameKey.includes(':')
    ? entry.nameKey.split(':').slice(1).join(':')
    : entry.nameKey
  return key.replace(/_/g, ' ')
}

function presetTitleFromCatalog(entry: PresetCatalogEntry): string {
  return entry.id.replace(/_/g, ' ')
}

function buildExerciseSnapshot(entry: ExerciseCatalogEntry): ExerciseSnapshot {
  return {
    id: entry.id,
    slug: normalizeText(entry.id).replace(/\s+/g, '-'),
    titleTokens: tokenize(exerciseTitleFromCatalog(entry)),
    muscles: entry.primaryMuscles,
  }
}

function buildPresetSnapshot(entry: PresetCatalogEntry): PresetSnapshot {
  return {
    id: entry.id,
    slug: normalizeText(entry.id).replace(/\s+/g, '-'),
    titleTokens: tokenize(presetTitleFromCatalog(entry)),
    muscleKeys: Object.keys(entry.muscleDistribution),
  }
}

function normalizeAlias(alias: string): string {
  return normalizeText(alias)
}

function computeExerciseSimilarity(
  candidateTokens: string[],
  candidateMuscles: MuscleGroup[],
  existing: ExerciseSnapshot
): number {
  const titleScore = jaccardSimilarity(candidateTokens, existing.titleTokens)
  const muscleScore = overlapRatio(candidateMuscles, existing.muscles)
  return titleScore * 0.75 + muscleScore * 0.25
}

function computePresetSimilarity(
  candidateTokens: string[],
  candidateMuscles: string[],
  existing: PresetSnapshot
): number {
  const titleScore = jaccardSimilarity(candidateTokens, existing.titleTokens)
  const muscleScore = overlapRatio(candidateMuscles, existing.muscleKeys)
  return titleScore * 0.7 + muscleScore * 0.3
}

export function createDedupContext(
  existingExercises: ExerciseCatalogEntry[],
  existingPresets: PresetCatalogEntry[],
  sourceRegistry: SourceRegistry,
  aliasMap: AliasMap
): DedupContext {
  const exerciseSourceRegistry = new Map<string, string>(Object.entries(sourceRegistry.exercises))
  const presetSourceRegistry = new Map<string, string>(Object.entries(sourceRegistry.presets))

  const exerciseSlugLookup = new Map<string, string>()
  const presetSlugLookup = new Map<string, string>()

  const exerciseSnapshots = existingExercises.map(buildExerciseSnapshot)
  const presetSnapshots = existingPresets.map(buildPresetSnapshot)

  for (const exercise of exerciseSnapshots) {
    exerciseSlugLookup.set(exercise.slug, exercise.id)
  }

  for (const preset of presetSnapshots) {
    presetSlugLookup.set(preset.slug, preset.id)
  }

  const aliasLookup = new Map<string, string>()
  for (const [alias, canonicalId] of Object.entries(aliasMap.aliases)) {
    aliasLookup.set(normalizeAlias(alias), canonicalId)
  }

  return {
    exerciseSourceRegistry,
    presetSourceRegistry,
    exerciseSlugLookup,
    presetSlugLookup,
    aliasLookup,
    exerciseSnapshots,
    presetSnapshots,
  }
}

export function deduplicateCandidate(
  candidate: NormalizedCandidate,
  context: DedupContext
): DedupResult {
  if (candidate.kind === 'exercise') {
    const registryKey = sourceRegistryKey(candidate.source.sourceId, candidate.sourceExternalId)
    const sourceMatch = context.exerciseSourceRegistry.get(registryKey)
    if (sourceMatch) {
      return {
        status: 'duplicate',
        duplicateOf: sourceMatch,
        reasons: ['Source external id already ingested.'],
      }
    }

    const slugMatch = context.exerciseSlugLookup.get(candidate.slugFingerprint)
    if (slugMatch) {
      return {
        status: 'duplicate',
        duplicateOf: slugMatch,
        reasons: ['Canonical slug collides with existing exercise id.'],
      }
    }

    for (const alias of candidate.aliases) {
      const aliasMatch = context.aliasLookup.get(normalizeAlias(alias))
      if (aliasMatch) {
        return {
          status: 'duplicate',
          duplicateOf: aliasMatch,
          reasons: [`Alias map match found for alias "${alias}".`],
        }
      }
    }

    const candidateTokens = tokenize(candidate.titleFingerprint)
    let bestMatch: { id: string; score: number } | null = null

    for (const existing of context.exerciseSnapshots) {
      const score = computeExerciseSimilarity(
        candidateTokens,
        candidate.canonical.primaryMuscles,
        existing
      )
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          id: existing.id,
          score,
        }
      }
    }

    if (bestMatch && bestMatch.score >= 0.92) {
      return {
        status: 'duplicate',
        duplicateOf: bestMatch.id,
        reasons: [`High similarity duplicate detected (score=${bestMatch.score.toFixed(2)}).`],
      }
    }

    if (bestMatch && bestMatch.score >= 0.78) {
      return {
        status: 'review',
        duplicateOf: bestMatch.id,
        reasons: [
          `Possible duplicate requires manual review (score=${bestMatch.score.toFixed(2)}).`,
        ],
      }
    }

    return {
      status: 'unique',
      reasons: [],
    }
  }

  const registryKey = sourceRegistryKey(candidate.source.sourceId, candidate.sourceExternalId)
  const sourceMatch = context.presetSourceRegistry.get(registryKey)
  if (sourceMatch) {
    return {
      status: 'duplicate',
      duplicateOf: sourceMatch,
      reasons: ['Source external id already ingested.'],
    }
  }

  const slugMatch = context.presetSlugLookup.get(candidate.slugFingerprint)
  if (slugMatch) {
    return {
      status: 'duplicate',
      duplicateOf: slugMatch,
      reasons: ['Canonical slug collides with existing preset id.'],
    }
  }

  for (const alias of candidate.aliases) {
    const aliasMatch = context.aliasLookup.get(normalizeAlias(alias))
    if (aliasMatch) {
      return {
        status: 'duplicate',
        duplicateOf: aliasMatch,
        reasons: [`Alias map match found for alias "${alias}".`],
      }
    }
  }

  const candidateTokens = tokenize(candidate.titleFingerprint)
  const candidateMuscles = Object.keys(candidate.canonical.muscleDistribution)
  let bestMatch: { id: string; score: number } | null = null

  for (const existing of context.presetSnapshots) {
    const score = computePresetSimilarity(candidateTokens, candidateMuscles, existing)
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        id: existing.id,
        score,
      }
    }
  }

  if (bestMatch && bestMatch.score >= 0.9) {
    return {
      status: 'duplicate',
      duplicateOf: bestMatch.id,
      reasons: [`High similarity duplicate detected (score=${bestMatch.score.toFixed(2)}).`],
    }
  }

  if (bestMatch && bestMatch.score >= 0.75) {
    return {
      status: 'review',
      duplicateOf: bestMatch.id,
      reasons: [`Possible duplicate requires manual review (score=${bestMatch.score.toFixed(2)}).`],
    }
  }

  return {
    status: 'unique',
    reasons: [],
  }
}

export function registerAcceptedCandidate(
  candidate: NormalizedCandidate,
  context: DedupContext
): void {
  const registryKey = sourceRegistryKey(candidate.source.sourceId, candidate.sourceExternalId)
  const canonicalId = candidate.canonical.id

  if (candidate.kind === 'exercise') {
    context.exerciseSourceRegistry.set(registryKey, canonicalId)
    context.exerciseSlugLookup.set(candidate.slugFingerprint, canonicalId)
    context.exerciseSnapshots.push({
      id: canonicalId,
      slug: candidate.slugFingerprint,
      titleTokens: tokenize(candidate.titleFingerprint),
      muscles: candidate.canonical.primaryMuscles,
    })
  } else {
    context.presetSourceRegistry.set(registryKey, canonicalId)
    context.presetSlugLookup.set(candidate.slugFingerprint, canonicalId)
    context.presetSnapshots.push({
      id: canonicalId,
      slug: candidate.slugFingerprint,
      titleTokens: tokenize(candidate.titleFingerprint),
      muscleKeys: Object.keys(candidate.canonical.muscleDistribution),
    })
  }

  for (const alias of candidate.aliases) {
    const normalizedAlias = normalizeAlias(alias)
    if (!normalizedAlias) continue
    context.aliasLookup.set(normalizedAlias, canonicalId)
  }
}
