import {
  FAMILY_ORDER,
  TOTEM_CATALOG_V2,
  type TotemId,
  type TotemInventoryModel,
} from '@/services/stats/buildTotemInventoryModel'

/**
 * Step 16 Phase E sub-phase E1 — Earn-acknowledgement payload selector.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase E Shared Contracts → E1 — Earn-Acknowledgement Frame Contract".
 *
 * Pure function. Diffs the totem inventory state **before** vs **after** the
 * just-finished session and returns the ordered list of newly-earned totems
 * (or `null` when none). Does NOT extend `SessionCompletionModel` — the
 * payload is wired through props from the page-level effect that owns the
 * before/after models. Architect-confirmed deviation from the original
 * model-extension sketch.
 */
export type SessionCompletionTotemPayload = {
  /** Just-finished session id; key for the in-component idempotency latch (E2). */
  sessionId: string
  /** Newly earned totem ids, ordered by `FAMILY_ORDER` then `TOTEM_CATALOG_V2` index. */
  newlyEarnedIds: TotemId[]
  /** First of `newlyEarnedIds`; the focus of the frame. */
  primaryTotemId: TotemId
  /** Copy-prefix for the inline ack (the `YYYY-MM-DD` of the just-finished session). */
  earnedDateISO: string
}

export type BuildSessionCompletionTotemPayloadInput = {
  totemsBefore: TotemInventoryModel
  totemsAfter: TotemInventoryModel
  sessionId: string
  /** `YYYY-MM-DD` of the just-finished session. */
  dateISO: string
}

const familyRank = (id: TotemId): number => {
  const entry = TOTEM_CATALOG_V2.find((e) => e.id === id)
  if (!entry) return FAMILY_ORDER.length
  return FAMILY_ORDER.indexOf(entry.family)
}

const catalogRank = (id: TotemId): number => TOTEM_CATALOG_V2.findIndex((e) => e.id === id)

export function buildSessionCompletionTotemPayload(
  input: BuildSessionCompletionTotemPayloadInput
): SessionCompletionTotemPayload | null {
  const earnedBeforeIds = new Set<TotemId>(
    input.totemsBefore.totems.filter((t) => t.state === 'earned').map((t) => t.id)
  )

  const newlyEarnedIds = input.totemsAfter.totems
    .filter((t) => t.state === 'earned' && !earnedBeforeIds.has(t.id))
    .map((t) => t.id)
    .sort((a, b) => {
      const fr = familyRank(a) - familyRank(b)
      if (fr !== 0) return fr
      return catalogRank(a) - catalogRank(b)
    })

  if (newlyEarnedIds.length === 0) return null
  const primaryTotemId = newlyEarnedIds[0]!

  return {
    sessionId: input.sessionId,
    newlyEarnedIds,
    primaryTotemId,
    earnedDateISO: input.dateISO,
  }
}
