import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTotemFixture } from '@/components/stats/__fixtures__/totemFixture'
import { TotemInventory } from '@/components/stats/TotemInventory'
import { useUserStore } from '@/stores/userStore'
import '@/i18n'

/**
 * Step 16 Phase D — D10 cross-variant parity test.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase D Shared Contracts (Stats / Inventory)" + D10 in `tasks/todo.md`.
 *
 * Renders `<TotemInventory />` against the SAME `TotemInventoryModel`
 * fixture twice — once per persisted aesthetic variant — and asserts:
 *   1. Both trees expose the same totem-id ordering for `state === 'earned'`
 *      surfaces.
 *   2. Each variant uses its own subtree (`retro-totem-*` vs
 *      `classic-totem-*`) and the other subtree's testids are absent.
 *   3. Switching the variant does NOT mutate the underlying model object.
 *   4. Inspect interaction works in both variants.
 */

function setMatchMedia(matches: boolean) {
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

describe('TotemInventory — cross-variant parity', () => {
  beforeEach(() => {
    setMatchMedia(false)
    useUserStore.getState().reset()
  })
  afterEach(() => cleanup())

  it('renders identical earned totem ordering and flips subtree per persisted variant without mutating the model', () => {
    const model = makeTotemFixture()
    const modelSnapshot = JSON.stringify(model)
    const earnedIds = model.totems.filter((t) => t.state === 'earned').map((t) => t.id)

    // ── retro-platformer ──────────────────────────────────────────────
    useUserStore.getState().setAestheticVariant('retro-platformer')
    const { unmount } = render(<TotemInventory model={model} />)
    expect(JSON.stringify(model)).toBe(modelSnapshot)
    expect(screen.getByTestId('retro-inventory-shelf')).toBeTruthy()
    expect(screen.queryByTestId('classic-totem-grid')).toBeNull()
    const retroEarnedIds = earnedIds.filter((id) =>
      Boolean(screen.queryByTestId(`retro-totem-${id}`))
    )
    expect(retroEarnedIds).toEqual(earnedIds)
    // Click an earned totem → inspect panel opens.
    fireEvent.click(screen.getByTestId(`retro-totem-${earnedIds[0]}`))
    expect(screen.getByTestId(`retro-totem-inspect-${earnedIds[0]}`)).toBeTruthy()
    unmount()
    cleanup()

    // ── classic-boring ────────────────────────────────────────────────
    useUserStore.getState().setAestheticVariant('classic-boring')
    render(<TotemInventory model={model} />)
    expect(JSON.stringify(model)).toBe(modelSnapshot)
    expect(screen.getByTestId('classic-totem-grid')).toBeTruthy()
    expect(screen.queryByTestId('retro-inventory-shelf')).toBeNull()
    const classicEarnedIds = earnedIds.filter((id) =>
      Boolean(screen.queryByTestId(`classic-totem-${id}`))
    )
    expect(classicEarnedIds).toEqual(earnedIds)
    fireEvent.click(screen.getByTestId(`classic-totem-${earnedIds[0]}`))
    expect(screen.getByTestId(`classic-totem-inspect-${earnedIds[0]}`)).toBeTruthy()
  })

  it('reduced-motion forces classic without mutating persisted variant', () => {
    setMatchMedia(true)
    useUserStore.getState().setAestheticVariant('retro-platformer')
    render(<TotemInventory model={makeTotemFixture()} />)
    expect(screen.getByTestId('classic-totem-grid')).toBeTruthy()
    expect(screen.queryByTestId('retro-inventory-shelf')).toBeNull()
    // Persisted preference is preserved.
    expect(useUserStore.getState().aestheticVariant).toBe('retro-platformer')
  })

  it('forbidden-rendering parity: in either variant zero matches for streak/silhouette/time-window/peer/rarity testids', () => {
    const model = makeTotemFixture()
    useUserStore.getState().setAestheticVariant('retro-platformer')
    const { container: retro, unmount } = render(<TotemInventory model={model} />)
    const guard = (root: HTMLElement) => {
      expect(root.querySelectorAll('[data-testid*="streak-counter"]')).toHaveLength(0)
      expect(root.querySelectorAll('[data-testid*="streak-banner"]')).toHaveLength(0)
      expect(root.querySelectorAll('[data-testid*="locked-silhouette"]')).toHaveLength(0)
      expect(root.querySelectorAll('[data-testid*="totem-question-mark"]')).toHaveLength(0)
      expect(root.querySelectorAll('[data-testid*="time-window"]')).toHaveLength(0)
      expect(root.querySelectorAll('[data-testid*="period-selector"]')).toHaveLength(0)
      expect(root.querySelectorAll('[data-testid*="peer-comparison"]')).toHaveLength(0)
      expect(root.querySelectorAll('[data-testid*="leaderboard"]')).toHaveLength(0)
      expect(root.querySelectorAll('[data-testid*="rarity-tier-rare"]')).toHaveLength(0)
      expect(root.querySelectorAll('[data-testid*="rarity-tier-epic"]')).toHaveLength(0)
      expect(root.querySelectorAll('[data-testid*="rarity-tier-legendary"]')).toHaveLength(0)
    }
    guard(retro)
    unmount()
    cleanup()
    useUserStore.getState().setAestheticVariant('classic-boring')
    const { container: classic } = render(<TotemInventory model={model} />)
    guard(classic)
  })
})
