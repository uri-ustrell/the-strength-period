import { resolve } from 'node:path'

import type {
  CandidateEnvelope,
  NormalizedCandidate,
  PresetCatalogEntry,
  SourceLicenseMetadata,
} from './contracts'
import { normalizeCandidate } from './normalizers'
import {
  EXERCISE_CATALOG_PATH,
  INGESTION_BACKUPS_DIR,
  INGESTION_REPORTS_DIR,
  PRESET_CATALOG_PATH,
  ROOT_DIR,
} from './paths'
import {
  ensureDir,
  parseJsonWithMessage,
  readJsonFile,
  readJsonFileOrDefault,
  readTextInput,
  toIsoTimestamp,
  toRunId,
  writeJsonFile,
  writeJsonRollbackSafe,
} from './utils'
import { validateNormalizedCandidate, validatePresetExerciseReferences } from './validators'

type ClaudeResponse = {
  content?: Array<{
    type: string
    text?: string
  }>
}

type RawPresetPayload = Record<string, unknown>

type PresetBatchReport = {
  runId: string
  startedAt: string
  completedAt: string
  dryRun: boolean
  model: string
  outputPath: string
  counts: {
    accepted: number
    rejected: number
  }
  acceptedPresetIds: string[]
  rejected: Array<{
    sourceExternalId: string
    reasons: string[]
  }>
  backupPath?: string
}

export type PresetBatchOptions = {
  runId?: string
  dryRun: boolean
  allowPaid: boolean
  model: string
  maxPresets: number
  outputPath?: string
  promptText?: string
  promptFilePath?: string
  responseFilePath?: string
}

export type PresetBatchResult = {
  reportPath: string
  catalogWritePath?: string
  backupPath?: string
  acceptedPresetIds: string[]
  rejectedCount: number
}

function getSyntheticLicense(): SourceLicenseMetadata {
  return {
    licenseName: 'User-owned Claude output',
    allowsRedistribution: true,
    allowsCommercialUse: true,
    requiresAttribution: false,
    provenance: 'Generated from user-provided prompt through Step 18 preset batch CLI.',
    verifiedAt: toIsoTimestamp(),
    verifiedBy: 'generatePresetBatch.ts',
  }
}

async function resolvePrompt(options: PresetBatchOptions): Promise<string> {
  if (options.promptText?.trim()) {
    return options.promptText.trim()
  }

  if (options.promptFilePath) {
    return readTextInput(options.promptFilePath, ROOT_DIR)
  }

  throw new Error('Preset batch requires --prompt or --prompt-file.')
}

function extractClaudeText(response: ClaudeResponse): string {
  if (!response.content || response.content.length === 0) {
    throw new Error('Claude response did not include content blocks.')
  }

  const textBlock = response.content.find((block) => block.type === 'text' && block.text)
  if (!textBlock?.text) {
    throw new Error('Claude response did not include a text block.')
  }

  return textBlock.text
}

async function requestClaudePresets(options: {
  prompt: string
  model: string
  exerciseIds: string[]
  allowPaid: boolean
}): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY is required unless --response-file is provided.')
  }

  const freeTierAvailable = process.env.CLAUDE_FREE_TIER_AVAILABLE === 'true'
  if (!freeTierAvailable && !options.allowPaid) {
    throw new Error(
      'Claude free tier is not marked as available. Set CLAUDE_FREE_TIER_AVAILABLE=true or pass --allow-paid.'
    )
  }

  const contract = {
    presets: [
      {
        sourceExternalId: 'string',
        title: 'string',
        description: 'string',
        durationOptions: [4, 6, 8],
        muscleDistribution: {
          quadriceps: 30,
          glutis: 30,
          abdominal: 40,
        },
        requiredTags: ['corredor'],
        autoRestrictions: ['rehab_genoll'],
        progressionType: 'linear',
        notes: 'string',
        exerciseIds: ['Exercise_Id_1', 'Exercise_Id_2'],
      },
    ],
  }

  const message = [
    options.prompt,
    '',
    'Constraints:',
    `- Use only these exercise IDs: ${options.exerciseIds.join(', ')}`,
    '- Return strict JSON only (no markdown).',
    '- JSON contract:',
    JSON.stringify(contract, null, 2),
  ].join('\n')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorMessage = await response.text()
    throw new Error(
      `Claude API request failed: ${response.status} ${response.statusText} ${errorMessage}`
    )
  }

  const payload = (await response.json()) as ClaudeResponse
  return extractClaudeText(payload)
}

