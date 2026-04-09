import { resolve } from 'node:path'

import type { MergeWriteResult } from './contracts'
import { INGESTION_BACKUPS_DIR, ROOT_DIR } from './paths'
import { readJsonFileOrDefault, writeJsonRollbackSafe } from './utils'

const SUPPORTED_LOCALES = ['ca', 'es', 'en'] as const

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

type RawExerciseTranslation = {
  name?: string
  instructions?: string[]
}

type ParsedLocaleIngestionI18n = {
  exercises: Record<string, RawExerciseTranslation>
  presetTags: Record<string, string>
}

export type ParsedIngestionI18n = Partial<Record<SupportedLocale, ParsedLocaleIngestionI18n>>

export type ExerciseI18nUpdate = {
  sourceId: string
  sourceExternalId: string
  canonicalExerciseId: string
  tags: string[]
}

const EXERCISE_LOCALE_PATHS: Record<SupportedLocale, string> = {
  ca: resolve(ROOT_DIR, 'src/i18n/locales/ca/exercises.json'),
  es: resolve(ROOT_DIR, 'src/i18n/locales/es/exercises.json'),
  en: resolve(ROOT_DIR, 'src/i18n/locales/en/exercises.json'),
}

const PLANNING_LOCALE_PATHS: Record<SupportedLocale, string> = {
  ca: resolve(ROOT_DIR, 'src/i18n/locales/ca/planning.json'),
  es: resolve(ROOT_DIR, 'src/i18n/locales/es/planning.json'),
  en: resolve(ROOT_DIR, 'src/i18n/locales/en/planning.json'),
}

type I18nMergeFileIO = {
  readJsonFileOrDefault: <T>(path: string, fallback: T) => Promise<T>
  writeJsonRollbackSafe: (options: {
    targetPath: string
    value: unknown
    backupDir: string
    dryRun: boolean
    backupPrefix?: string
  }) => Promise<MergeWriteResult>
}

