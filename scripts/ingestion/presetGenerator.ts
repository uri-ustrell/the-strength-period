import { resolve } from 'node:path'

import { HARDCODED_PRESETS } from '../../src/data/presets'
import type {
  CandidateEnvelope,
  MergeWriteResult,
  NormalizedCandidate,
  PresetCatalogEntry,
  RestrictionCondition,
  SourceLicenseMetadata,
} from './contracts'
import { CANONICAL_RESTRICTION_CONDITIONS } from './contracts'
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
  readJsonFileOrDefault,
  readTextInput,
  toIsoTimestamp,
  toRunId,
  writeJsonFile,
  writeJsonRollbackSafe,
} from './utils'
import { validateNormalizedCandidate, validatePresetExerciseReferences } from './validators'

const SUPPORTED_LOCALES = ['ca', 'es', 'en'] as const

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const PLANNING_LOCALE_PATHS: Record<SupportedLocale, string> = {
  ca: resolve(ROOT_DIR, 'src/i18n/locales/ca/planning.json'),
  es: resolve(ROOT_DIR, 'src/i18n/locales/es/planning.json'),
  en: resolve(ROOT_DIR, 'src/i18n/locales/en/planning.json'),
}

const CANONICAL_RESTRICTION_SET = new Set<string>(CANONICAL_RESTRICTION_CONDITIONS)
const HARDCODED_PRESET_INGESTED_AT = '1970-01-01T00:00:00.000Z'

type ClaudeResponse = {
  content?: Array<{
    type: string
    text?: string
  }>
}

type RawPresetPayload = Record<string, unknown>

type RawPresetTranslation = {
  name?: string
  description?: string
}

type ParsedLocalePresetI18n = {
  presets: Record<string, RawPresetTranslation>
  presetTags: Record<string, string>
}

type ParsedPresetI18n = Partial<Record<SupportedLocale, ParsedLocalePresetI18n>>

type ParsedPresetResponse = {
  presets: RawPresetPayload[]
  i18n?: ParsedPresetI18n
}

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

function sortRecordByKey<T>(record: Record<string, T>): Record<string, T> {
  return Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, T>>((accumulator, key) => {
      accumulator[key] = record[key]
      return accumulator
    }, {})
}

function humanizeIdentifier(value: string): string {
  const cleaned = value.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')

  if (!cleaned) {
    return value
  }

  return cleaned
    .split(' ')
    .map((segment) =>
      segment.length === 0 ? segment : `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`
    )
    .join(' ')
}

function getOrCreateRecord(target: Record<string, unknown>, key: string): Record<string, unknown> {
  const current = target[key]
  if (isRecord(current)) {
    return current
  }

  const created: Record<string, unknown> = {}
  target[key] = created
  return created
}

function readExistingPresetField(
  planningLocale: Record<string, unknown>,
  presetId: string,
  field: 'name' | 'description'
): string | undefined {
  const ingestedPresets = planningLocale.ingested_presets
  if (!isRecord(ingestedPresets)) {
    return undefined
  }

  const entry = ingestedPresets[presetId]
  if (!isRecord(entry)) {
    return undefined
  }

  return toTrimmedString(entry[field])
}

function readExistingTagLabel(
  planningLocale: Record<string, unknown>,
  tag: string
): string | undefined {
  const presetTags = planningLocale.preset_tags
  if (!isRecord(presetTags)) {
    return undefined
  }

  return toTrimmedString(presetTags[tag])
}

function parsePresetTranslations(raw: unknown): Record<string, RawPresetTranslation> {
  if (!isRecord(raw)) {
    return {}
  }

  const translations: Record<string, RawPresetTranslation> = {}

  for (const [key, value] of Object.entries(raw)) {
    if (!isRecord(value)) {
      continue
    }

    const name = toTrimmedString(value.name)
    const description = toTrimmedString(value.description)

    if (!name && !description) {
      continue
    }

    translations[key] = {
      name,
      description,
    }
  }

  return translations
}

function parsePresetTagTranslations(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) {
    return {}
  }

  const labels: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    const label = toTrimmedString(value)
    if (!label) {
      continue
    }
    labels[key] = label
  }

  return labels
}