function extractRawPresets(parsed: unknown): RawPresetPayload[] {
  if (Array.isArray(parsed)) {
    return parsed.filter(
      (item): item is RawPresetPayload => typeof item === 'object' && item !== null
    )
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    Array.isArray((parsed as { presets?: unknown[] }).presets)
  ) {
    return (parsed as { presets: unknown[] }).presets.filter(
      (item): item is RawPresetPayload => typeof item === 'object' && item !== null
    )
  }

  throw new Error('Preset payload must be an array or an object with a presets array.')
}

function toCandidateEnvelope(raw: RawPresetPayload, index: number): CandidateEnvelope {
  const sourceExternalId =
    typeof raw.sourceExternalId === 'string' && raw.sourceExternalId.trim().length > 0
      ? raw.sourceExternalId.trim()
      : `preset-${index + 1}`

  return {
    candidateId: `claude-preset-batch:preset:${sourceExternalId}`,
    source: {
      adapterId: 'llm-json',
      sourceId: 'claude-preset-batch',
      sourceType: 'llm-json',
      sourceUrl: 'https://api.anthropic.com/v1/messages',
      fetchedAt: toIsoTimestamp(),
    },
    license: getSyntheticLicense(),
    payload: {
      kind: 'preset',
      sourceExternalId,
      title: typeof raw.title === 'string' ? raw.title : sourceExternalId,
      description: typeof raw.description === 'string' ? raw.description : undefined,
      durationOptions: Array.isArray(raw.durationOptions)
        ? raw.durationOptions.filter((value): value is number => typeof value === 'number')
        : undefined,
      muscleDistribution:
        typeof raw.muscleDistribution === 'object' && raw.muscleDistribution !== null
          ? (raw.muscleDistribution as Record<string, number>)
          : {},
      requiredTags: Array.isArray(raw.requiredTags)
        ? raw.requiredTags.filter((value): value is string => typeof value === 'string')
        : undefined,
      autoRestrictions: Array.isArray(raw.autoRestrictions)
        ? raw.autoRestrictions.filter((value): value is string => typeof value === 'string')
        : undefined,
      progressionType: typeof raw.progressionType === 'string' ? raw.progressionType : null,
      notes: typeof raw.notes === 'string' ? raw.notes : undefined,
      exerciseIds: Array.isArray(raw.exerciseIds)
        ? raw.exerciseIds.filter((value): value is string => typeof value === 'string')
        : undefined,
    },
  }
}

function buildPresetCatalogEntry(
  candidate: Extract<NormalizedCandidate, { kind: 'preset' }>
): PresetCatalogEntry {
  return {
    ...candidate.canonical,
    ingestionMeta: {
      sourceRecords: [
        {
          sourceId: candidate.source.sourceId,
          sourceExternalId: candidate.sourceExternalId,
          adapterId: candidate.source.adapterId,
          ingestedAt: candidate.source.fetchedAt,
          licenseName: candidate.license.licenseName,
          provenance: candidate.license.provenance,
        },
      ],
    },
  }
}

