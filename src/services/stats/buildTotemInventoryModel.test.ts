import { describe, expect, it } from 'vitest'

import {
  type BuildTotemInventoryInput,
  buildTotemInventoryModel,
  TOTEM_CATALOG_V1,
  TOTEM_CATALOG_V2,
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
  it('returns the full v2 catalog with all `available` on empty history', () => {
    const m = buildTotemInventoryModel(baseInput())
    expect(m.totems).toHaveLength(TOTEM_CATALOG_V2.length)
    expect(m.totems.every((t) => t.state === 'available')).toBe(true)
    expect(m.totems.every((t) => t.earnedDateISO === null)).toBe(true)
  })

  it('orders totems by family Consistency → Recovery → Reflection then catalog index', () => {
    const m = buildTotemInventoryModel(baseInput())
    const families = m.totems.map((t) => t.family)
    const firstRecovery = families.indexOf('recovery')
    const firstReflection = families.indexOf('reflection')
    const lastConsistency = families.lastIndexOf('consistency')
    const lastRecovery = families.lastIndexOf('recovery')
    expect(lastConsistency).toBeLessThan(firstRecovery)
    expect(lastRecovery).toBeLessThan(firstReflection)
    expect(m.totems.map((t) => t.id)).toEqual(TOTEM_CATALOG_V2.map((c) => c.id))
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

describe('five-deloads-honored', () => {
  it('positive — 5 distinct deload ISO weeks (one session each) earns on the 5th week date', () => {
    const tpls = [
      makeTemplate('t1', 1, 1, { isDeload: true }),
      makeTemplate('t2', 2, 1, { isDeload: true }),
      makeTemplate('t3', 3, 1, { isDeload: true }),
      makeTemplate('t4', 4, 1, { isDeload: true }),
      makeTemplate('t5', 5, 1, { isDeload: true }),
    ]
    const m = buildTotemInventoryModel(
      baseInput({
        mesocycles: [makeMesocycle('m1', tpls)],
        executedSessions: [
          makeSession('s1', 't1', '2026-01-05'), // ISO week 2
          makeSession('s2', 't2', '2026-01-12'), // ISO week 3
          makeSession('s3', 't3', '2026-01-19'), // ISO week 4
          makeSession('s4', 't4', '2026-01-26'), // ISO week 5
          makeSession('s5', 't5', '2026-02-02'), // ISO week 6 — tipping
        ],
      })
    )
    const t = m.totems.find((x) => x.id === 'five-deloads-honored')
    expect(t?.state).toBe('earned')
    expect(t?.earnedDateISO).toBe('2026-02-02')
  })

  it('negative — only 4 distinct deload weeks stays available', () => {
    const tpls = [
      makeTemplate('t1', 1, 1, { isDeload: true }),
      makeTemplate('t2', 2, 1, { isDeload: true }),
      makeTemplate('t3', 3, 1, { isDeload: true }),
      makeTemplate('t4', 4, 1, { isDeload: true }),
    ]
    const m = buildTotemInventoryModel(
      baseInput({
        mesocycles: [makeMesocycle('m1', tpls)],
        executedSessions: [
          makeSession('s1', 't1', '2026-01-05'),
          makeSession('s2', 't2', '2026-01-12'),
          makeSession('s3', 't3', '2026-01-19'),
          makeSession('s4', 't4', '2026-01-26'),
        ],
      })
    )
    const t = m.totems.find((x) => x.id === 'five-deloads-honored')
    expect(t?.state).toBe('available')
    expect(t?.earnedDateISO).toBeNull()
  })

  it('negative — 5 deload sessions all in the same ISO week stays available', () => {
    const tpls = [
      makeTemplate('t1', 1, 1, { isDeload: true }),
      makeTemplate('t2', 1, 2, { isDeload: true }),
      makeTemplate('t3', 1, 3, { isDeload: true }),
      makeTemplate('t4', 1, 4, { isDeload: true }),
      makeTemplate('t5', 1, 5, { isDeload: true }),
    ]
    const m = buildTotemInventoryModel(
      baseInput({
        mesocycles: [makeMesocycle('m1', tpls)],
        executedSessions: [
          // All within the same ISO week (Mon–Fri 2026-01-05…-09).
          makeSession('s1', 't1', '2026-01-05'),
          makeSession('s2', 't2', '2026-01-06'),
          makeSession('s3', 't3', '2026-01-07'),
          makeSession('s4', 't4', '2026-01-08'),
          makeSession('s5', 't5', '2026-01-09'),
        ],
      })
    )
    expect(m.totems.find((x) => x.id === 'five-deloads-honored')?.state).toBe('available')
  })

  it('positive — 5 deload weeks split across 2 mesocycles (cross-mesocycle by design)', () => {
    const tplsA = [
      makeTemplate('a1', 1, 1, { isDeload: true }),
      makeTemplate('a2', 2, 1, { isDeload: true }),
      makeTemplate('a3', 3, 1, { isDeload: true }),
    ]
    const tplsB = [
      makeTemplate('b1', 1, 1, { isDeload: true }),
      makeTemplate('b2', 2, 1, { isDeload: true }),
    ]
    const m = buildTotemInventoryModel(
      baseInput({
        mesocycles: [makeMesocycle('mA', tplsA), makeMesocycle('mB', tplsB)],
        executedSessions: [
          makeSession('sa1', 'a1', '2026-01-05'), // ISO week 2
          makeSession('sa2', 'a2', '2026-01-12'), // 3
          makeSession('sa3', 'a3', '2026-01-19'), // 4
          makeSession('sb1', 'b1', '2026-02-02'), // 6
          makeSession('sb2', 'b2', '2026-02-09'), // 7 — tipping
        ],
      })
    )
    const t = m.totems.find((x) => x.id === 'five-deloads-honored')
    expect(t?.state).toBe('earned')
    expect(t?.earnedDateISO).toBe('2026-02-09')
  })
})

describe('catalog ordering invariant (V2)', () => {
  it('every V1 id appears in the model and `five-deloads-honored` sits in the recovery family band', () => {
    const m = buildTotemInventoryModel(baseInput())
    const ids = m.totems.map((t) => t.id)
    for (const v1 of TOTEM_CATALOG_V1) {
      expect(ids).toContain(v1.id)
    }
    expect(ids).toContain('five-deloads-honored')
    const five = m.totems.find((t) => t.id === 'five-deloads-honored')
    expect(five?.family).toBe('recovery')
    // Sits inside the recovery band: after the last consistency, before the first reflection.
    const families = m.totems.map((t) => t.family)
    const idx = ids.indexOf('five-deloads-honored')
    expect(idx).toBeGreaterThan(families.lastIndexOf('consistency'))
    expect(idx).toBeLessThan(families.indexOf('reflection'))
  })

  it('no other catalog entries gained or lost (V2 == V1 + {five-deloads-honored, first-rest-day-honored, warm-up-habit, triple-preparation})', () => {
    const m = buildTotemInventoryModel(baseInput())
    expect(m.totems).toHaveLength(TOTEM_CATALOG_V1.length + 4)
    expect(new Set(m.totems.map((t) => t.id))).toEqual(
      new Set([
        ...TOTEM_CATALOG_V1.map((c) => c.id),
        'five-deloads-honored',
        'first-rest-day-honored',
        'warm-up-habit',
        'triple-preparation',
      ])
    )
  })
})

describe('Phase E4a — preparation family (warm-up-habit, triple-preparation)', () => {
  it('preparation totems sit between recovery and reflection (FAMILY_ORDER invariant)', () => {
    const m = buildTotemInventoryModel(baseInput())
    const families = m.totems.map((t) => t.family)
    const lastRecovery = families.lastIndexOf('recovery')
    const firstPreparation = families.indexOf('preparation')
    const lastPreparation = families.lastIndexOf('preparation')
    const firstReflection = families.indexOf('reflection')
    expect(firstPreparation).toBeGreaterThan(lastRecovery)
    expect(lastPreparation).toBeLessThan(firstReflection)
    const prepIds = m.totems.filter((t) => t.family === 'preparation').map((t) => t.id)
    expect(prepIds).toEqual(['warm-up-habit', 'triple-preparation'])
  })

  function makeWarmupSession(
    id: string,
    date: string,
    withWarmup: boolean
  ): {
    session: ExecutedSession
    sets: ExecutedSet[]
  } {
    const session = makeSession(id, `t-${id}`, date)
    const sets: ExecutedSet[] = []
    if (withWarmup) {
      const s = makeSet(id, 'ex1', 1, date)
      s.isWarmup = true
      sets.push(s)
    }
    sets.push(makeSet(id, 'ex1', withWarmup ? 2 : 1, date))
    return { session, sets }
  }

  it('warm-up-habit: 9 qualifying sessions stays available', () => {
    const records = Array.from({ length: 9 }, (_, i) =>
      makeWarmupSession(`s${i}`, `2026-04-${String(i + 1).padStart(2, '0')}`, true)
    )
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: records.map((r) => r.session),
        executedSets: records.flatMap((r) => r.sets),
      })
    )
    expect(m.totems.find((t) => t.id === 'warm-up-habit')?.state).toBe('available')
  })

  it('warm-up-habit: 10 qualifying sessions earns at the 10th session date', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      makeWarmupSession(`s${i}`, `2026-04-${String(i + 1).padStart(2, '0')}`, true)
    )
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: records.map((r) => r.session),
        executedSets: records.flatMap((r) => r.sets),
      })
    )
    const t = m.totems.find((x) => x.id === 'warm-up-habit')
    expect(t?.state).toBe('earned')
    expect(t?.earnedDateISO).toBe('2026-04-10')
  })

  it('warm-up-habit: only sessions with at least one warm-up set count', () => {
    // 12 sessions, only 8 with a warm-up set → still available.
    const records = Array.from({ length: 12 }, (_, i) =>
      makeWarmupSession(`s${i}`, `2026-04-${String(i + 1).padStart(2, '0')}`, i < 8)
    )
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: records.map((r) => r.session),
        executedSets: records.flatMap((r) => r.sets),
      })
    )
    expect(m.totems.find((t) => t.id === 'warm-up-habit')?.state).toBe('available')
  })

  it('triple-preparation: 4-session warm-up streak stays available', () => {
    const records = Array.from({ length: 4 }, (_, i) =>
      makeWarmupSession(`s${i}`, `2026-04-${String(i + 1).padStart(2, '0')}`, true)
    )
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: records.map((r) => r.session),
        executedSets: records.flatMap((r) => r.sets),
      })
    )
    expect(m.totems.find((t) => t.id === 'triple-preparation')?.state).toBe('available')
  })

  it('triple-preparation: 5-session warm-up streak earns at the 5th date', () => {
    const records = Array.from({ length: 5 }, (_, i) =>
      makeWarmupSession(`s${i}`, `2026-04-${String(i + 1).padStart(2, '0')}`, true)
    )
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: records.map((r) => r.session),
        executedSets: records.flatMap((r) => r.sets),
      })
    )
    const t = m.totems.find((x) => x.id === 'triple-preparation')
    expect(t?.state).toBe('earned')
    expect(t?.earnedDateISO).toBe('2026-04-05')
  })

  it('triple-preparation: a session without a warm-up resets the streak', () => {
    // Pattern: W W W _ W W W W (longest streak = 4) → not earned.
    const flags = [true, true, true, false, true, true, true, true]
    const records = flags.map((withWarmup, i) =>
      makeWarmupSession(`s${i}`, `2026-04-${String(i + 1).padStart(2, '0')}`, withWarmup)
    )
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: records.map((r) => r.session),
        executedSets: records.flatMap((r) => r.sets),
      })
    )
    expect(m.totems.find((t) => t.id === 'triple-preparation')?.state).toBe('available')
  })

  it('triple-preparation: 6-session warm-up streak earns at the 5th date', () => {
    const records = Array.from({ length: 6 }, (_, i) =>
      makeWarmupSession(`s${i}`, `2026-04-${String(i + 1).padStart(2, '0')}`, true)
    )
    const m = buildTotemInventoryModel(
      baseInput({
        executedSessions: records.map((r) => r.session),
        executedSets: records.flatMap((r) => r.sets),
      })
    )
    expect(m.totems.find((t) => t.id === 'triple-preparation')?.earnedDateISO).toBe('2026-04-05')
  })
})

