import { describe, expect, it } from 'vitest'

import {
  type BuildTotemInventoryInput,
  buildTotemInventoryModel,
  TOTEM_CATALOG_V1,
} from '@/services/stats/buildTotemInventoryModel'
import type { Mesocycle, SessionTemplate } from '@/types/planning'
import type { ExecutedSession, ExecutedSet } from '@/types/session'

/**
 * Step 16 Phase D — D4 selector tests.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase D Shared Contracts (Stats / Inventory)" → "v1 Totem Catalog".
 */

const NOW_MS = Date.parse('2026-05-04T12:00:00Z')

function makeSession(
  id: string,
  templateId: string,
  date: string,
  opts: { skipped?: boolean; completed?: boolean } = {}
): ExecutedSession {
  const completed = opts.completed ?? !(opts.skipped ?? false)
  return {
    id,
    sessionTemplateId: templateId,
    date,
    startedAt: `${date}T08:00:00.000Z`,
    completedAt: completed ? `${date}T09:00:00.000Z` : undefined,
    sets: [],
    skipped: opts.skipped ?? false,
  }
}

function makeSet(
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  date: string,
  rpe?: number
): ExecutedSet {
  return {
    id: `${sessionId}-${exerciseId}-${setNumber}`,
    sessionId,
    sessionTemplateId: 't',
    date,
    exerciseId,
    setNumber,
    repsPlanned: 10,
    repsActual: 10,
    weightKgPlanned: 40,
    weightKgActual: 40,
    rpe,
    completedAt: `${date}T09:00:00.000Z`,
  }
}

function makeTemplate(
  id: string,
  weekNumber: number,
  dayOfWeek: SessionTemplate['dayOfWeek'],
  opts: { completed?: boolean; skipped?: boolean; isDeload?: boolean } = {}
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
    completed: opts.completed ?? false,
    skipped: opts.skipped ?? false,
    ...(opts.isDeload ? { isDeload: true } : {}),
  } as SessionTemplate
}

function makeMesocycle(id: string, sessions: SessionTemplate[]): Mesocycle {
  return {
    id,
    name: id,
    presetId: 'p',
    startDate: '2026-01-01',
    durationWeeks: Math.max(1, ...sessions.map((s) => s.weekNumber)),
    sessions,
    createdAt: '2026-01-01T00:00:00.000Z',
    active: true,
  }
}

function baseInput(overrides: Partial<BuildTotemInventoryInput> = {}): BuildTotemInventoryInput {
  return {
    executedSessions: [],
    executedSets: [],
    mesocycles: [],
    nowMs: NOW_MS,
    ...overrides,
  }
}

