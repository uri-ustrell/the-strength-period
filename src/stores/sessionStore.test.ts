import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionStore } from '@/stores/sessionStore'

/**
 * Verifies that `lastFinishedSessionCompletedAtISO` is minted alongside
 * `lastFinishedSessionId` when `isFinished` flips, and cleared by `reset`.
 */

describe('sessionStore — lastFinishedSessionCompletedAtISO', () => {
  beforeEach(() => {
    useSessionStore.getState().reset()
  })

  it('is null in the initial state', () => {
    expect(useSessionStore.getState().lastFinishedSessionCompletedAtISO).toBeNull()
  })

  it('is minted as a full ISO timestamp when isFinished flips via finishEarly', () => {
    const fixedNow = new Date('2026-05-04T17:34:21.123Z')
    vi.useFakeTimers()
    vi.setSystemTime(fixedNow)

    useSessionStore.getState().finishEarly()

    const state = useSessionStore.getState()
    expect(state.lastFinishedSessionCompletedAtISO).toBe(fixedNow.toISOString())
    // Sanity: not midnight of the date string.
    expect(state.lastFinishedSessionCompletedAtISO).not.toBe('2026-05-04T00:00:00.000Z')
    expect(state.lastFinishedSessionId).not.toBeNull()
    expect(state.lastFinishedSessionDateISO).toBe('2026-05-04')

    vi.useRealTimers()
  })

  it('is cleared back to null on reset()', () => {
    useSessionStore.getState().finishEarly()
    expect(useSessionStore.getState().lastFinishedSessionCompletedAtISO).not.toBeNull()

    useSessionStore.getState().reset()
    const state = useSessionStore.getState()
    expect(state.lastFinishedSessionCompletedAtISO).toBeNull()
    expect(state.lastFinishedSessionId).toBeNull()
    expect(state.lastFinishedSessionDateISO).toBeNull()
  })
})
