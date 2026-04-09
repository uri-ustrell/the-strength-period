import { resolve } from 'node:path'

import { getAdapterById, listAdapters } from './ingestion/adapters'
import { getArg, getNumberArg, hasFlag, parseArgs } from './ingestion/cli'
import type {
  IngestionConfigFile,
  IngestionReportItem,
  NormalizedCandidate,
  ReviewQueueItem,
  SourceRunConfig,
} from './ingestion/contracts'
import {
  createDedupContext,
  deduplicateCandidate,
  registerAcceptedCandidate,
} from './ingestion/dedup'
import { applyAcceptedCandidates, loadMergeState, persistMergeState } from './ingestion/merge'
import { normalizeCandidate } from './ingestion/normalizers'
import { ROOT_DIR } from './ingestion/paths'
import { runExercisePhotoPipeline } from './ingestion/photoPipeline'
import {
  createIngestionReport,
  toReportConsoleSummary,
  writeIngestionReport,
} from './ingestion/reports'
import {
  buildReviewQueue,
  createReviewQueueItem,
  loadReviewDecisions,
  writeReviewQueue,
} from './ingestion/reviewQueue'
import { readJsonFile, toIsoTimestamp, toRunId } from './ingestion/utils'
import {
  validateLicenseMetadata,
  validateNormalizedCandidate,
  validatePresetExerciseReferences,
} from './ingestion/validators'

type RuntimeOptions = {
  configPath: string
  runId: string
  dryRun: boolean
  autoAcceptConfidence: number
  reviewDecisionsPath?: string
  generatePhotos: boolean
  photoStyleRef?: string
  photoProvider?: 'pollinations' | 'huggingface' | 'nanobanana'
  photoModel?: string
  allowPaidPhotoProviders: boolean
}

function printHelp(): void {
  console.log(`
Step 18 Ingestion CLI

Usage:
  npm run ingest -- --config data/ingestion/sources.example.json [options]

Required:
  --config <path>               Ingestion source config JSON

Optional:
  --run-id <id>                 Override generated run id
  --dry-run                     Execute full pipeline without writing catalogs
  --auto-accept-confidence <n>  Auto-accept threshold (0..1), default 0.85
  --review-decisions <path>     JSON map of candidateId -> accept|reject
  --generate-photos             Trigger photo generation for accepted exercises
  --photo-style-ref <path|url>  Style reference asset for generated photos
  --photo-provider <id>         pollinations | huggingface | nanobanana
  --photo-model <model>         Provider-specific model override
  --allow-paid-photo-providers  Allow non-free providers when free tier is unavailable
  --list-adapters               Print available ingestion adapters and exit
  --help                        Print this help
`)
}

function printAdapters(): void {
  console.log('Available adapters:')
  for (const adapter of listAdapters()) {
    console.log(`- ${adapter.id}: ${adapter.description}`)
  }
}

function parseRuntimeOptions(): RuntimeOptions | null {
  const args = parseArgs(process.argv.slice(2))

  if (hasFlag(args, 'help')) {
    printHelp()
    return null
  }

  if (hasFlag(args, 'list-adapters')) {
    printAdapters()
    return null
  }

  const config = getArg(args, 'config')
  if (!config) {
    throw new Error('Missing --config <path>. Use --help for usage details.')
  }

  return {
    configPath: config,
    runId: getArg(args, 'run-id') ?? toRunId('ingestion'),
    dryRun: hasFlag(args, 'dry-run'),
    autoAcceptConfidence: getNumberArg(args, 'auto-accept-confidence', 0.85, {
      min: 0,
      max: 1,
    }),
    reviewDecisionsPath: getArg(args, 'review-decisions'),
    generatePhotos: hasFlag(args, 'generate-photos'),
    photoStyleRef: getArg(args, 'photo-style-ref'),
    photoProvider: getArg(args, 'photo-provider') as
      | 'pollinations'
      | 'huggingface'
      | 'nanobanana'
      | undefined,
    photoModel: getArg(args, 'photo-model'),
    allowPaidPhotoProviders: hasFlag(args, 'allow-paid-photo-providers'),
  }
}

function toSourceRunConfig(raw: SourceRunConfig): SourceRunConfig {
  return {
    ...raw,
    sourceType: raw.sourceType ?? (raw.adapter === 'llm-json' ? 'llm-json' : 'external-api'),
  }
}

