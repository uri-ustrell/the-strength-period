import type {
  NormalizedCandidate,
  ReviewDecisionMap,
  ReviewQueue,
  ReviewQueueItem,
} from './contracts'
import { INGESTION_QUEUES_DIR } from './paths'
import {
  ensureDir,
  parseJsonWithMessage,
  readTextInput,
  toIsoTimestamp,
  writeJsonFile,
} from './utils'

export function createReviewQueueItem(
  candidate: NormalizedCandidate,
  reasons: string[]
): ReviewQueueItem {
  return {
    candidateId: candidate.candidateId,
    kind: candidate.kind,
    sourceId: candidate.source.sourceId,
    canonicalId: candidate.canonical.id,
    confidence: candidate.confidence,
    reasons,
    suggestedAction: candidate.confidence >= 0.75 ? 'accept' : 'reject',
  }
}

export function buildReviewQueue(runId: string, items: ReviewQueueItem[]): ReviewQueue {
  return {
    runId,
    createdAt: toIsoTimestamp(),
    items,
  }
}

export async function writeReviewQueue(queue: ReviewQueue): Promise<string> {
  await ensureDir(INGESTION_QUEUES_DIR)
  const queuePath = `${INGESTION_QUEUES_DIR}/${queue.runId}.review.json`
  await writeJsonFile(queuePath, queue)
  return queuePath
}

export async function loadReviewDecisions(
  inputPath: string | undefined,
  cwd: string
): Promise<ReviewDecisionMap> {
  if (!inputPath) {
    return {}
  }

  const raw = await readTextInput(inputPath, cwd)
  const parsed = parseJsonWithMessage<Record<string, string>>(raw, 'review decision file')

  const map: ReviewDecisionMap = {}
  for (const [candidateId, decision] of Object.entries(parsed)) {
    if (decision === 'accept' || decision === 'reject') {
      map[candidateId] = decision
    }
  }

  return map
}