export async function runPresetBatchGenerator(
  options: PresetBatchOptions
): Promise<PresetBatchResult> {
  const runId = options.runId ?? toRunId('preset-batch')
  const outputPath = options.outputPath
    ? options.outputPath.startsWith('/')
      ? options.outputPath
      : resolve(ROOT_DIR, options.outputPath)
    : PRESET_CATALOG_PATH

  const startedAt = toIsoTimestamp()

  const exerciseCatalog = await readJsonFileOrDefault<Array<{ id: string }>>(
    EXERCISE_CATALOG_PATH,
    []
  )
  const validExerciseIds = new Set(exerciseCatalog.map((exercise) => exercise.id))

  const existingCatalog = await readJsonFileOrDefault<PresetCatalogEntry[]>(outputPath, [])

  let rawResponse: string
  if (options.responseFilePath) {
    rawResponse = await readTextInput(options.responseFilePath, ROOT_DIR)
  } else {
    const prompt = await resolvePrompt(options)
    rawResponse = await requestClaudePresets({
      prompt,
      model: options.model,
      exerciseIds: [...validExerciseIds],
      allowPaid: options.allowPaid,
    })
  }

  const parsed = parseJsonWithMessage<unknown>(rawResponse, 'Claude preset response')
  const rawPresets = extractRawPresets(parsed).slice(0, options.maxPresets)

  const accepted: Array<Extract<NormalizedCandidate, { kind: 'preset' }>> = []
  const rejected: Array<{ sourceExternalId: string; reasons: string[] }> = []

  const existingIds = new Set(existingCatalog.map((preset) => preset.id))
  const stagedIds = new Set<string>()

  for (const [index, rawPreset] of rawPresets.entries()) {
    const envelope = toCandidateEnvelope(rawPreset, index)
    const normalized = normalizeCandidate(envelope)

    if (normalized.kind !== 'preset') {
      rejected.push({
        sourceExternalId: envelope.payload.sourceExternalId,
        reasons: ['Candidate was not normalized as preset.'],
      })
      continue
    }

    const validation = validateNormalizedCandidate(normalized)
    const referenceValidation = validatePresetExerciseReferences(
      normalized.canonical,
      validExerciseIds
    )

    const errors = [
      ...validation.errors.map((issue) => `${issue.field}: ${issue.message}`),
      ...referenceValidation.errors.map((issue) => `${issue.field}: ${issue.message}`),
    ]

    if (existingIds.has(normalized.canonical.id)) {
      errors.push(`Preset id "${normalized.canonical.id}" already exists in catalog.`)
    }

    if (stagedIds.has(normalized.canonical.id)) {
      errors.push(`Preset id "${normalized.canonical.id}" is duplicated in this batch.`)
    }

    if (errors.length > 0) {
      rejected.push({
        sourceExternalId: normalized.sourceExternalId,
        reasons: errors,
      })
      continue
    }

    stagedIds.add(normalized.canonical.id)
    accepted.push(normalized)
  }

  const mergedCatalog = [
    ...existingCatalog,
    ...accepted.map((candidate) => buildPresetCatalogEntry(candidate)),
  ].sort((left, right) => left.id.localeCompare(right.id))

  const writeResult = await writeJsonRollbackSafe({
    targetPath: outputPath,
    value: mergedCatalog,
    backupDir: INGESTION_BACKUPS_DIR,
    dryRun: options.dryRun,
    backupPrefix: `${runId}-preset-catalog`,
  })

  await ensureDir(INGESTION_REPORTS_DIR)

  const report: PresetBatchReport = {
    runId,
    startedAt,
    completedAt: toIsoTimestamp(),
    dryRun: options.dryRun,
    model: options.model,
    outputPath,
    counts: {
      accepted: accepted.length,
      rejected: rejected.length,
    },
    acceptedPresetIds: accepted.map((candidate) => candidate.canonical.id),
    rejected,
    backupPath: writeResult.backupPath,
  }

  const reportPath = resolve(INGESTION_REPORTS_DIR, `${runId}.preset-batch.json`)
  await writeJsonFile(reportPath, report)

  return {
    reportPath,
    catalogWritePath: writeResult.written ? writeResult.targetPath : undefined,
    backupPath: writeResult.backupPath,
    acceptedPresetIds: report.acceptedPresetIds,
    rejectedCount: report.counts.rejected,
  }
}
