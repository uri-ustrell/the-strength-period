import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useEffectiveAestheticVariant } from '@/hooks/useEffectiveAestheticVariant'
import { useUserStore } from '@/stores/userStore'

/**
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "`prefers-reduced-motion` Behavior".
 *
 * When the OS reports reduced motion, the hook MUST return `'classic-boring'`
 * regardless of the persisted preference, AND it MUST NOT mutate the store —
 * the persisted value is restored verbatim once reduced motion is no longer
 * reported. We assert both: returned value, and that `setAestheticVariant`
 * was never called as a side-effect of rendering.
 */

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('useEffectiveAestheticVariant — reduced-motion override', () => {
  let setSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    useUserStore.getState().reset()
    setSpy = vi.spyOn(useUserStore.getState(), 'setAestheticVariant')
  })

  afterEach(() => {
    setSpy.mockRestore()
  })

  it("returns 'classic-boring' when prefers-reduced-motion is active and does NOT mutate the persisted variant", () => {
    // Persist a non-default choice first.
    useUserStore.setState({ aestheticVariant: 'retro-platformer' })
    mockMatchMedia(true)

    const { result } = renderHook(() => useEffectiveAestheticVariant())

    expect(result.current).toBe('classic-boring')
    // Persisted value preserved across the override.
    expect(useUserStore.getState().aestheticVariant).toBe('retro-platformer')
    // No write-back.
    expect(setSpy).not.toHaveBeenCalled()
  })

  it('returns the persisted variant when reduced motion is not active', () => {
    useUserStore.setState({ aestheticVariant: 'retro-platformer' })
    mockMatchMedia(false)

    const { result } = renderHook(() => useEffectiveAestheticVariant())

    expect(result.current).toBe('retro-platformer')
    expect(useUserStore.getState().aestheticVariant).toBe('retro-platformer')
    expect(setSpy).not.toHaveBeenCalled()
  })
})
