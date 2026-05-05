import type { Mesocycle, SessionTemplate } from '@/types/planning'

/**
 * Step 16 Phase B — Shared dashboard model.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase B Shared Contracts (Dashboard)". This module is the single source of
 * truth for dashboard rendering across every aesthetic variant
 * (`retro-platformer`, `classic-boring`, …). It contains zero React code, zero
 * IO, and never reads `matchMedia` — variant resolution happens at render time
 * via `useEffectiveAestheticVariant`.
 */

export type SessionNodeState = 'future' | 'available' | 'in-progress' | 'completed' | 'skipped'

export type SessionNode = {
  /** Underlying SessionTemplate id (used to route the click). */
  sessionId: string
  /** 1-based index of the session within its week (by `dayOfWeek` order). */
  sessionIndexInWeek: number
  /** Day of week as defined in the SessionTemplate (1..7). */
  dayOfWeek: SessionTemplate['dayOfWeek']
  /** Canonical state — see Phase B Shared Contracts. */
  state: SessionNodeState
  /** Optional convenience for renderers; never required for routing. */
  durationMinutes: number
}

export type WeekRow = {
  /** 1-based week number from the Mesocycle. */
  weekNumber: number
  /** 0-based row index, used by per-week sub-palette resolution (`weekIndex % 6`). */
  weekIndex: number
  /**
   * True when EVERY session in the week is marked deload (`progressionType` is
   * not enough — Phase B spec defers to engine intent). Detected via the
   * heuristic in {@link isDeloadSession} so renderers can show the
   * "Deload" badge without overriding the week accent.
   */
  isDeload: boolean
  sessions: SessionNode[]
}

export type DashboardMapModel = {
  mesocycleId: string
  mesocycleName: string
  durationWeeks: number
  weeks: WeekRow[]
}

/**
 * Heuristic for tagging a session as deload. Mirrors the engine intent without
 * coupling to any new field: a session is treated as deload when its template
 * sets a marker in either `(s as any).isDeload` (faithful presets) or when its
 * `progressionType === 'block'` AND no muscle target carries weightKg (the
 * deterministic engine produces zero-load deload sessions). The check is
 * intentionally conservative; renderers fall back to no badge when unsure.
 */
function isDeloadSession(session: SessionTemplate): boolean {
  const marker = (session as { isDeload?: boolean }).isDeload
  if (marker === true) return true
  return false
}

/**
 * Pure selector that turns a `Mesocycle` (+ optional preview session id) into
 * the canonical dashboard model.
 *
 * State derivation rules (deterministic, in this exact order per session):
 *   1. `completed` if `SessionTemplate.completed === true`
 *   2. `skipped`   if `SessionTemplate.skipped   === true`
 *   3. `in-progress` if `previewSessionId === session.id`
 *   4. `available` for the FIRST un-completed, un-skipped session ordered by
 *      `(weekNumber asc, dayOfWeek asc)` — at most one per mesocycle
 *   5. `future` for everything else
 *
 * The order matches the existing Dashboard "next session" logic so wiring is
 * a no-op semantically.
 */
export function buildDashboardMap(
  mesocycle: Mesocycle,
  previewSessionId?: string
): DashboardMapModel {
  const sortedSessions = [...mesocycle.sessions].sort(
    (a, b) => a.weekNumber - b.weekNumber || a.dayOfWeek - b.dayOfWeek
  )

  // Pick the single "available" session — the first pending one in chronological order
  // that is NOT the preview/in-progress session (preview wins).
  const availableSessionId = sortedSessions.find(
    (s) => !s.completed && !s.skipped && s.id !== previewSessionId
  )?.id

  const stateOf = (session: SessionTemplate): SessionNodeState => {
    if (session.completed) return 'completed'
    if (session.skipped) return 'skipped'
    if (previewSessionId && session.id === previewSessionId) return 'in-progress'
    if (session.id === availableSessionId) return 'available'
    return 'future'
  }

  // Group by week, preserving chronological order.
  const byWeek = new Map<number, SessionTemplate[]>()
  for (const s of sortedSessions) {
    const list = byWeek.get(s.weekNumber)
    if (list) list.push(s)
    else byWeek.set(s.weekNumber, [s])
  }

  const weeks: WeekRow[] = []
  let weekIndex = 0
  for (const [weekNumber, sessions] of [...byWeek.entries()].sort((a, b) => a[0] - b[0])) {
    const nodes: SessionNode[] = sessions.map((session, idx) => ({
      sessionId: session.id,
      sessionIndexInWeek: idx + 1,
      dayOfWeek: session.dayOfWeek,
      state: stateOf(session),
      durationMinutes: session.durationMinutes,
    }))
    const isDeload = sessions.length > 0 && sessions.every(isDeloadSession)
    weeks.push({ weekNumber, weekIndex, isDeload, sessions: nodes })
    weekIndex += 1
  }

  return {
    mesocycleId: mesocycle.id,
    mesocycleName: mesocycle.name,
    durationWeeks: mesocycle.durationWeeks,
    weeks,
  }
}
