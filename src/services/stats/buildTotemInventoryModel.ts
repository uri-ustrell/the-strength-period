import type { Mesocycle, SessionTemplate } from '@/types/planning'
import type { ExecutedSession, ExecutedSet } from '@/types/session'

/**
 * Shared totem inventory model. The single source of truth for totem-inventory
 * rendering. Pure function: zero React, zero IO, zero `matchMedia`, zero direct
 * store reads. `nowMs` is injected so callers control the clock (deterministic
 * in tests, fresh in production).
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
  | 'five-deloads-honored'
  | 'first-rest-day-honored'
  | 'rpe-awareness'
  | 'warm-up-habit'
  | 'triple-preparation'

export type TotemFamily = 'consistency' | 'recovery' | 'preparation' | 'reflection'

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
 * V1 is FROZEN for historical reference and parity tests. The selector now
 * consumes {@link TOTEM_CATALOG_V2}. Adding a totem is done by extending V2
 * (or a future V3) — never by mutating V1.
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
    // TODO(rpe-awareness): The evaluator (`evalRpeAwareness`) requires a
    // per-set `rpe` value that the session execution surface never captures
    // today (only a global session RPE is logged). Until per-set RPE is
    // added, this totem can never be earned in production. The catalog
    // entry stays so existing tests + the i18n keys keep working; consider
    // either capturing per-set RPE or relaxing the evaluator before
    // shipping it as a discoverable goal.
  },
]

/**
 * V2 catalog — additive extension of {@link TOTEM_CATALOG_V1}. V1 stays
 * frozen for historical reference; the live selector consumes V2.
 *
 * V2 appends the `preparation` family band between `recovery` and
 * `reflection`. Family order is enforced by {@link FAMILY_ORDER}; the catalog
 * array below is hand-ordered to match.
 */
export const TOTEM_CATALOG_V2: ReadonlyArray<TotemCatalogEntry> = [
  // Insert the new recovery entry inside the recovery band to preserve the
  // canonical family order (Consistency → Recovery → Preparation → Reflection).
  ...TOTEM_CATALOG_V1.slice(
    0,
    TOTEM_CATALOG_V1.findIndex((e) => e.id === 'first-deload-honored') + 1
  ),
  {
    id: 'five-deloads-honored',
    family: 'recovery',
    nameI18nKey: 'stats:totem.five_deloads_honored.name',
    ruleI18nKey: 'stats:totem.five_deloads_honored.rule',
  },
  // Rest-day recovery totem (single-shot).
  {
    id: 'first-rest-day-honored',
    family: 'recovery',
    nameI18nKey: 'stats:totem.first_rest_day_honored.name',
    ruleI18nKey: 'stats:totem.first_rest_day_honored.rule',
  },
  // Preparation band.
  {
    id: 'warm-up-habit',
    family: 'preparation',
    nameI18nKey: 'stats:totem.warm_up_habit.name',
    ruleI18nKey: 'stats:totem.warm_up_habit.rule',
  },
  {
    id: 'triple-preparation',
    family: 'preparation',
    nameI18nKey: 'stats:totem.triple_preparation.name',
    ruleI18nKey: 'stats:totem.triple_preparation.rule',
  },
  ...TOTEM_CATALOG_V1.slice(TOTEM_CATALOG_V1.findIndex((e) => e.id === 'first-deload-honored') + 1),
]

/**
 * Canonical family render order. Renderers MUST iterate families in this
 * order; within each family, totems follow catalog index.
 */
export const FAMILY_ORDER: ReadonlyArray<TotemFamily> = [
  'consistency',
  'recovery',
  'preparation',
  'reflection',
]

/**
 * Mirrors `buildDashboardMap.isDeloadSession` exactly. The deload-honored
 * totem must use the same heuristic so dashboard and
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

/**
 * Five distinct deload ISO weeks (cross-mesocycle by design). Returns the
 * earliest completed deload-session date in the 5th distinct deload ISO
 * week chronologically (the eligibility-tipping event), or `null` until
 * five distinct deload ISO weeks have been honored.
 */
function evalFiveDeloadsHonored(input: BuildTotemInventoryInput): string | null {
  const templateById = new Map<string, SessionTemplate>()
  for (const m of input.mesocycles) {
    for (const t of m.sessions) templateById.set(t.id, t)
  }
  const earliestByWeek = new Map<number, string>()
  for (const s of completedSessionsSorted(input)) {
    const tpl = templateById.get(s.sessionTemplateId)
    if (!tpl || !isDeloadSession(tpl)) continue
    const ord = isoWeekOrdinal(s.date)
    if (!earliestByWeek.has(ord)) earliestByWeek.set(ord, s.date)
  }
  if (earliestByWeek.size < 5) return null
  const sortedKeys = [...earliestByWeek.keys()].sort((a, b) => a - b)
  const tippingWeek = sortedKeys[4]
  return tippingWeek !== undefined ? (earliestByWeek.get(tippingWeek) ?? null) : null
}

/**
 * Earned when ≥1 SessionTemplate has `isPlannedRestDay === true`,
 * its planned calendar date is strictly past today (UTC, today exclusive),
 * and no ExecutedSession.date matches that rest-day date. Returns the
 * earliest honored rest-day calendar date (chronological).
 *
 * First time-relative evaluator — uses `input.nowMs` for the "today" boundary.
 */
