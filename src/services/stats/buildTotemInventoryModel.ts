import type { Mesocycle, SessionTemplate } from '@/types/planning'
import type { ExecutedSession, ExecutedSet } from '@/types/session'

/**
 * Step 16 Phase D — Shared totem inventory model.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase D Shared Contracts (Stats / Inventory)". This module is the single
 * source of truth for totem-inventory rendering across every aesthetic
 * variant (`retro-platformer`, `classic-boring`, …). Pure function: zero
 * React, zero IO, zero `matchMedia`, zero direct store reads. `nowMs` is
 * injected so callers control the clock (deterministic in tests, fresh in
 * production).
 *
 * The model is **time-window-agnostic** and **cumulative** — totems are
 * permanent and never recomputed against a sliding period; the existing
 * Stats page period selector deliberately does NOT scope this model.
 *
 * State is exactly two values: `'earned' | 'available'`. The model NEVER
 * emits `'locked'` — unearned totems are not "missed", they simply lie
 * ahead on the path.
 */

export type TotemId =
  | 'first-session'
  | 'first-week'
  | 'three-weeks-present'
  | 'eight-week-rhythm'
  | 'return-after-break'
  | 'first-mesocycle-complete'
  | 'first-deload-honored'
  | 'rpe-awareness'

export type TotemFamily = 'consistency' | 'recovery' | 'reflection'

export type TotemState = 'earned' | 'available'

export type TotemEntry = {
  id: TotemId
  family: TotemFamily
  state: TotemState
  /** ISO date (`YYYY-MM-DD`) of the eligibility-tipping event; null when `available`. */
  earnedDateISO: string | null
  nameI18nKey: string
  ruleI18nKey: string
}

export type TotemCatalogEntry = {
  id: TotemId
  family: TotemFamily
  nameI18nKey: string
  ruleI18nKey: string
}

export type TotemInventoryModel = {
  totems: TotemEntry[]
}

export type BuildTotemInventoryInput = {
  executedSessions: ReadonlyArray<ExecutedSession>
  executedSets: ReadonlyArray<ExecutedSet>
  mesocycles: ReadonlyArray<Mesocycle>
  /** Caller-injected clock. Required (no implicit `Date.now()`). */
  nowMs: number
}

/**
 * Locked v1 totem catalog (deterministic, exhaustive). Order is the canonical
 * tab order: Consistency → Recovery → Reflection, then by catalog index.
 *
 * Adding a totem here is the only supported way to extend the inventory; the
 * catalog is intentionally additive so deferred totems (warm-up, pain-flag,
 * notes, …) can land later without breaking the contract.
 */
export const TOTEM_CATALOG_V1: ReadonlyArray<TotemCatalogEntry> = [
  {
    id: 'first-session',
    family: 'consistency',
    nameI18nKey: 'stats:totem.first_session.name',
    ruleI18nKey: 'stats:totem.first_session.rule',
  },
  {
    id: 'first-week',
    family: 'consistency',
    nameI18nKey: 'stats:totem.first_week.name',
    ruleI18nKey: 'stats:totem.first_week.rule',
  },
  {
    id: 'three-weeks-present',
    family: 'consistency',
    nameI18nKey: 'stats:totem.three_weeks_present.name',
    ruleI18nKey: 'stats:totem.three_weeks_present.rule',
  },
  {
    id: 'eight-week-rhythm',
    family: 'consistency',
    nameI18nKey: 'stats:totem.eight_week_rhythm.name',
    ruleI18nKey: 'stats:totem.eight_week_rhythm.rule',
  },
  {
    id: 'return-after-break',
    family: 'consistency',
    nameI18nKey: 'stats:totem.return_after_break.name',
    ruleI18nKey: 'stats:totem.return_after_break.rule',
  },
  {
    id: 'first-mesocycle-complete',
    family: 'consistency',
    nameI18nKey: 'stats:totem.first_mesocycle_complete.name',
    ruleI18nKey: 'stats:totem.first_mesocycle_complete.rule',
  },
  {
    id: 'first-deload-honored',
    family: 'recovery',
    nameI18nKey: 'stats:totem.first_deload_honored.name',
    ruleI18nKey: 'stats:totem.first_deload_honored.rule',
  },
  {
    id: 'rpe-awareness',
    family: 'reflection',
    nameI18nKey: 'stats:totem.rpe_awareness.name',
    ruleI18nKey: 'stats:totem.rpe_awareness.rule',
  },
]

