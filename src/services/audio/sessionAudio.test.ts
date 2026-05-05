import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { playRestEndChime, playSetCompleteBlip } from '@/services/audio/sessionAudio'
import { useUserStore } from '@/stores/userStore'

/**
 * Step 16 Phase C — C9 audio gating contract.
 *
 * Asserts the invariant from `specs/features/16-ethical-gamification.md`
 * → "Audio Gating Contract": both `playRestEndChime` and
 * `playSetCompleteBlip` MUST short-circuit when the effective variant
 * is not `retro-platformer`. We assert the gate by spying on the
 * `AudioContext` constructor: if the gate holds, no context is created.
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
    // `connect` returns the next node; the audio code chains
    // `osc.connect(gain).connect(audioCtx.destination)`.
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

describe('sessionAudio — C9 variant gating', () => {
  beforeEach(() => {
    audioCtxCtor.mockClear()
    Object.defineProperty(window, 'AudioContext', {
      writable: true,
      configurable: true,
      value: audioCtxCtor,
    })
    useUserStore.getState().reset()
  })

  afterEach(() => {
    Object.defineProperty(window, 'AudioContext', {
      writable: true,
      configurable: true,
      value: originalAudioCtx,
    })
  })

  it('playRestEndChime fires exactly once when variant is retro-platformer', () => {
    useUserStore.getState().setAestheticVariant('retro-platformer')
    playRestEndChime()
    // Constructor invoked exactly once on first call (cache populates).
    expect(audioCtxCtor).toHaveBeenCalledTimes(1)
    const ctxInstance = audioCtxCtor.mock.results[0]?.value as {
      createOscillator: ReturnType<typeof vi.fn>
    }
    expect(ctxInstance.createOscillator).toHaveBeenCalledTimes(1)
  })

  it('playRestEndChime is a no-op when variant is classic-boring', () => {
    useUserStore.getState().setAestheticVariant('classic-boring')
    playRestEndChime()
    playRestEndChime()
    expect(audioCtxCtor).not.toHaveBeenCalled()
  })

  it('playSetCompleteBlip is a no-op when variant is classic-boring', () => {
    useUserStore.getState().setAestheticVariant('classic-boring')
    playSetCompleteBlip()
    expect(audioCtxCtor).not.toHaveBeenCalled()
  })
})