function formatValidationIssues(
  issues: Array<{
    field: string
    message: string
  }>
): string[] {
  return issues.map((issue) => `${issue.field}: ${issue.message}`)
}

async function run(): Promise<void> {
  const options = parseRuntimeOptions()
  if (!options) {
    return
  }

  const startedAt = toIsoTimestamp()
  const configPath = options.configPath.startsWith('/')
    ? options.configPath
    : resolve(ROOT_DIR, options.configPath)

  const config = await readJsonFile<IngestionConfigFile>(configPath)
  if (!Array.isArray(config.sources) || config.sources.length === 0) {
    throw new Error('Ingestion config must include at least one source.')
  }

  const reviewDecisions = await loadReviewDecisions(options.reviewDecisionsPath, ROOT_DIR)
  const mergeState = await loadMergeState()
  const dedupContext = createDedupContext(
    mergeState.exercises,
    mergeState.presets,
    mergeState.sourceRegistry,
    mergeState.aliasMap
  )

  const availableExerciseIds = new Set(mergeState.exercises.map((exercise) => exercise.id))

  const reportItems: IngestionReportItem[] = []
  const reviewQueueItems: ReviewQueueItem[] = []
  const acceptedCandidates: NormalizedCandidate[] = []
  const acceptedExerciseIds: string[] = []
  const acceptedPresetIds: string[] = []
  const sourceSummaries: Array<{ sourceId: string; adapterId: string; candidateCount: number }> = []

  function markAccepted(candidate: NormalizedCandidate, reasons: string[]): void {
    acceptedCandidates.push(candidate)
    registerAcceptedCandidate(candidate, dedupContext)

    if (candidate.kind === 'exercise') {
      acceptedExerciseIds.push(candidate.canonical.id)
      availableExerciseIds.add(candidate.canonical.id)
    } else {
      acceptedPresetIds.push(candidate.canonical.id)
    }

    reportItems.push({
      candidateId: candidate.candidateId,
      kind: candidate.kind,
      sourceId: candidate.source.sourceId,
      sourceExternalId: candidate.sourceExternalId,
      status: 'accepted',
      confidence: candidate.confidence,
      reasons: reasons.length > 0 ? reasons : ['Accepted automatically.'],
      canonicalId: candidate.canonical.id,
    })
  }

  for (const rawSource of config.sources) {
    const source = toSourceRunConfig(rawSource)
    const adapter = getAdapterById(source.adapter)
    const candidates = await adapter.fetchCandidates(source)

    sourceSummaries.push({
      sourceId: source.sourceId,
      adapterId: adapter.id,
      candidateCount: candidates.length,
    })

    const licenseValidation = validateLicenseMetadata(source.license)
    if (licenseValidation.errors.length > 0) {
      const reasons = formatValidationIssues(licenseValidation.errors)
      for (const envelope of candidates) {
        reportItems.push({
          candidateId: envelope.candidateId,
          kind: envelope.payload.kind,
          sourceId: source.sourceId,
          sourceExternalId: envelope.payload.sourceExternalId,
          status: 'rejected',
          confidence: 0,
          reasons: ['Source license validation failed.', ...reasons],
        })
      }
      continue
    }

    const licenseWarnings = formatValidationIssues(licenseValidation.warnings)

    for (const envelope of candidates) {
      const normalized = normalizeCandidate(envelope)
      const schemaValidation = validateNormalizedCandidate(normalized)

      const errors = formatValidationIssues(schemaValidation.errors)
      const warnings = formatValidationIssues(schemaValidation.warnings)

      if (normalized.kind === 'preset') {
        const presetReferenceValidation = validatePresetExerciseReferences(
          normalized.canonical,
          availableExerciseIds
        )

        errors.push(...formatValidationIssues(presetReferenceValidation.errors))
        warnings.push(...formatValidationIssues(presetReferenceValidation.warnings))
      }

      if (errors.length > 0) {
        reportItems.push({
          candidateId: normalized.candidateId,
          kind: normalized.kind,
          sourceId: normalized.source.sourceId,
          sourceExternalId: normalized.sourceExternalId,
          status: 'rejected',
          confidence: normalized.confidence,
          reasons: errors,
          canonicalId: normalized.canonical.id,
        })
        continue
      }

      const dedup = deduplicateCandidate(normalized, dedupContext)

      if (dedup.status === 'duplicate') {
        reportItems.push({
          candidateId: normalized.candidateId,
          kind: normalized.kind,
          sourceId: normalized.source.sourceId,
          sourceExternalId: normalized.sourceExternalId,
          status: 'duplicate',
          confidence: normalized.confidence,
          reasons: dedup.reasons,
          canonicalId: normalized.canonical.id,
          duplicateOf: dedup.duplicateOf,
        })
        continue
      }

      const reviewReasons = [
        ...normalized.reviewReasons,
        ...warnings,
        ...licenseWarnings,
        ...dedup.reasons,
      ]

      const belowThreshold = normalized.confidence < options.autoAcceptConfidence
      if (belowThreshold) {
        reviewReasons.push(
          `Confidence ${normalized.confidence.toFixed(2)} below threshold ${options.autoAcceptConfidence.toFixed(2)}.`
        )
      }

      const needsReview = dedup.status === 'review' || reviewReasons.length > 0 || belowThreshold

      if (!needsReview) {
        markAccepted(normalized, [])
        continue
      }

      const explicitDecision = reviewDecisions[normalized.candidateId]

      if (explicitDecision === 'accept') {
        markAccepted(normalized, ['Accepted via review decision file.', ...reviewReasons])
        continue
      }

      if (explicitDecision === 'reject') {
        reportItems.push({
          candidateId: normalized.candidateId,
          kind: normalized.kind,
          sourceId: normalized.source.sourceId,
          sourceExternalId: normalized.sourceExternalId,
          status: 'rejected',
          confidence: normalized.confidence,
          reasons: ['Rejected via review decision file.', ...reviewReasons],
          canonicalId: normalized.canonical.id,
          duplicateOf: dedup.duplicateOf,
        })
        continue
      }

      reviewQueueItems.push(createReviewQueueItem(normalized, reviewReasons))
      reportItems.push({
        candidateId: normalized.candidateId,
        kind: normalized.kind,
        sourceId: normalized.source.sourceId,
        sourceExternalId: normalized.sourceExternalId,
        status: 'skipped',
        confidence: normalized.confidence,
        reasons: ['Pending manual review.', ...reviewReasons],
        canonicalId: normalized.canonical.id,
        duplicateOf: dedup.duplicateOf,
      })
    }
  }

  const mergedState = applyAcceptedCandidates(mergeState, acceptedCandidates)
  const writes = await persistMergeState({
    state: mergedState,
    dryRun: options.dryRun,
    runId: options.runId,
  })

  const filesWritten = writes.filter((write) => write.written).map((write) => write.targetPath)

  let reviewQueuePath: string | undefined
  if (reviewQueueItems.length > 0) {
    const reviewQueue = buildReviewQueue(options.runId, reviewQueueItems)
    reviewQueuePath = await writeReviewQueue(reviewQueue)
    filesWritten.push(reviewQueuePath)
  }

  let photosTriggered = false

  if (options.generatePhotos && acceptedExerciseIds.length > 0) {
    const photoRun = await runExercisePhotoPipeline({
      runId: `${options.runId}-photos`,
      mode: 'ingestion-accepted',
      dryRun: options.dryRun,
      styleReferenceInput: options.photoStyleRef,
      providerId: options.photoProvider,
      model: options.photoModel,
      ingestionExerciseIds: acceptedExerciseIds,
      allowPaidProviders: options.allowPaidPhotoProviders,
    })

    photosTriggered = photoRun.requestedExerciseIds.length > 0

    filesWritten.push(photoRun.metadataPath)
    if (photoRun.catalogWrite?.written) {
      filesWritten.push(photoRun.catalogWrite.targetPath)
    }

    for (const failure of photoRun.failedExerciseIds) {
      reportItems.push({
        candidateId: `${photoRun.runId}:photo:${failure.exerciseId}`,
        kind: 'exercise',
        sourceId: 'photo-pipeline',
        sourceExternalId: failure.exerciseId,
        status: 'skipped',
        confidence: 0,
        reasons: [`Photo generation failed: ${failure.error}`],
        canonicalId: failure.exerciseId,
      })
    }
  }

  const report = createIngestionReport({
    runId: options.runId,
    startedAt,
    dryRun: options.dryRun,
    items: reportItems,
    acceptedExerciseIds,
    acceptedPresetIds,
    sources: sourceSummaries,
    reviewQueuePath,
    photosTriggered,
    filesWritten,
  })

  const reportPath = await writeIngestionReport(report)

  console.log(toReportConsoleSummary(report))
  console.log(`Report file: ${reportPath}`)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Ingestion failed: ${message}`)
  process.exitCode = 1
})