/**
 * Phase E4f — first-rest-day-honored evaluator tests.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase E sub-phase E4f — Rest-day family". Time-relative evaluator —
 * uses a fixed `nowMs` so the "today" boundary is deterministic.
 *
 * Calendar fixture: `startDate = 2025-06-02` (a Monday), so:
 *   week 1 day 1 → 2025-06-02 (past)
 *   week 1 day 7 → 2025-06-08 (past)
 *   week 2 day 1 → 2025-06-09 (past)
 *   week 2 day 7 → 2025-06-15 (today)
 *   week 3 day 1 → 2025-06-16 (tomorrow)
 */
describe('Phase E4f — first-rest-day-honored', () => {
  const NOW_MS_E4F = Date.UTC(2025, 5, 15) // 2025-06-15T00:00:00Z → todayISO = '2025-06-15'

  function makeRestDayTemplate(
    id: string,
    weekNumber: number,
    dayOfWeek: SessionTemplate['dayOfWeek']
  ): SessionTemplate {
    return {
      id,
      mesocycleId: 'm-rest',
      weekNumber,
      dayOfWeek,
      durationMinutes: 0,
      muscleGroupTargets: [],
      progressionType: 'linear',
      restrictions: [],
      completed: false,
      skipped: false,
      isPlannedRestDay: true,
    }
  }

  function makeRestMeso(sessions: SessionTemplate[]): Mesocycle {
    return {
      id: 'm-rest',
      name: 'rest fixture',
      presetId: 'p',
      startDate: '2025-06-02',
      durationWeeks: Math.max(1, ...sessions.map((s) => s.weekNumber)),
      sessions,
      createdAt: '2025-06-01T00:00:00.000Z',
      active: true,
    }
  }

  function getEntry(input: BuildTotemInventoryInput) {
    const m = buildTotemInventoryModel({ ...input, nowMs: NOW_MS_E4F })
    return m.totems.find((t) => t.id === 'first-rest-day-honored')
  }

  it('1) no planned rest days → available', () => {
    const meso = makeRestMeso([]) // no sessions of any kind
    const entry = getEntry(baseInput({ mesocycles: [meso] }))
    expect(entry?.state).toBe('available')
    expect(entry?.earnedDateISO).toBeNull()
  })

  it('2) one future planned rest day (tomorrow) → available', () => {
    const meso = makeRestMeso([makeRestDayTemplate('rd-future', 3, 1)]) // 2025-06-16
    const entry = getEntry(baseInput({ mesocycles: [meso] }))
    expect(entry?.state).toBe('available')
    expect(entry?.earnedDateISO).toBeNull()
  })

  it('3) one planned rest day === today → available (today exclusive)', () => {
    const meso = makeRestMeso([makeRestDayTemplate('rd-today', 2, 7)]) // 2025-06-15
    const entry = getEntry(baseInput({ mesocycles: [meso] }))
    expect(entry?.state).toBe('available')
    expect(entry?.earnedDateISO).toBeNull()
  })

  it('4) one past planned rest day, no executions on that date → earned', () => {
    const meso = makeRestMeso([makeRestDayTemplate('rd-past', 1, 1)]) // 2025-06-02
    const entry = getEntry(baseInput({ mesocycles: [meso] }))
    expect(entry?.state).toBe('earned')
    expect(entry?.earnedDateISO).toBe('2025-06-02')
  })

  it('5) one past planned rest day, ExecutedSession.date matches → available (honor broken)', () => {
    const meso = makeRestMeso([makeRestDayTemplate('rd-past', 1, 1)]) // 2025-06-02
    const exec = makeSession('exec-on-rest', 'unrelated-tpl', '2025-06-02')
    const entry = getEntry(baseInput({ mesocycles: [meso], executedSessions: [exec] }))
    expect(entry?.state).toBe('available')
    expect(entry?.earnedDateISO).toBeNull()
  })

  it('6) two past planned rest days, both honored → earned, returns the EARLIER date', () => {
    const meso = makeRestMeso([
      makeRestDayTemplate('rd-a', 1, 1), // 2025-06-02
      makeRestDayTemplate('rd-b', 2, 1), // 2025-06-09
    ])
    const entry = getEntry(baseInput({ mesocycles: [meso] }))
    expect(entry?.state).toBe('earned')
    expect(entry?.earnedDateISO).toBe('2025-06-02')
  })

  it('7) two past planned rest days, only the second honored → earned, returns the second date', () => {
    const meso = makeRestMeso([
      makeRestDayTemplate('rd-a', 1, 1), // 2025-06-02 (broken by exec)
      makeRestDayTemplate('rd-b', 2, 1), // 2025-06-09 (honored)
    ])
    const exec = makeSession('exec-broke-a', 'unrelated-tpl', '2025-06-02')
    const entry = getEntry(baseInput({ mesocycles: [meso], executedSessions: [exec] }))
    expect(entry?.state).toBe('earned')
    expect(entry?.earnedDateISO).toBe('2025-06-09')
  })
})
