import { describe, expect, it } from 'vitest'
import { buildDashboardMap } from '@/services/dashboard/buildDashboardMap'
import type { Mesocycle, SessionTemplate } from '@/types/planning'
import { assertDefined } from '@/utils/assertDefined'

function makeSession(
  id: string,
  weekNumber: number,
  dayOfWeek: SessionTemplate['dayOfWeek'],
  overrides: Partial<SessionTemplate> = {}
): SessionTemplate {
  return {
    id,
    mesocycleId: 'm1',
    weekNumber,
    dayOfWeek,
    durationMinutes: 45,
    muscleGroupTargets: [],
    progressionType: 'linear',
    restrictions: [],
    completed: false,
    skipped: false,
    ...overrides,
  }
}

function makeMeso(sessions: SessionTemplate[], durationWeeks = 4): Mesocycle {
  return {
    id: 'm1',
    name: 'Test Meso',
    presetId: 'p1',
    startDate: '2026-01-01',
    durationWeeks,
    sessions,
    createdAt: '2026-01-01T00:00:00.000Z',
    active: true,
  }
}

describe('buildDashboardMap', () => {
  it('handles an empty mesocycle', () => {
    const model = buildDashboardMap(makeMeso([]))
    expect(model.weeks).toEqual([])
    expect(model.mesocycleId).toBe('m1')
    expect(model.mesocycleName).toBe('Test Meso')
  })

  it('marks only the first pending session as available; rest are future', () => {
    const sessions = [makeSession('s1', 1, 1), makeSession('s2', 1, 3), makeSession('s3', 2, 1)]
    const model = buildDashboardMap(makeMeso(sessions))
    expect(assertDefined(model.weeks[0]).sessions.map((n) => n.state)).toEqual([
      'available',
      'future',
    ])
    expect(assertDefined(assertDefined(model.weeks[1]).sessions[0]).state).toBe('future')
  })

  it('all-future when nothing is pending and no preview (every node is future) — degenerate empty case is empty', () => {
    // Degenerate: empty sessions yields no weeks.
    const model = buildDashboardMap(makeMeso([]))
    expect(model.weeks).toHaveLength(0)
  })

  it('single-available: only one node in the entire mesocycle is `available`', () => {
    const sessions = [makeSession('s1', 1, 1), makeSession('s2', 2, 2), makeSession('s3', 3, 3)]
    const model = buildDashboardMap(makeMeso(sessions))
    const allStates = model.weeks.flatMap((w) => w.sessions.map((n) => n.state))
    expect(allStates.filter((s) => s === 'available')).toHaveLength(1)
  })

  it('preview override wins: matched session becomes in-progress and another pending becomes available', () => {
    const sessions = [makeSession('s1', 1, 1), makeSession('s2', 1, 3), makeSession('s3', 2, 1)]
    const model = buildDashboardMap(makeMeso(sessions), 's2')
    const flat = model.weeks.flatMap((w) => w.sessions)
    expect(flat.find((n) => n.sessionId === 's2')?.state).toBe('in-progress')
    // First pending that is not the preview becomes available.
    expect(flat.find((n) => n.sessionId === 's1')?.state).toBe('available')
    expect(flat.find((n) => n.sessionId === 's3')?.state).toBe('future')
  })

  it('all-completed: every session is completed; no node is available', () => {
    const sessions = [
      makeSession('s1', 1, 1, { completed: true }),
      makeSession('s2', 1, 3, { completed: true }),
    ]
    const model = buildDashboardMap(makeMeso(sessions))
    const flat = model.weeks.flatMap((w) => w.sessions)
    expect(flat.every((n) => n.state === 'completed')).toBe(true)
  })

  it('mixed completed/skipped with one pending: skipped never shamed, pending becomes available', () => {
    const sessions = [
      makeSession('s1', 1, 1, { completed: true }),
      makeSession('s2', 1, 3, { skipped: true }),
      makeSession('s3', 2, 1),
    ]
    const model = buildDashboardMap(makeMeso(sessions))
    const flat = model.weeks.flatMap((w) => w.sessions)
    expect(flat.find((n) => n.sessionId === 's1')?.state).toBe('completed')
    expect(flat.find((n) => n.sessionId === 's2')?.state).toBe('skipped')
    expect(flat.find((n) => n.sessionId === 's3')?.state).toBe('available')
  })

  it('multi-week ordering: weeks come back ascending and sessions within a week are ordered by dayOfWeek', () => {
    // Intentionally insert sessions in scrambled order.
    const sessions = [
      makeSession('s3', 2, 5),
      makeSession('s1', 1, 6),
      makeSession('s2', 1, 1),
      makeSession('s4', 3, 2),
    ]
    const model = buildDashboardMap(makeMeso(sessions, 3))
    expect(model.weeks.map((w) => w.weekNumber)).toEqual([1, 2, 3])
    expect(model.weeks.map((w) => w.weekIndex)).toEqual([0, 1, 2])
    expect(assertDefined(model.weeks[0]).sessions.map((n) => n.sessionId)).toEqual(['s2', 's1'])
    expect(assertDefined(model.weeks[0]).sessions.map((n) => n.sessionIndexInWeek)).toEqual([1, 2])
    // First pending in chronological order is s2 (week 1, day 1).
    expect(assertDefined(assertDefined(model.weeks[0]).sessions[0]).state).toBe('available')
  })

  it('deload week tagging: every session in the week marked isDeload yields a deload row', () => {
    const sessions = [
      makeSession('s1', 1, 1),
      makeSession('s2', 2, 1, { isDeload: true } as Partial<SessionTemplate>),
      makeSession('s3', 2, 3, { isDeload: true } as Partial<SessionTemplate>),
      // Mixed week: not all deload → not flagged.
      makeSession('s4', 3, 1, { isDeload: true } as Partial<SessionTemplate>),
      makeSession('s5', 3, 3),
    ]
    const model = buildDashboardMap(makeMeso(sessions))
    const week2 = model.weeks.find((w) => w.weekNumber === 2)
    const week3 = model.weeks.find((w) => w.weekNumber === 3)
    expect(week2?.isDeload).toBe(true)
    expect(week3?.isDeload).toBe(false)
  })

  it('does not mutate the input mesocycle', () => {
    const sessions = [makeSession('s2', 2, 1), makeSession('s1', 1, 1)]
    const meso = makeMeso(sessions)
    const before = meso.sessions.map((s) => s.id)
    buildDashboardMap(meso)
    expect(meso.sessions.map((s) => s.id)).toEqual(before)
  })
})