const defaultI18nMergeFileIO: I18nMergeFileIO = {
  readJsonFileOrDefault,
  writeJsonRollbackSafe,
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

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const values: string[] = []

  for (const item of value) {
    const normalized = toTrimmedString(item)
    if (!normalized) {
      continue
    }
    values.push(normalized)
  }

  return values
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

function parseExerciseTranslations(raw: unknown): Record<string, RawExerciseTranslation> {
  if (!isRecord(raw)) {
    return {}
  }

  const translations: Record<string, RawExerciseTranslation> = {}

  for (const [key, value] of Object.entries(raw)) {
    if (!isRecord(value)) {
      continue
    }

    const name = toTrimmedString(value.name)
    const instructions = toStringArray(value.instructions)

    if (!name && instructions.length === 0) {
      continue
    }

    translations[key] = {
      name,
      instructions: instructions.length > 0 ? instructions : undefined,
    }
  }

  return translations
}

function parseTagLabels(raw: unknown): Record<string, string> {
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

function parseIngestionI18n(raw: unknown): ParsedIngestionI18n | undefined {
  if (!isRecord(raw)) {
    return undefined
  }

  const parsed: ParsedIngestionI18n = {}

  for (const locale of SUPPORTED_LOCALES) {
    const rawLocale = raw[locale]
    if (!isRecord(rawLocale)) {
      continue
    }

    const exercises = parseExerciseTranslations(rawLocale.exercises)
    const presetTags = {
      ...parseTagLabels(rawLocale.tags),
      ...parseTagLabels(rawLocale.preset_tags),
    }

    if (Object.keys(exercises).length === 0 && Object.keys(presetTags).length === 0) {
      continue
    }

    parsed[locale] = {
      exercises,
      presetTags,
    }
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined
}

function getPayloadExerciseTranslation(options: {
  i18n: ParsedIngestionI18n | undefined
  locale: SupportedLocale
  keyCandidates: string[]
}): RawExerciseTranslation | undefined {
  const localePayload = options.i18n?.[options.locale]
  if (!localePayload) {
    return undefined
  }

  for (const key of options.keyCandidates) {
    const entry = localePayload.exercises[key]
    if (entry) {
      return entry
    }
  }

  return undefined
}

function getPayloadExerciseName(options: {
  i18n: ParsedIngestionI18n | undefined
  locale: SupportedLocale
  keyCandidates: string[]
}): string | undefined {
  return getPayloadExerciseTranslation(options)?.name
}

function getPayloadExerciseInstructions(options: {
  i18n: ParsedIngestionI18n | undefined
  locale: SupportedLocale
  keyCandidates: string[]
}): string[] | undefined {
  return getPayloadExerciseTranslation(options)?.instructions
}

function getPayloadTagLabel(options: {
  i18n: ParsedIngestionI18n | undefined
  locale: SupportedLocale
  tag: string
}): string | undefined {
  const localePayload = options.i18n?.[options.locale]
  if (!localePayload) {
    return undefined
  }

  return localePayload.presetTags[options.tag]
}

function readExistingExerciseName(
  localeData: Record<string, unknown>,
  exerciseId: string
): string | undefined {
  return toTrimmedString(localeData[exerciseId])
}

function readExistingExerciseInstructions(
  localeData: Record<string, unknown>,
  exerciseId: string
): string[] | undefined {
  const instructions = localeData.instructions
  if (!isRecord(instructions)) {
    return undefined
  }

  const normalized = toStringArray(instructions[exerciseId])
  return normalized.length > 0 ? normalized : undefined
}

function readExistingTagLabel(
  localeData: Record<string, unknown>,
  tag: string
): string | undefined {
  const presetTags = localeData.preset_tags
  if (!isRecord(presetTags)) {
    return undefined
  }

  return toTrimmedString(presetTags[tag])
}

function sortInstructionsRecord(record: Record<string, unknown>): Record<string, unknown> {
  const sorted = sortRecordByKey(record)

  for (const key of Object.keys(sorted)) {
    const instructions = toStringArray(sorted[key])
    if (instructions.length > 0) {
      sorted[key] = instructions
    }
  }

  return sorted
}

function sortExerciseLocaleData(localeData: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {}

  const exerciseIds = Object.keys(localeData)
    .filter((key) => key !== 'instructions')
    .sort((left, right) => left.localeCompare(right))

  for (const exerciseId of exerciseIds) {
    sorted[exerciseId] = localeData[exerciseId]
  }

  if (isRecord(localeData.instructions)) {
    sorted.instructions = sortInstructionsRecord(localeData.instructions)
  }

  return sorted
}

function sortPlanningLocaleData(localeData: Record<string, unknown>): Record<string, unknown> {
  const sorted = {
    ...localeData,
  }

  if (isRecord(sorted.preset_tags)) {
    sorted.preset_tags = sortRecordByKey(sorted.preset_tags)
  }

  return sorted
}

type GroupedExerciseI18nUpdate = {
  canonicalExerciseId: string
  updates: ExerciseI18nUpdate[]
  tags: string[]
}

function normalizeAndSortTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function sortUpdatesDeterministically(updates: ExerciseI18nUpdate[]): ExerciseI18nUpdate[] {
  return [...updates].sort((left, right) => {
    const sourceIdComparison = left.sourceId.localeCompare(right.sourceId)
    if (sourceIdComparison !== 0) {
      return sourceIdComparison
    }

    const sourceExternalIdComparison = left.sourceExternalId.localeCompare(right.sourceExternalId)
    if (sourceExternalIdComparison !== 0) {
      return sourceExternalIdComparison
    }

    return left.canonicalExerciseId.localeCompare(right.canonicalExerciseId)
  })
}

function groupUpdatesByCanonicalId(updates: ExerciseI18nUpdate[]): GroupedExerciseI18nUpdate[] {
  const byCanonicalId = new Map<string, ExerciseI18nUpdate[]>()

  for (const update of updates) {
    const normalizedUpdate: ExerciseI18nUpdate = {
      ...update,
      tags: normalizeAndSortTags(update.tags),
    }

    const existing = byCanonicalId.get(update.canonicalExerciseId) ?? []
    existing.push(normalizedUpdate)
    byCanonicalId.set(update.canonicalExerciseId, existing)
  }

  return [...byCanonicalId.entries()]
    .sort(([leftCanonicalId], [rightCanonicalId]) =>
      leftCanonicalId.localeCompare(rightCanonicalId)
    )
    .map(([canonicalExerciseId, groupedUpdates]) => {
      const sortedUpdates = sortUpdatesDeterministically(groupedUpdates)

      return {
        canonicalExerciseId,
        updates: sortedUpdates,
        tags: normalizeAndSortTags(sortedUpdates.flatMap((update) => update.tags)),
      }
    })
}

function uniqueKeyCandidates(update: ExerciseI18nUpdate): string[] {
  return [...new Set([update.sourceExternalId, update.canonicalExerciseId])].filter(
    (value) => value.trim().length > 0
  )
}

function getExerciseNameForLocale(options: {
  locale: SupportedLocale
  updates: ExerciseI18nUpdate[]
  sourceI18nBySourceId: ReadonlyMap<string, ParsedIngestionI18n>
}): string | undefined {
  for (const update of options.updates) {
    const sourceI18n = options.sourceI18nBySourceId.get(update.sourceId)
    const keyCandidates = uniqueKeyCandidates(update)
    const name = getPayloadExerciseName({
      i18n: sourceI18n,
      locale: options.locale,
      keyCandidates,
    })

    if (name) {
      return name
    }
  }

  return undefined
}

function getExerciseInstructionsForLocale(options: {
  locale: SupportedLocale
  updates: ExerciseI18nUpdate[]
  sourceI18nBySourceId: ReadonlyMap<string, ParsedIngestionI18n>
}): string[] | undefined {
  for (const update of options.updates) {
    const sourceI18n = options.sourceI18nBySourceId.get(update.sourceId)
    const keyCandidates = uniqueKeyCandidates(update)
    const instructions = getPayloadExerciseInstructions({
      i18n: sourceI18n,
      locale: options.locale,
      keyCandidates,
    })

    if (instructions && instructions.length > 0) {
      return instructions
    }
  }

  return undefined
}

function getTagLabelForLocale(options: {
  tag: string
  locale: SupportedLocale
  updates: ExerciseI18nUpdate[]
  sourceI18nBySourceId: ReadonlyMap<string, ParsedIngestionI18n>
}): string | undefined {
  for (const update of options.updates) {
    if (!update.tags.includes(options.tag)) {
      continue
    }

    const sourceI18n = options.sourceI18nBySourceId.get(update.sourceId)
    const label = getPayloadTagLabel({
      i18n: sourceI18n,
      locale: options.locale,
      tag: options.tag,
    })

    if (label) {
      return label
    }
  }

  return undefined
}

export function parseLlmIngestionI18n(payload: unknown): ParsedIngestionI18n | undefined {
  if (!isRecord(payload)) {
    return undefined
  }

  return parseIngestionI18n(payload.i18n)
}

export function validateLlmExerciseI18nContract(options: {
  sourceI18n: ParsedIngestionI18n | undefined
  sourceExternalId: string
  canonicalExerciseId: string
  tags: string[]
}): string[] {
  const reasons = new Set<string>()
  const keyCandidates = [options.sourceExternalId, options.canonicalExerciseId]
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate.length > 0)

  if (keyCandidates.length === 0) {
    keyCandidates.push(options.canonicalExerciseId)
  }

  const keyLabel = keyCandidates.map((candidate) => `"${candidate}"`).join(' or ')
  const requiredTags = normalizeAndSortTags(options.tags)

  for (const locale of SUPPORTED_LOCALES) {
    const localePayload = options.sourceI18n?.[locale]
    if (!localePayload) {
      reasons.add(`LLM i18n contract missing i18n.${locale} block.`)
      continue
    }

    const hasLocalizedName = keyCandidates.some((candidate) => {
      const entry = localePayload.exercises[candidate]
      return Boolean(entry?.name && entry.name.trim().length > 0)
    })

    if (!hasLocalizedName) {
      reasons.add(`LLM i18n contract missing i18n.${locale}.exercises[${keyLabel}].name.`)
    }

    for (const tag of requiredTags) {
      const label = localePayload.presetTags[tag]
      if (!label || label.trim().length === 0) {
        reasons.add(`LLM i18n contract missing i18n.${locale}.preset_tags.${tag}.`)
      }
    }
  }

  return [...reasons].sort((left, right) => left.localeCompare(right))
}

export async function mergeExerciseI18nIntoLocales(
  options: {
    updates: ExerciseI18nUpdate[]
    sourceI18nBySourceId: ReadonlyMap<string, ParsedIngestionI18n>
    runId: string
    dryRun: boolean
  },
  fileIO: I18nMergeFileIO = defaultI18nMergeFileIO
): Promise<MergeWriteResult[]> {
  const groupedUpdates = groupUpdatesByCanonicalId(options.updates)

  if (groupedUpdates.length === 0) {
    return []
  }

  const exerciseLocales: Record<SupportedLocale, Record<string, unknown>> = {
    ca: await fileIO.readJsonFileOrDefault<Record<string, unknown>>(EXERCISE_LOCALE_PATHS.ca, {}),
    es: await fileIO.readJsonFileOrDefault<Record<string, unknown>>(EXERCISE_LOCALE_PATHS.es, {}),
    en: await fileIO.readJsonFileOrDefault<Record<string, unknown>>(EXERCISE_LOCALE_PATHS.en, {}),
  }

  const planningLocales: Record<SupportedLocale, Record<string, unknown>> = {
    ca: await fileIO.readJsonFileOrDefault<Record<string, unknown>>(PLANNING_LOCALE_PATHS.ca, {}),
    es: await fileIO.readJsonFileOrDefault<Record<string, unknown>>(PLANNING_LOCALE_PATHS.es, {}),
    en: await fileIO.readJsonFileOrDefault<Record<string, unknown>>(PLANNING_LOCALE_PATHS.en, {}),
  }

  const originalExerciseLocales = {
    ca: JSON.stringify(exerciseLocales.ca),
    es: JSON.stringify(exerciseLocales.es),
    en: JSON.stringify(exerciseLocales.en),
  }

  const originalPlanningLocales = {
    ca: JSON.stringify(planningLocales.ca),
    es: JSON.stringify(planningLocales.es),
    en: JSON.stringify(planningLocales.en),
  }

  const tags = normalizeAndSortTags(groupedUpdates.flatMap((updateGroup) => updateGroup.tags))
  const updatesForTagResolution = groupedUpdates.flatMap((updateGroup) => updateGroup.updates)

  for (const locale of SUPPORTED_LOCALES) {
    const exerciseLocale = exerciseLocales[locale]
    const planningLocale = planningLocales[locale]

    const instructions = getOrCreateRecord(exerciseLocale, 'instructions')
    const presetTags = getOrCreateRecord(planningLocale, 'preset_tags')

    for (const updateGroup of groupedUpdates) {
      const existingName = readExistingExerciseName(exerciseLocale, updateGroup.canonicalExerciseId)
      const englishName = getExerciseNameForLocale({
        locale: 'en',
        updates: updateGroup.updates,
        sourceI18nBySourceId: options.sourceI18nBySourceId,
      })

      const localizedName =
        getExerciseNameForLocale({
          locale,
          updates: updateGroup.updates,
          sourceI18nBySourceId: options.sourceI18nBySourceId,
        }) ??
        englishName ??
        existingName ??
        humanizeIdentifier(updateGroup.canonicalExerciseId)

      exerciseLocale[updateGroup.canonicalExerciseId] = localizedName

      const existingInstructions = readExistingExerciseInstructions(
        exerciseLocale,
        updateGroup.canonicalExerciseId
      )

      const englishInstructions = getExerciseInstructionsForLocale({
        locale: 'en',
        updates: updateGroup.updates,
        sourceI18nBySourceId: options.sourceI18nBySourceId,
      })

      const localizedInstructions = getExerciseInstructionsForLocale({
        locale,
        updates: updateGroup.updates,
        sourceI18nBySourceId: options.sourceI18nBySourceId,
      }) ??
        englishInstructions ??
        existingInstructions ?? [humanizeIdentifier(updateGroup.canonicalExerciseId)]

      if (localizedInstructions && localizedInstructions.length > 0) {
        instructions[updateGroup.canonicalExerciseId] = localizedInstructions
      }
    }

    for (const tag of tags) {
      const englishTagLabel = getTagLabelForLocale({
        tag,
        locale: 'en',
        updates: updatesForTagResolution,
        sourceI18nBySourceId: options.sourceI18nBySourceId,
      })

      const existingTagLabel = readExistingTagLabel(planningLocale, tag)

      const localizedTagLabel =
        getTagLabelForLocale({
          tag,
          locale,
          updates: updatesForTagResolution,
          sourceI18nBySourceId: options.sourceI18nBySourceId,
        }) ??
        englishTagLabel ??
        existingTagLabel ??
        humanizeIdentifier(tag)

      presetTags[tag] = localizedTagLabel
    }

    exerciseLocales[locale] = sortExerciseLocaleData(exerciseLocale)
    planningLocales[locale] = sortPlanningLocaleData(planningLocale)
  }

  const writes: MergeWriteResult[] = []

  for (const locale of SUPPORTED_LOCALES) {
    const exerciseLocale = exerciseLocales[locale]
    const planningLocale = planningLocales[locale]

    const exerciseChanged = originalExerciseLocales[locale] !== JSON.stringify(exerciseLocale)
    const planningChanged = originalPlanningLocales[locale] !== JSON.stringify(planningLocale)

    if (exerciseChanged) {
      writes.push(
        await fileIO.writeJsonRollbackSafe({
          targetPath: EXERCISE_LOCALE_PATHS[locale],
          value: exerciseLocale,
          backupDir: INGESTION_BACKUPS_DIR,
          dryRun: options.dryRun,
          backupPrefix: `${options.runId}-exercises-${locale}`,
        })
      )
    } else {
      writes.push({
        targetPath: EXERCISE_LOCALE_PATHS[locale],
        written: false,
      })
    }

    if (planningChanged) {
      writes.push(
        await fileIO.writeJsonRollbackSafe({
          targetPath: PLANNING_LOCALE_PATHS[locale],
          value: planningLocale,
          backupDir: INGESTION_BACKUPS_DIR,
          dryRun: options.dryRun,
          backupPrefix: `${options.runId}-planning-${locale}`,
        })
      )
    } else {
      writes.push({
        targetPath: PLANNING_LOCALE_PATHS[locale],
        written: false,
      })
    }
  }

  return writes
}
