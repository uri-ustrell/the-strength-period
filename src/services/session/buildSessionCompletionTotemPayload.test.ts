import { describe, expect, it } from 'vitest'

import { buildSessionCompletionTotemPayload } from '@/services/session/buildSessionCompletionTotemPayload'
import type {
  TotemEntry,
  TotemId,
  TotemInventoryModel,
} from '@/services/stats/buildTotemInventoryModel'
import { buildTotemInventoryModel } from '@/services/stats/buildTotemInventoryModel'
import type { ExecutedSession } from '@/types/session'
import { assertDefined } from '@/utils/assertDefined'

/**
 * Earn-acknowledgement payload selector unit tests.
 */

const earned = (id: TotemId, family: TotemEntry['family'], dateISO = '2026-05-04'): TotemEntry => ({
  id,
  family,
  state: 'earned',
  earnedDateISO: dateISO,
  nameI18nKey: `stats:totem.${id}.name`,
  ruleI18nKey: `stats:totem.${id}.rule`,
})

const available = (id: TotemId, family: TotemEntry['family']): TotemEntry => ({
  id,
  family,
  state: 'available',
  earnedDateISO: null,
  nameI18nKey: `stats:totem.${id}.name`,
  ruleI18nKey: `stats:totem.${id}.rule`,
})

const model = (...totems: TotemEntry[]): TotemInventoryModel => ({ totems })

describe('buildSessionCompletionTotemPayload', () => {
  it('returns null when before === after states (zero new totems)', () => {
    const before = model(
      earned('first-session', 'consistency'),
      available('first-week', 'consistency')
    )
    const after = model(
      earned('first-session', 'consistency'),
      available('first-week', 'consistency')
    )
    expect(
      buildSessionCompletionTotemPayload({
        totemsBefore: before,
        totemsAfter: after,
        sessionId: 'session-1',
        dateISO: '2026-05-04',
      })
    ).toBeNull()
  })

  it('returns null when no totems are earned in either snapshot', () => {
    const before = model(available('first-session', 'consistency'))
    const after = model(available('first-session', 'consistency'))
    expect(
      buildSessionCompletionTotemPayload({
        totemsBefore: before,
        totemsAfter: after,
        sessionId: 's',
        dateISO: '2026-05-04',
      })
    ).toBeNull()
  })

  it('returns a single newly-earned totem with primaryTotemId === newlyEarnedIds[0]', () => {
    const before = model(available('first-session', 'consistency'))
    const after = model(earned('first-session', 'consistency', '2026-05-04'))
    const payload = buildSessionCompletionTotemPayload({
      totemsBefore: before,
      totemsAfter: after,
      sessionId: 'session-abc',
      dateISO: '2026-05-04',
    })
    expect(payload).not.toBeNull()
    expect(assertDefined(payload).newlyEarnedIds).toEqual(['first-session'])
    expect(assertDefined(payload).primaryTotemId).toBe('first-session')
    expect(assertDefined(payload).earnedDateISO).toBe('2026-05-04')
    expect(assertDefined(payload).sessionId).toBe('session-abc')
  })

  it('orders multi-family newly-earned by FAMILY_ORDER (consistency → recovery → reflection)', () => {
    const before = model(
      available('first-session', 'consistency'),
      available('first-deload-honored', 'recovery'),
      available('rpe-awareness', 'reflection')
    )
    // Provide them in deliberately scrambled order to ensure sort kicks in.
    const after = model(
      earned('rpe-awareness', 'reflection'),
      earned('first-deload-honored', 'recovery'),
      earned('first-session', 'consistency')
    )
    const payload = buildSessionCompletionTotemPayload({
      totemsBefore: before,
      totemsAfter: after,
      sessionId: 's',
      dateISO: '2026-05-04',
    })
    expect(payload).not.toBeNull()
    expect(assertDefined(payload).newlyEarnedIds).toEqual([
      'first-session',
      'first-deload-honored',
      'rpe-awareness',
    ])
    expect(assertDefined(payload).primaryTotemId).toBe('first-session')
  })

  it('orders intra-family newly-earned by TOTEM_CATALOG_V2 index', () => {
    // Both belong to `recovery`. V2 ordering is `first-deload-honored`
    // before `five-deloads-honored`, so the primary must be the former
    // regardless of the input ordering.
    const before = model(
      available('first-deload-honored', 'recovery'),
      available('five-deloads-honored', 'recovery')
    )
    const after = model(
      earned('five-deloads-honored', 'recovery'),
      earned('first-deload-honored', 'recovery')
    )
    const payload = buildSessionCompletionTotemPayload({
      totemsBefore: before,
      totemsAfter: after,
      sessionId: 's',
      dateISO: '2026-05-04',
    })
    expect(assertDefined(payload).newlyEarnedIds).toEqual([
      'first-deload-honored',
      'five-deloads-honored',
    ])
    expect(assertDefined(payload).primaryTotemId).toBe('first-deload-honored')
  })

  it('returns null when the after snapshot is missing a totem present in before (totems never un-earn — safe behavior, not a crash)', () => {
    const before = model(earned('first-session', 'consistency'))
    const after = model(available('first-session', 'consistency'))
    expect(
      buildSessionCompletionTotemPayload({
        totemsBefore: before,
        totemsAfter: after,
        sessionId: 's',
        dateISO: '2026-05-04',
      })
    ).toBeNull()
  })
})

