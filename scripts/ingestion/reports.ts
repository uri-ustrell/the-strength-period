import type { IngestionReport, IngestionReportItem } from './contracts'
import { INGESTION_REPORTS_DIR } from './paths'
import { ensureDir, toIsoTimestamp, writeJsonFile } from './utils'

function countByStatus(
  items: IngestionReportItem[],
  status: IngestionReportItem['status']
): number {
  return items.filter((item) => item.status === status).length
}

export function createIngestionReport(input: {
  runId: string
  startedAt: string
  dryRun: boolean
  items: IngestionReportItem[]
  acceptedExerciseIds: string[]
  acceptedPresetIds: string[]
  sources: Array<{
    sourceId: string
    adapterId: string
    candidateCount: number
  }>
  reviewQueuePath?: string
  photosTriggered: boolean
  filesWritten: string[]
}): IngestionReport {
  return {
    runId: input.runId,
    startedAt: input.startedAt,
    completedAt: toIsoTimestamp(),
    dryRun: input.dryRun,
    counts: {
      accepted: countByStatus(input.items, 'accepted'),
      skipped: countByStatus(input.items, 'skipped'),
      duplicate: countByStatus(input.items, 'duplicate'),
      rejected: countByStatus(input.items, 'rejected'),
    },
    acceptedExerciseIds: input.acceptedExerciseIds,
    acceptedPresetIds: input.acceptedPresetIds,
    reviewQueuePath: input.reviewQueuePath,
    photosTriggered: input.photosTriggered,
    filesWritten: input.filesWritten,
    sources: input.sources,
    items: input.items,
  }
}

export async function writeIngestionReport(report: IngestionReport): Promise<string> {
  await ensureDir(INGESTION_REPORTS_DIR)
  const reportPath = `${INGESTION_REPORTS_DIR}/${report.runId}.json`
  await writeJsonFile(reportPath, report)
  return reportPath
}

export function toReportConsoleSummary(report: IngestionReport): string {
  return [
    `Run: ${report.runId}`,
    `Dry run: ${report.dryRun ? 'yes' : 'no'}`,
    `Accepted: ${report.counts.accepted}`,
    `Skipped: ${report.counts.skipped}`,
    `Duplicate: ${report.counts.duplicate}`,
    `Rejected: ${report.counts.rejected}`,
    `Accepted exercises: ${report.acceptedExerciseIds.length}`,
    `Accepted presets: ${report.acceptedPresetIds.length}`,
    `Photos triggered: ${report.photosTriggered ? 'yes' : 'no'}`,
    report.reviewQueuePath ? `Review queue: ${report.reviewQueuePath}` : 'Review queue: none',
  ].join('\n')
}