describe('buildTotemInventoryModel', () => {
  it('returns the full v1 catalog with all `available` on empty history', () => {
    const m = buildTotemInventoryModel(baseInput())
    expect(m.totems).toHaveLength(TOTEM_CATALOG_V1.length)
    expect(m.totems.every((t) => t.state === 'available')).toBe(true)
    expect(m.totems.every((t) => t.earnedDateISO === null)).toBe(true)
  })

  it('orders totems by family Consistency → Recovery → Reflection then catalog index', () => {
    const m = buildTotemInventoryModel(baseInput())
    const families = m.totems.map((t) => t.family)
    const firstRecovery = families.indexOf('recovery')
    const firstReflection = families.indexOf('reflection')
    const lastConsistency = families.lastIndexOf('consistency')
    expect(lastConsistency).toBeLessThan(firstRecovery)
    expect(firstRecovery).toBeLessThan(firstReflection)
    expect(m.totems.map((t) => t.id)).toEqual(TOTEM_CATALOG_V1.map((c) => c.id))
  })

  it('marks `first-session` earned after one completed session', () => {
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: [makeSession('s1', 't1', '2026-04-01')],
      })
    )
    const t = m.totems.find((x) => x.id === 'first-session')
    expect(t?.state).toBe('earned')
    expect(t?.earnedDateISO).toBe('2026-04-01')
  })

  it('does NOT mark `first-session` for a skipped session', () => {
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: [makeSession('s1', 't1', '2026-04-01', { skipped: true })],
      })
    )
    const t = m.totems.find((x) => x.id === 'first-session')
    expect(t?.state).toBe('available')
  })

  it('three-weeks-present positive — three consecutive ISO weeks', () => {
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: [
          makeSession('a', 'ta', '2026-01-05'), // ISO week 2
          makeSession('b', 'tb', '2026-01-12'), // ISO week 3
          makeSession('c', 'tc', '2026-01-19'), // ISO week 4
        ],
      })
    )
    const t = m.totems.find((x) => x.id === 'three-weeks-present')
    expect(t?.state).toBe('earned')
    expect(t?.earnedDateISO).toBe('2026-01-19')
  })

  it('three-weeks-present negative — middle week skipped', () => {
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: [
          makeSession('a', 'ta', '2026-01-05'), // ISO week 2
          // ISO week 3 missing
          makeSession('c', 'tc', '2026-01-19'), // ISO week 4
        ],
      })
    )
    const t = m.totems.find((x) => x.id === 'three-weeks-present')
    expect(t?.state).toBe('available')
  })

  it('eight-week-rhythm positive', () => {
    const dates = [
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
      '2026-01-26',
      '2026-02-02',
      '2026-02-09',
      '2026-02-16',
      '2026-02-23',
    ]
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: dates.map((d, i) => makeSession(`s${i}`, `t${i}`, d)),
      })
    )
    const t = m.totems.find((x) => x.id === 'eight-week-rhythm')
    expect(t?.state).toBe('earned')
    expect(t?.earnedDateISO).toBe('2026-02-23')
  })

  it('eight-week-rhythm negative — only 7 weeks', () => {
    const dates = [
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
      '2026-01-26',
      '2026-02-02',
      '2026-02-09',
      '2026-02-16',
    ]
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: dates.map((d, i) => makeSession(`s${i}`, `t${i}`, d)),
      })
    )
    expect(m.totems.find((x) => x.id === 'eight-week-rhythm')?.state).toBe('available')
  })

  it('return-after-break positive — 15-day gap', () => {
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: [
          makeSession('a', 'ta', '2026-01-05'),
          makeSession('b', 'tb', '2026-01-20'), // 15 days later
        ],
      })
    )
    const t = m.totems.find((x) => x.id === 'return-after-break')
    expect(t?.state).toBe('earned')
    expect(t?.earnedDateISO).toBe('2026-01-20')
  })

  it('return-after-break negative — 13-day gap', () => {
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: [
          makeSession('a', 'ta', '2026-01-05'),
          makeSession('b', 'tb', '2026-01-18'), // 13 days later
        ],
      })
    )
    expect(m.totems.find((x) => x.id === 'return-after-break')?.state).toBe('available')
  })

  it('first-mesocycle-complete positive — every non-skipped completed', () => {
    const tpls = [
      makeTemplate('t1', 1, 1, { completed: true }),
      makeTemplate('t2', 1, 3, { skipped: true }),
      makeTemplate('t3', 1, 5, { completed: true }),
    ]
    const meso = makeMesocycle('m1', tpls)
    const m = buildTotemInventoryModel(
      baseInput({
        mesocycles: [meso],
        executedSessions: [
          makeSession('s1', 't1', '2026-01-05'),
          makeSession('s3', 't3', '2026-01-08'),
        ],
      })
    )
    const t = m.totems.find((x) => x.id === 'first-mesocycle-complete')
    expect(t?.state).toBe('earned')
    expect(t?.earnedDateISO).toBe('2026-01-08')
  })

  it('first-mesocycle-complete negative — pending session', () => {
    const tpls = [
      makeTemplate('t1', 1, 1, { completed: true }),
      makeTemplate('t2', 1, 3, { completed: false }),
    ]
    const m = buildTotemInventoryModel(
      baseInput({
        mesocycles: [makeMesocycle('m1', tpls)],
        executedSessions: [makeSession('s1', 't1', '2026-01-05')],
      })
    )
    expect(m.totems.find((x) => x.id === 'first-mesocycle-complete')?.state).toBe('available')
  })

  it('first-deload-honored positive — completed session matches deload template', () => {
    const tpls = [makeTemplate('t1', 1, 1, { isDeload: true })]
    const m = buildTotemInventoryModel(
      baseInput({
        mesocycles: [makeMesocycle('m1', tpls)],
        executedSessions: [makeSession('s1', 't1', '2026-02-10')],
      })
    )
    const t = m.totems.find((x) => x.id === 'first-deload-honored')
    expect(t?.state).toBe('earned')
    expect(t?.earnedDateISO).toBe('2026-02-10')
  })

  it('first-deload-honored negative — completed session is non-deload', () => {
    const tpls = [makeTemplate('t1', 1, 1, { isDeload: false })]
    const m = buildTotemInventoryModel(
      baseInput({
        mesocycles: [makeMesocycle('m1', tpls)],
        executedSessions: [makeSession('s1', 't1', '2026-02-10')],
      })
    )
    expect(m.totems.find((x) => x.id === 'first-deload-honored')?.state).toBe('available')
  })

  it('rpe-awareness positive — five sessions with all-set RPE', () => {
    const sessions: ExecutedSession[] = []
    const sets: ExecutedSet[] = []
    for (let i = 1; i <= 5; i += 1) {
      const sid = `s${i}`
      const date = `2026-03-0${i}`
      sessions.push(makeSession(sid, `t${i}`, date))
      sets.push(makeSet(sid, 'ex', 1, date, 7))
      sets.push(makeSet(sid, 'ex', 2, date, 8))
    }
    const m = buildTotemInventoryModel(
      baseInput({ executedSessions: sessions, executedSets: sets })
    )
    const t = m.totems.find((x) => x.id === 'rpe-awareness')
    expect(t?.state).toBe('earned')
    expect(t?.earnedDateISO).toBe('2026-03-05')
  })

  it('rpe-awareness negative — fifth session missing rpe on one set', () => {
    const sessions: ExecutedSession[] = []
    const sets: ExecutedSet[] = []
    for (let i = 1; i <= 5; i += 1) {
      const sid = `s${i}`
      const date = `2026-03-0${i}`
      sessions.push(makeSession(sid, `t${i}`, date))
      sets.push(makeSet(sid, 'ex', 1, date, i === 5 ? undefined : 7))
      sets.push(makeSet(sid, 'ex', 2, date, 8))
    }
    const m = buildTotemInventoryModel(
      baseInput({ executedSessions: sessions, executedSets: sets })
    )
    expect(m.totems.find((x) => x.id === 'rpe-awareness')?.state).toBe('available')
  })

  it('is deterministic for the same input + nowMs', () => {
    const input = baseInput({
      executedSessions: [makeSession('s1', 't1', '2026-04-01')],
    })
    const a = buildTotemInventoryModel(input)
    const b = buildTotemInventoryModel(input)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('does not call Date.now() — varying nowMs does not change output for time-agnostic rules', () => {
    const input1 = baseInput({
      executedSessions: [makeSession('s1', 't1', '2026-04-01')],
      nowMs: 0,
    })
    const input2 = { ...input1, nowMs: NOW_MS }
    expect(JSON.stringify(buildTotemInventoryModel(input1))).toBe(
      JSON.stringify(buildTotemInventoryModel(input2))
    )
  })
})