/**
 * Mirrors `buildDashboardMap.isDeloadSession` exactly. Phase D requires
 * the deload-honored totem to use the same heuristic so dashboard and
 * stats stay coherent. Conservative — returns `true` only when the
 * template explicitly carries the marker.
 */
export function isDeloadSession(template: SessionTemplate): boolean {
  return (template as { isDeload?: boolean }).isDeload === true
}

/**
 * Returns the "ISO-week ordinal" for a `YYYY-MM-DD` date — i.e. the index
 * (in weeks since the UNIX epoch) of the Monday that opens the date's ISO
 * week. Two dates fall in the same ISO week iff their ordinals are equal,
 * and consecutive ISO weeks differ by exactly 1.
 */
function isoWeekOrdinal(dateISO: string): number {
  const d = new Date(`${dateISO}T00:00:00Z`)
  // ISO week starts Monday; getUTCDay returns Sun=0..Sat=6.
  const dow = (d.getUTCDay() + 6) % 7
  const mondayMs = d.getTime() - dow * 86400000
  return Math.floor(mondayMs / 86400000 / 7)
}

/** Returns completed (non-skipped, with `completedAt`) sessions sorted by date. */
function completedSessionsSorted(input: BuildTotemInventoryInput): ExecutedSession[] {
  return input.executedSessions
    .filter((s) => !s.skipped && Boolean(s.completedAt))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Returns the date of the FIRST completed session that closes a run of
 * `k` consecutive ISO weeks (each containing ≥1 completed session), or
 * `null` if no such run exists. The "tipping" date is the earliest
 * completion date in the k-th week of the run — that is the eligibility-
 * tipping event per the spec.
 */
function consecutiveRunReachedDate(
  completed: ReadonlyArray<ExecutedSession>,
  k: number
): string | null {
  if (k <= 0 || completed.length === 0) return null
  const earliestByWeek = new Map<number, string>()
  for (const s of completed) {
    const ord = isoWeekOrdinal(s.date)
    const prev = earliestByWeek.get(ord)
    if (!prev || s.date < prev) earliestByWeek.set(ord, s.date)
  }
  const sorted = [...earliestByWeek.keys()].sort((a, b) => a - b)
  let runStart = -1
  let runLen = 0
  let prev = Number.NEGATIVE_INFINITY
  for (const o of sorted) {
    if (o === prev + 1) {
      runLen += 1
    } else {
      runLen = 1
      runStart = o
    }
    if (runLen >= k) {
      const tippingWeek = runStart + k - 1
      return earliestByWeek.get(tippingWeek) ?? null
    }
    prev = o
  }
  return null
}

function evalFirstSession(input: BuildTotemInventoryInput): string | null {
  return completedSessionsSorted(input)[0]?.date ?? null
}

function evalFirstWeek(input: BuildTotemInventoryInput): string | null {
  // First completed session implies "≥1 session in some ISO week".
  return completedSessionsSorted(input)[0]?.date ?? null
}

function evalReturnAfterBreak(input: BuildTotemInventoryInput): string | null {
  const c = completedSessionsSorted(input)
  for (let i = 1; i < c.length; i += 1) {
    const prev = c[i - 1]
    const cur = c[i]
    if (!prev || !cur) continue
    const prevMs = Date.parse(`${prev.date}T00:00:00Z`)
    const curMs = Date.parse(`${cur.date}T00:00:00Z`)
    const gapDays = Math.floor((curMs - prevMs) / 86400000)
    if (gapDays >= 14) return cur.date
  }
  return null
}

function evalFirstMesocycleComplete(input: BuildTotemInventoryInput): string | null {
  // Return the EARLIEST tipping-date across mesocycles whose every
  // non-skipped template is `completed`. Tipping date = latest completion
  // among matching ExecutedSessions for that mesocycle's templates.
  let earliestTip: string | null = null
  for (const meso of input.mesocycles) {
    const nonSkipped = meso.sessions.filter((s) => !s.skipped)
    if (nonSkipped.length === 0) continue
    if (!nonSkipped.every((s) => s.completed)) continue
    const templateIds = new Set(nonSkipped.map((s) => s.id))
    const matching = input.executedSessions
      .filter(
        (es) => !es.skipped && Boolean(es.completedAt) && templateIds.has(es.sessionTemplateId)
      )
      .map((es) => es.date)
      .sort()
    const tip = matching[matching.length - 1] ?? null
    if (tip && (!earliestTip || tip < earliestTip)) earliestTip = tip
  }
  return earliestTip
}

function evalFirstDeloadHonored(input: BuildTotemInventoryInput): string | null {
  const templateById = new Map<string, SessionTemplate>()
  for (const m of input.mesocycles) {
    for (const t of m.sessions) templateById.set(t.id, t)
  }
  for (const s of completedSessionsSorted(input)) {
    const tpl = templateById.get(s.sessionTemplateId)
    if (tpl && isDeloadSession(tpl)) return s.date
  }
  return null
}

function evalRpeAwareness(input: BuildTotemInventoryInput): string | null {
  // Group sets by sessionId; collect sessions in which EVERY logged set
  // carries a numeric `rpe`. The 5th such session's date is the tipping date.
  const setsBySession = new Map<string, ExecutedSet[]>()
  for (const set of input.executedSets) {
    const arr = setsBySession.get(set.sessionId)
    if (arr) arr.push(set)
    else setsBySession.set(set.sessionId, [set])
  }
  const dateBySession = new Map<string, string>()
  for (const s of input.executedSessions) dateBySession.set(s.id, s.date)

  const eligibleDates: string[] = []
  for (const [sid, sets] of setsBySession) {
    if (sets.length === 0) continue
    if (!sets.every((x) => typeof x.rpe === 'number')) continue
    const date = dateBySession.get(sid)
    if (date) eligibleDates.push(date)
  }
  if (eligibleDates.length < 5) return null
  eligibleDates.sort()
  return eligibleDates[4] ?? null
}

const EVALUATORS: Record<TotemId, (input: BuildTotemInventoryInput) => string | null> = {
  'first-session': evalFirstSession,
  'first-week': evalFirstWeek,
  'three-weeks-present': (input) => consecutiveRunReachedDate(completedSessionsSorted(input), 3),
  'eight-week-rhythm': (input) => consecutiveRunReachedDate(completedSessionsSorted(input), 8),
  'return-after-break': evalReturnAfterBreak,
  'first-mesocycle-complete': evalFirstMesocycleComplete,
  'first-deload-honored': evalFirstDeloadHonored,
  'rpe-awareness': evalRpeAwareness,
}

/**
 * Pure selector. Composes the v1 catalog with the deterministic eligibility
 * rules to produce a stable {@link TotemInventoryModel} the renderers can
 * consume.
 */
export function buildTotemInventoryModel(input: BuildTotemInventoryInput): TotemInventoryModel {
  // `nowMs` is part of the contract for forward-compatibility (future
  // time-relative rules); current v1 evaluators are time-window-agnostic.
  void input.nowMs

  const totems: TotemEntry[] = TOTEM_CATALOG_V1.map((entry) => {
    const earnedDateISO = EVALUATORS[entry.id](input)
    return {
      id: entry.id,
      family: entry.family,
      state: earnedDateISO ? 'earned' : 'available',
      earnedDateISO,
      nameI18nKey: entry.nameI18nKey,
      ruleI18nKey: entry.ruleI18nKey,
    }
  })

  return { totems }
}