function parsePresetI18n(raw: unknown): ParsedPresetI18n | undefined {
  if (!isRecord(raw)) {
    return undefined
  }

  const parsed: ParsedPresetI18n = {}

  for (const locale of SUPPORTED_LOCALES) {
    const rawLocale = raw[locale]
    if (!isRecord(rawLocale)) {
      continue
    }

    const presets = parsePresetTranslations(rawLocale.presets)
    const presetTags = parsePresetTagTranslations(rawLocale.preset_tags)

    if (Object.keys(presets).length === 0 && Object.keys(presetTags).length === 0) {
      continue
    }

    parsed[locale] = {
      presets,
      presetTags,
    }
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined
}

function extractPresetResponse(parsed: unknown): ParsedPresetResponse {
  if (Array.isArray(parsed)) {
    return {
      presets: parsed.filter((item): item is RawPresetPayload => isRecord(item)),
    }
  }

  if (isRecord(parsed) && Array.isArray(parsed.presets)) {
    return {
      presets: parsed.presets.filter((item): item is RawPresetPayload => isRecord(item)),
      i18n: parsePresetI18n(parsed.i18n),
    }
  }

  throw new Error('Preset payload must be an array or an object with a presets array.')
}

function getPayloadPresetField(options: {
  i18n?: ParsedPresetI18n
  locale: SupportedLocale
  keyCandidates: string[]
  field: 'name' | 'description'
}): string | undefined {
  const localePayload = options.i18n?.[options.locale]
  if (!localePayload) {
    return undefined
  }

  for (const key of options.keyCandidates) {
    const entry = localePayload.presets[key]
    if (!entry) {
      continue
    }

    const value = options.field === 'name' ? entry.name : entry.description
    if (value) {
      return value
    }
  }

  return undefined
}

function getPayloadTagLabel(options: {
  i18n?: ParsedPresetI18n
  locale: SupportedLocale
  tag: string
}): string | undefined {
  const localePayload = options.i18n?.[options.locale]
  if (!localePayload) {
    return undefined
  }

  return localePayload.presetTags[options.tag]
}

function getRawPresetField(
  rawPresetBySourceExternalId: Map<string, RawPresetPayload>,
  sourceExternalId: string,
  field: 'title' | 'description'
): string | undefined {
  const rawPreset = rawPresetBySourceExternalId.get(sourceExternalId)
  if (!rawPreset) {
    return undefined
  }

  return toTrimmedString(rawPreset[field])
}

function sortIngestedPresetTranslations(
  ingestedPresets: Record<string, unknown>
): Record<string, unknown> {
  const sorted: Record<string, unknown> = {}

  for (const key of Object.keys(ingestedPresets).sort((left, right) => left.localeCompare(right))) {
    const value = ingestedPresets[key]
    if (!isRecord(value)) {
      sorted[key] = value
      continue
    }

    const normalized: Record<string, unknown> = {}
    const name = toTrimmedString(value.name)
    const description = toTrimmedString(value.description)

    if (name) {
      normalized.name = name
    }

    if (description) {
      normalized.description = description
    }

    for (const nestedKey of Object.keys(value).sort((left, right) => left.localeCompare(right))) {
      if (nestedKey === 'name' || nestedKey === 'description') {
        continue
      }
      normalized[nestedKey] = value[nestedKey]
    }

    sorted[key] = normalized
  }

  return sorted
}

function toCanonicalAutoRestrictions(values: string[]): RestrictionCondition[] {
  return values.filter((value): value is RestrictionCondition =>
    CANONICAL_RESTRICTION_SET.has(value)
  )
}

type PresetSourceRecord = NonNullable<PresetCatalogEntry['ingestionMeta']>['sourceRecords'][number]

function sourceRecordKey(record: PresetSourceRecord): string {
  return [record.sourceId, record.sourceExternalId, record.adapterId, record.ingestedAt].join('::')
}

function mergePresetSourceRecords(records: PresetSourceRecord[]): PresetSourceRecord[] {
  return Object.values(
    records.reduce<Record<string, PresetSourceRecord>>((accumulator, record) => {
      accumulator[sourceRecordKey(record)] = record
      return accumulator
    }, {})
  ).sort((left, right) => {
    const sourceComparison = left.sourceId.localeCompare(right.sourceId)
    if (sourceComparison !== 0) {
      return sourceComparison
    }

    const externalComparison = left.sourceExternalId.localeCompare(right.sourceExternalId)
    if (externalComparison !== 0) {
      return externalComparison
    }

    const adapterComparison = left.adapterId.localeCompare(right.adapterId)
    if (adapterComparison !== 0) {
      return adapterComparison
    }

    return left.ingestedAt.localeCompare(right.ingestedAt)
  })
}

function mergeHardcodedPresetCatalogEntry(
  existing: PresetCatalogEntry,
  hardcoded: PresetCatalogEntry
): PresetCatalogEntry {
  const mergedSourceRecords = mergePresetSourceRecords([
    ...(existing.ingestionMeta?.sourceRecords ?? []),
    ...(hardcoded.ingestionMeta?.sourceRecords ?? []),
  ])

  return {
    ...existing,
    ...hardcoded,
    ingestionMeta: {
      sourceRecords: mergedSourceRecords,
    },
  }
}

function buildHardcodedPresetCatalogEntry(
  preset: (typeof HARDCODED_PRESETS)[number]
): PresetCatalogEntry {
  return {
    id: preset.id,
    nameKey: preset.nameKey,
    descriptionKey: preset.descriptionKey,
    durationOptions: [...preset.durationOptions].sort((left, right) => left - right),
    muscleDistribution: { ...preset.muscleDistribution },
    requiredTags: [...preset.requiredTags],
    autoRestrictions: toCanonicalAutoRestrictions(preset.autoRestrictions),
    progressionType: preset.progressionType,
    ingestionMeta: {
      sourceRecords: [
        {
          sourceId: 'app-hardcoded-presets',
          sourceExternalId: preset.id,
          adapterId: 'hardcoded-seed',
          ingestedAt: HARDCODED_PRESET_INGESTED_AT,
          licenseName: 'Project-owned preset definitions',
          provenance: 'Seeded from src/data/presets.ts by preset batch generator.',
        },
      ],
    },
  }
}

function seedHardcodedPresets(existingCatalog: PresetCatalogEntry[]): PresetCatalogEntry[] {
  const byId = new Map(existingCatalog.map((preset) => [preset.id, preset]))

  for (const preset of HARDCODED_PRESETS) {
    const hardcodedEntry = buildHardcodedPresetCatalogEntry(preset)
    const existingEntry = byId.get(preset.id)

    if (existingEntry) {
      byId.set(preset.id, mergeHardcodedPresetCatalogEntry(existingEntry, hardcodedEntry))
      continue
    }

    byId.set(preset.id, hardcodedEntry)
  }

  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id))
}

