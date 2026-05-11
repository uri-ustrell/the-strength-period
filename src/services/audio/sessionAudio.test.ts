import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __resetSessionAudioForTests,
  playRestEndChime,
  playSetCompleteBlip,
} from '@/services/audio/sessionAudio'
import { useUserStore } from '@/stores/userStore'

/**
 * Feature 17 — audio gate is now `userStore.audioOptIn`.
 * Default is `false`, so audio MUST short-circuit unless the user explicitly
 * opts in from Settings. The gate is asserted by spying on the
 * `AudioContext` constructor.
 */

function makeOscillatorMock() {
  const node = {
    type: '',
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  node.connect.mockReturnValue(node)
  return node
}

function audioCtxImpl() {
  return {
    currentTime: 0,
    state: 'running',
    destination: {},
    createOscillator: vi.fn(makeOscillatorMock),
    createGain: vi.fn(() => ({
      gain: { value: 0 },
      connect: vi.fn().mockReturnThis(),
    })),
    close: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
  }
}
const audioCtxCtor = vi.fn(audioCtxImpl)

const originalAudioCtx = (window as unknown as { AudioContext?: unknown }).AudioContext

describe('sessionAudio — Feature 17 audioOptIn gate', () => {
  beforeEach(() => {
    audioCtxCtor.mockClear()
    Object.defineProperty(window, 'AudioContext', {
      writable: true,
      configurable: true,
      value: audioCtxCtor,
    })
    __resetSessionAudioForTests()
    useUserStore.getState().reset()
  })

  afterEach(() => {
    Object.defineProperty(window, 'AudioContext', {
      writable: true,
      configurable: true,
      value: originalAudioCtx,
    })
  })

  it('playRestEndChime fires exactly once when audioOptIn is true', () => {
    useUserStore.getState().setAudioOptIn(true)
    playRestEndChime()
    expect(audioCtxCtor).toHaveBeenCalledTimes(1)
    const ctx = audioCtxCtor.mock.results[0]?.value as {
      createOscillator: ReturnType<typeof vi.fn>
    }
    expect(ctx.createOscillator).toHaveBeenCalledTimes(1)
  })

  it('playRestEndChime is a no-op when audioOptIn is false (default)', () => {
    playRestEndChime()
    playRestEndChime()
    expect(audioCtxCtor).not.toHaveBeenCalled()
  })

  it('playSetCompleteBlip is a no-op when audioOptIn is false', () => {
    playSetCompleteBlip()
    expect(audioCtxCtor).not.toHaveBeenCalled()
  })
})