function evalFirstRestDayHonored(input: BuildTotemInventoryInput): string | null {
  const todayISO = new Date(input.nowMs).toISOString().slice(0, 10)
  const executedDates = new Set<string>()
  for (const s of input.executedSessions) executedDates.add(s.date)

  const honoredDates: string[] = []
  for (const meso of input.mesocycles) {
    for (const tpl of meso.sessions) {
      if (tpl.isPlannedRestDay !== true) continue
      const restDateISO = plannedSessionDateUTC(meso.startDate, tpl.weekNumber, tpl.dayOfWeek)
      if (restDateISO >= todayISO) continue // today exclusive — only strictly past dates count.
      if (executedDates.has(restDateISO)) continue // honor broken: a session was executed on the rest day.
      honoredDates.push(restDateISO)
    }
  }
  if (honoredDates.length === 0) return null
  honoredDates.sort()
  return honoredDates[0] ?? null
}

/**
 * UTC-pure analogue of `getSessionDate` from `@/utils/dateHelpers`. Mirrors
 * the Monday-anchored week math (ISO `dayOfWeek` 1..7) but operates entirely
 * in UTC so the result is deterministic against `input.nowMs` (also UTC).
 */
function plannedSessionDateUTC(
  mesocycleStartDateISO: string,
  weekNumber: number,
  dayOfWeek: number
): string {
  const [y, m, d] = mesocycleStartDateISO.split('-').map(Number)
  if (
    typeof y !== 'number' ||
    typeof m !== 'number' ||
    typeof d !== 'number' ||
    Number.isNaN(y) ||
    Number.isNaN(m) ||
    Number.isNaN(d)
  ) {
    return mesocycleStartDateISO
  }
  const startMs = Date.UTC(y, m - 1, d)
  const startDow = new Date(startMs).getUTCDay() // 0=Sun..6=Sat
  const mondayOffsetDays = startDow === 0 ? -6 : 1 - startDow
  const totalOffsetDays = mondayOffsetDays + (weekNumber - 1) * 7 + (dayOfWeek - 1)
  const restMs = startMs + totalOffsetDays * 86400000
  return new Date(restMs).toISOString().slice(0, 10)
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

/**
 * Preparation family helpers. Both totems share the same
 * predicate: a session "qualifies" iff at least one of its executed sets
 * is marked `isWarmup === true`. Sessions without `completedAt` or marked
 * skipped are excluded.
 */
function sessionHasWarmup(sessionId: string, sets: ReadonlyArray<ExecutedSet>): boolean {
  for (const s of sets) {
    if (s.sessionId === sessionId && s.isWarmup === true) return true
  }
  return false
}

/** Number of distinct completed sessions with a warm-up set required to earn `warm-up-habit`. */
const WARMUP_HABIT_SESSIONS = 10
/** Number of consecutive completed sessions with a warm-up set required to earn `triple-preparation`. */
const PREPARATION_STREAK_REQUIRED = 5

/**
 * Cumulative threshold: the user has started ≥ `WARMUP_HABIT_SESSIONS` distinct
 * completed sessions with at least one warm-up set. Tipping date = the date of
 * the threshold-th qualifying session (chronological).
 */
function evalWarmupHabit(input: BuildTotemInventoryInput): string | null {
  const completed = completedSessionsSorted(input)
  const qualifying = completed.filter((s) => sessionHasWarmup(s.id, input.executedSets))
  if (qualifying.length < WARMUP_HABIT_SESSIONS) return null
  return qualifying[WARMUP_HABIT_SESSIONS - 1]?.date ?? null
}

/**
 * Streak threshold: `PREPARATION_STREAK_REQUIRED` consecutive completed sessions
 * (in chronological order, no skipped intervening sessions) each carry a warm-up
 * set. Tipping date = the date of the streak-completing session.
 *
 * Note: the totem id `triple-preparation` is retained for stability; the
 * threshold has been locked at 5 by user decision.
 */
function evalConsecutivePreparationStreak(input: BuildTotemInventoryInput): string | null {
  const completed = completedSessionsSorted(input)
  let streak = 0
  for (const s of completed) {
    if (sessionHasWarmup(s.id, input.executedSets)) {
      streak += 1
      if (streak >= PREPARATION_STREAK_REQUIRED) return s.date
    } else {
      streak = 0
    }
  }
  return null
}

const EVALUATORS: Record<TotemId, (input: BuildTotemInventoryInput) => string | null> = {
  'first-session': evalFirstSession,
  'first-week': evalFirstWeek,
  'three-weeks-present': (input) => consecutiveRunReachedDate(completedSessionsSorted(input), 3),
  'eight-week-rhythm': (input) => consecutiveRunReachedDate(completedSessionsSorted(input), 8),
  'return-after-break': evalReturnAfterBreak,
  'first-mesocycle-complete': evalFirstMesocycleComplete,
  'first-deload-honored': evalFirstDeloadHonored,
  'five-deloads-honored': evalFiveDeloadsHonored,
  'first-rest-day-honored': evalFirstRestDayHonored,
  'rpe-awareness': evalRpeAwareness,
  'warm-up-habit': evalWarmupHabit,
  'triple-preparation': evalConsecutivePreparationStreak,
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

  const totems: TotemEntry[] = TOTEM_CATALOG_V2.map((entry) => {
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
