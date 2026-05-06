import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __resetStatsAudioForTests,
  playTotemInspect,
  resetTotemInspect,
} from '@/services/audio/statsAudio'
import { useUserStore } from '@/stores/userStore'

/**
 * Step 16 Phase D — D9 audio gating contract.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase D Shared Contracts → Audio Gating Contract".
 *
 * Mirrors `sessionAudio.test.ts` exactly. Asserts:
 *   • `playTotemInspect` short-circuits in `classic-boring` (no
 *     `AudioContext` is constructed).
 *   • In `retro-platformer` it fires exactly once per inspect-open;
 *     subsequent calls within the same open session are no-ops until
 *     `resetTotemInspect()` is invoked.
 */

type OscillatorMock = {
  type: string
  frequency: { value: number }
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

function makeOscillatorMock(): OscillatorMock {
  const node = {
    type: '',
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  } as OscillatorMock
  node.connect.mockReturnValue(node)
  return node
}

function audioCtxImpl() {
  return {
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(makeOscillatorMock),
    createGain: vi.fn(() => ({
      gain: { value: 0 },
      connect: vi.fn().mockReturnThis(),
    })),
  }
}
const audioCtxCtor = vi.fn(audioCtxImpl)

const originalAudioCtx = (window as unknown as { AudioContext?: unknown }).AudioContext

describe('statsAudio — D9 variant gating', () => {
  beforeEach(() => {
    audioCtxCtor.mockClear()
    Object.defineProperty(window, 'AudioContext', {
      writable: true,
      configurable: true,
      value: audioCtxCtor,
    })
    useUserStore.getState().reset()
    __resetStatsAudioForTests()
  })

  afterEach(() => {
    Object.defineProperty(window, 'AudioContext', {
      writable: true,
      configurable: true,
      value: originalAudioCtx,
    })
    __resetStatsAudioForTests()
  })

  it('playTotemInspect fires exactly once per inspect-open in retro-platformer', () => {
    useUserStore.getState().setAestheticVariant('retro-platformer')
    playTotemInspect()
    // Second call within the same inspect-open must be a no-op.
    playTotemInspect()
    expect(audioCtxCtor).toHaveBeenCalledTimes(1)
    const ctxInstance = audioCtxCtor.mock.results[0]?.value as {
      createOscillator: ReturnType<typeof vi.fn>
    }
    expect(ctxInstance.createOscillator).toHaveBeenCalledTimes(1)
  })

  it('playTotemInspect re-arms after resetTotemInspect', () => {
    useUserStore.getState().setAestheticVariant('retro-platformer')
    playTotemInspect()
    resetTotemInspect()
    playTotemInspect()
    // Constructor cached after the first context creation; second oscillator
    // is created on the same context instance.
    const ctxInstance = audioCtxCtor.mock.results[0]?.value as {
      createOscillator: ReturnType<typeof vi.fn>
    }
    expect(ctxInstance.createOscillator).toHaveBeenCalledTimes(2)
  })

  it('playTotemInspect is a no-op in classic-boring', () => {
    useUserStore.getState().setAestheticVariant('classic-boring')
    playTotemInspect()
    playTotemInspect()
    expect(audioCtxCtor).not.toHaveBeenCalled()
  })
})