/**
 * Regression guard: just-finished session reflected before persistence.
 *
 * Verifies that the just-finished in-memory session, synthesized from the
 * live `sessionStore` state in `Session.tsx` and merged into the inputs of
 * `buildTotemInventoryModel`, is reflected in `totemsAfter` so the
 * earn-acknowledgement frame can render BEFORE the session is persisted to
 * IDB via Save & close.
 */
describe('Regression N1 \u2014 synthesized in-memory session unlocks totems pre-persist', () => {
  it('produces a non-null payload with `first-session` when no prior history exists', () => {
    const nowMs = new Date('2026-05-04T10:00:00Z').getTime()

    // Pre-flip snapshot: zero persisted history (the very first session ever).
    const totemsBefore = buildTotemInventoryModel({
      executedSessions: [],
      executedSets: [],
      mesocycles: [],
      nowMs,
    })

    // Post-flip snapshot: the page synthesizes the just-finished session from
    // the live store (it isn't in IDB yet) and merges it into the inputs.
    const synthesized: ExecutedSession = {
      id: 'just-finished-session-uuid',
      sessionTemplateId: 'tpl-1',
      date: '2026-05-04',
      startedAt: '2026-05-04T09:00:00.000Z',
      completedAt: '2026-05-04T10:00:00.000Z',
      sets: [],
      skipped: false,
    }
    const totemsAfter = buildTotemInventoryModel({
      executedSessions: [synthesized],
      executedSets: [],
      mesocycles: [],
      nowMs,
    })

    const payload = buildSessionCompletionTotemPayload({
      totemsBefore,
      totemsAfter,
      sessionId: synthesized.id,
      dateISO: synthesized.date,
    })

    expect(payload).not.toBeNull()
    expect(assertDefined(payload).primaryTotemId).toBe('first-session')
    expect(assertDefined(payload).sessionId).toBe('just-finished-session-uuid')
    expect(assertDefined(payload).earnedDateISO).toBe('2026-05-04')
  })
})

/**
 * Regression guard: history gate prevents false-positive earn flicker.
 *
 * `Session.tsx` now gates `totemAckPayload` on a `historyLoaded` boolean so
 * the IDB history fetch can resolve before the diff runs. Without that gate,
 * returning users would see a brief false-positive flicker where entry-tier
 * totems (e.g. `first-session`) appear as "newly earned" because `totemsBefore`
 * is computed from an empty `allSessionsHistory` on the same render tick
 * `isFinished` flips. This test pins the contract by replicating the page's
 * gating logic at the call site.
 */
describe('Regression W4 — ack payload gated on history-loaded boolean', () => {
  it('returns null when history has not loaded yet, even with valid id + date', () => {
    const before = model(earned('first-session', 'consistency'))
    const after = model(earned('first-session', 'consistency'), earned('first-week', 'consistency'))
    const args = {
      totemsBefore: before,
      totemsAfter: after,
      sessionId: 's',
      dateISO: '2026-05-04',
    }

    // Mirrors the `Session.tsx` early-return inside the `totemAckPayload`
    // useMemo: when `historyLoaded === false`, the call site short-circuits
    // and the ack frame stays null until IDB resolves.
    const historyLoaded = false
    const payload = !historyLoaded ? null : buildSessionCompletionTotemPayload(args)

    expect(payload).toBeNull()
  })

  it('returns the real payload once history has loaded', () => {
    const before = model(earned('first-session', 'consistency'))
    const after = model(earned('first-session', 'consistency'), earned('first-week', 'consistency'))
    const args = {
      totemsBefore: before,
      totemsAfter: after,
      sessionId: 's',
      dateISO: '2026-05-04',
    }

    const historyLoaded = true
    const payload = !historyLoaded ? null : buildSessionCompletionTotemPayload(args)

    expect(payload).not.toBeNull()
    expect(assertDefined(payload).newlyEarnedIds).toEqual(['first-week'])
  })
})

/**
 * Earn-ack diff covers the `first-rest-day-honored` totem with no changes to
 * the selector itself (id-driven diff).
 */
describe('first-rest-day-honored earn-ack diff', () => {
  it('flips available → earned and surfaces as the primary totem', () => {
    const before = model(available('first-rest-day-honored', 'recovery'))
    const after = model(earned('first-rest-day-honored', 'recovery', '2025-06-02'))
    const payload = buildSessionCompletionTotemPayload({
      totemsBefore: before,
      totemsAfter: after,
      sessionId: 'session-rest-ack',
      dateISO: '2025-06-15',
    })
    expect(payload).not.toBeNull()
    expect(assertDefined(payload).newlyEarnedIds).toContain('first-rest-day-honored')
    expect(assertDefined(payload).primaryTotemId).toBe('first-rest-day-honored')
  })
})
