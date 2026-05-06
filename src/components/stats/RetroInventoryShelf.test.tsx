import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeTotemFixture } from '@/components/stats/__fixtures__/totemFixture'
import { RetroInventoryShelf } from '@/components/stats/RetroInventoryShelf'
import '@/i18n'

/**
 * Step 16 Phase D — D10 RetroInventoryShelf render tests.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase D Shared Contracts (Stats / Inventory)" → forbidden renderings.
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

describe('RetroInventoryShelf', () => {
  beforeEach(() => setMatchMedia(false))
  afterEach(() => cleanup())

  it('renders every totem as a button with aria-pressed and aria-label', () => {
    const model = makeTotemFixture()
    render(<RetroInventoryShelf model={model} />)
    for (const totem of model.totems) {
      const btn = screen.getByTestId(`retro-totem-${totem.id}`)
      expect(btn).toBeTruthy()
      expect(btn.getAttribute('role')).toBe('button')
      expect(btn.getAttribute('aria-pressed')).toBe('false')
      expect(btn.getAttribute('aria-label')).toMatch(/·/)
      expect(btn.getAttribute('data-totem-state')).toMatch(/^(earned|available)$/)
    }
  })

  it('opens an inline inspect panel on click and closes on second click', () => {
    const model = makeTotemFixture()
    render(<RetroInventoryShelf model={model} />)
    const btn = screen.getByTestId('retro-totem-first-session')
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('retro-totem-inspect-first-session')).toBeTruthy()
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryByTestId('retro-totem-inspect-first-session')).toBeNull()
  })

  it('ESC collapses an open inspect panel', () => {
    const model = makeTotemFixture()
    render(<RetroInventoryShelf model={model} />)
    const btn = screen.getByTestId('retro-totem-first-session')
    fireEvent.click(btn)
    expect(screen.getByTestId('retro-totem-inspect-first-session')).toBeTruthy()
    fireEvent.keyDown(btn, { key: 'Escape' })
    expect(screen.queryByTestId('retro-totem-inspect-first-session')).toBeNull()
  })

  it('forbidden-rendering guards: no streak counters, no locked silhouettes, no time-window selectors, no peer comparison, no rarity tiers', () => {
    const model = makeTotemFixture()
    const { container } = render(<RetroInventoryShelf model={model} />)
    expect(container.querySelectorAll('[data-testid*="streak-counter"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid*="streak-banner"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid*="locked-silhouette"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid*="totem-question-mark"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid*="time-window"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid*="period-selector"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid*="peer-comparison"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid*="leaderboard"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid*="rarity-tier-rare"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid*="rarity-tier-epic"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid*="rarity-tier-legendary"]')).toHaveLength(0)
  })

  it('renders calm empty-state copy and zero earned cards when no totem is earned', () => {
    const model = makeTotemFixture([])
    render(<RetroInventoryShelf model={model} />)
    expect(screen.getByTestId('retro-totem-empty')).toBeTruthy()
  })

  it('earned totem buttons expose earned-date via aria-describedby pointing to a hidden span; unearned have none', () => {
    const model = makeTotemFixture()
    render(<RetroInventoryShelf model={model} />)
    for (const totem of model.totems) {
      const btn = screen.getByTestId(`retro-totem-${totem.id}`)
      if (totem.state === 'earned') {
        expect(btn.getAttribute('aria-describedby')).toBe(`totem-date-${totem.id}`)
        const hidden = screen.getByTestId(`retro-totem-date-${totem.id}`)
        expect(hidden.id).toBe(`totem-date-${totem.id}`)
        expect(hidden.className).toMatch(/sr-only/)
        expect(hidden.textContent ?? '').not.toBe('')
      } else {
        expect(btn.getAttribute('aria-describedby')).toBeNull()
        expect(screen.queryByTestId(`retro-totem-date-${totem.id}`)).toBeNull()
      }
    }
  })
})
