import type { Exercise } from '@/types/exercise'
import type { PresetSessionTemplate } from '@/types/planning'

export type PresetValidationResult = { ok: true } | { ok: false; missingIds: string[] }

/**
 * Verify every exerciseId referenced in `sessions` exists in the available catalog.
 * Returns the list of missing IDs (deduped, ordered by first appearance) so the UI
 * can highlight offending rows and block the save.
 */
export function validatePresetExercises(
  sessions: PresetSessionTemplate[],
  allExercises: Exercise[]
): PresetValidationResult {
  const known = new Set<string>()
  for (const ex of allExercises) {
    known.add(ex.id)
  }

  const missing: string[] = []
  for (const session of sessions) {
    for (const entry of session.exercises) {
      if (!entry.exerciseId) continue
      if (!known.has(entry.exerciseId) && !missing.includes(entry.exerciseId)) {
        missing.push(entry.exerciseId)
      }
    }
  }

  if (missing.length === 0) return { ok: true }
  return { ok: false, missingIds: missing }
}