async function mergePresetI18nIntoPlanningLocales(options: {
  presetsForI18n: Array<Extract<NormalizedCandidate, { kind: 'preset' }>>
  rawPresetBySourceExternalId: Map<string, RawPresetPayload>
  i18n?: ParsedPresetI18n
  runId: string
  dryRun: boolean
}): Promise<MergeWriteResult[]> {
  const presetsForI18n = Object.values(
    options.presetsForI18n.reduce<Record<string, Extract<NormalizedCandidate, { kind: 'preset' }>>>(
      (accumulator, preset) => {
        if (!(preset.canonical.id in accumulator)) {
          accumulator[preset.canonical.id] = preset
        }
        return accumulator
      },
      {}
    )
  ).sort((left, right) => left.canonical.id.localeCompare(right.canonical.id))

  if (presetsForI18n.length === 0) {
    return []
  }

  const localeFiles: Record<SupportedLocale, Record<string, unknown>> = {
    ca: await readJsonFileOrDefault<Record<string, unknown>>(PLANNING_LOCALE_PATHS.ca, {}),
    es: await readJsonFileOrDefault<Record<string, unknown>>(PLANNING_LOCALE_PATHS.es, {}),
    en: await readJsonFileOrDefault<Record<string, unknown>>(PLANNING_LOCALE_PATHS.en, {}),
  }

  const requiredTags = [
    ...new Set(presetsForI18n.flatMap((preset) => preset.canonical.requiredTags)),
  ].sort((left, right) => left.localeCompare(right))

  for (const locale of SUPPORTED_LOCALES) {
    const planningLocale = localeFiles[locale]
    const ingestedPresets = getOrCreateRecord(planningLocale, 'ingested_presets')
    const presetTags = getOrCreateRecord(planningLocale, 'preset_tags')

    for (const preset of presetsForI18n) {
      const keyCandidates = [preset.sourceExternalId, preset.canonical.id]

      const englishName = getPayloadPresetField({
        i18n: options.i18n,
        locale: 'en',
        keyCandidates,
        field: 'name',
      })

      const englishDescription = getPayloadPresetField({
        i18n: options.i18n,
        locale: 'en',
        keyCandidates,
        field: 'description',
      })

      const rawName = getRawPresetField(
        options.rawPresetBySourceExternalId,
        preset.sourceExternalId,
        'title'
      )
      const rawDescription = getRawPresetField(
        options.rawPresetBySourceExternalId,
        preset.sourceExternalId,
        'description'
      )

      const existingName = readExistingPresetField(planningLocale, preset.canonical.id, 'name')
      const existingDescription = readExistingPresetField(
        planningLocale,
        preset.canonical.id,
        'description'
      )

      const name =
        getPayloadPresetField({
          i18n: options.i18n,
          locale,
          keyCandidates,
          field: 'name',
        }) ??
        englishName ??
        existingName ??
        rawName ??
        humanizeIdentifier(preset.canonical.id)

      const description =
        getPayloadPresetField({
          i18n: options.i18n,
          locale,
          keyCandidates,
          field: 'description',
        }) ??
        englishDescription ??
        existingDescription ??
        rawDescription ??
        humanizeIdentifier(preset.canonical.id)

      const presetEntry = getOrCreateRecord(ingestedPresets, preset.canonical.id)
      presetEntry.name = name
      presetEntry.description = description
    }

    for (const tag of requiredTags) {
      const englishTagLabel = getPayloadTagLabel({
        i18n: options.i18n,
        locale: 'en',
        tag,
      })
      const existingTagLabel = readExistingTagLabel(planningLocale, tag)

      const localizedTagLabel =
        getPayloadTagLabel({
          i18n: options.i18n,
          locale,
          tag,
        }) ??
        englishTagLabel ??
        existingTagLabel ??
        humanizeIdentifier(tag)

      presetTags[tag] = localizedTagLabel
    }

    planningLocale.ingested_presets = sortIngestedPresetTranslations(ingestedPresets)
    planningLocale.preset_tags = sortRecordByKey(presetTags)
  }

  const writes: MergeWriteResult[] = []

  for (const locale of SUPPORTED_LOCALES) {
    writes.push(
      await writeJsonRollbackSafe({
        targetPath: PLANNING_LOCALE_PATHS[locale],
        value: localeFiles[locale],
        backupDir: INGESTION_BACKUPS_DIR,
        dryRun: options.dryRun,
        backupPrefix: `${options.runId}-planning-${locale}`,
      })
    )
  }

  return writes
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

  // Schema must match data/ingestion/prompts/presets-llm-chat.prompt.txt
  const contract = {
    presets: [
      {
        sourceExternalId: 'generator_mode_example',
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
        weeklyProgression: 5,
        notes: 'string',
      },
      {
        sourceExternalId: 'faithful_mode_example',
        title: 'string',
        description: 'string',
        durationOptions: [4, 6, 8],
        requiredTags: ['corredor'],
        autoRestrictions: ['rehab_genoll'],
        progressionType: 'linear',
        weeklyProgression: 3,
        notes: 'string',
        sessions: [
          {
            label: 'Session A',
            exercises: [
              {
                exerciseId: 'Exercise_Id_1',
                sets: 3,
                reps: 10,
                restSeconds: 60,
                tempo: '3-1-0-1',
                rpe: 7,
              },
            ],
          },
        ],
      },
    ],
    i18n: {
      ca: {
        presets: {
          source_external_id_1: {
            name: 'string',
            description: 'string',
          },
        },
        preset_tags: {
          corredor: 'string',
        },
      },
      es: {
        presets: {
          source_external_id_1: {
            name: 'string',
            description: 'string',
          },
        },
        preset_tags: {
          corredor: 'string',
        },
      },
      en: {
        presets: {
          source_external_id_1: {
            name: 'string',
            description: 'string',
          },
        },
        preset_tags: {
          corredor: 'string',
        },
      },
    },
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
                          : filtered[0]
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
  const seededCatalog = seedHardcodedPresets(existingCatalog)

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
  const parsedResponse = extractPresetResponse(parsed)
  const rawPresets = parsedResponse.presets.slice(0, options.maxPresets)

  const rawPresetBySourceExternalId = new Map<string, RawPresetPayload>()

  const accepted: Array<Extract<NormalizedCandidate, { kind: 'preset' }>> = []
  const presetsForI18n: Array<Extract<NormalizedCandidate, { kind: 'preset' }>> = []
  const rejected: Array<{ sourceExternalId: string; reasons: string[] }> = []

  const existingIds = new Set(seededCatalog.map((preset) => preset.id))
  const stagedIds = new Set<string>()

  for (const [index, rawPreset] of rawPresets.entries()) {
    const envelope = toCandidateEnvelope(rawPreset, index)
    if (!rawPresetBySourceExternalId.has(envelope.payload.sourceExternalId)) {
      rawPresetBySourceExternalId.set(envelope.payload.sourceExternalId, rawPreset)
    }

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

    const baseErrors = [
      ...validation.errors.map((issue) => `${issue.field}: ${issue.message}`),
      ...referenceValidation.errors.map((issue) => `${issue.field}: ${issue.message}`),
    ]

    if (baseErrors.length === 0) {
      presetsForI18n.push(normalized)
    }

    const errors = [...baseErrors]

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
    ...seededCatalog,
    ...accepted.map((candidate) => buildPresetCatalogEntry(candidate)),
  ].sort((left, right) => left.id.localeCompare(right.id))

  const writeResult = await writeJsonRollbackSafe({
    targetPath: outputPath,
    value: mergedCatalog,
    backupDir: INGESTION_BACKUPS_DIR,
    dryRun: options.dryRun,
    backupPrefix: `${runId}-preset-catalog`,
  })

  await mergePresetI18nIntoPlanningLocales({
    presetsForI18n,
    rawPresetBySourceExternalId,
    i18n: parsedResponse.i18n,
    runId,
    dryRun: options.dryRun,
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
