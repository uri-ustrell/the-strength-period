import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTotemFixture } from '@/components/stats/__fixtures__/totemFixture'
import { ClassicTotemGrid } from '@/components/stats/ClassicTotemGrid'
import '@/i18n'

/**
 * Step 16 Phase D — D10 ClassicTotemGrid render tests.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase D Shared Contracts (Stats / Inventory)" → forbidden renderings,
 * audio gating (no `<audio>` mounts in classic), and visual mapping
 * (unearned only inside the "Reachable" disclosure).
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

describe('ClassicTotemGrid', () => {
  beforeEach(() => setMatchMedia(false))
  afterEach(() => cleanup())

  it('renders earned cards with role=button + aria-pressed and matching aria-label', () => {
    const model = makeTotemFixture()
    render(<ClassicTotemGrid model={model} />)
    const earnedTotems = model.totems.filter((t) => t.state === 'earned')
    for (const totem of earnedTotems) {
      const btn = screen.getByTestId(`classic-totem-${totem.id}`)
      expect(btn).toBeTruthy()
      expect(btn.getAttribute('role')).toBe('button')
      expect(btn.getAttribute('aria-pressed')).toBe('false')
      expect(btn.getAttribute('aria-label')).toMatch(/·/)
      expect(btn.getAttribute('data-totem-state')).toBe('earned')
    }
  })

  it('does not place unearned totems in the main grid (only in the Reachable disclosure)', () => {
    const model = makeTotemFixture()
    render(<ClassicTotemGrid model={model} />)
    const unearned = model.totems.filter((t) => t.state === 'available')
    for (const totem of unearned) {
      // Not in main grid as a card.
      expect(screen.queryByTestId(`classic-totem-${totem.id}`)).toBeNull()
      // But IS present inside the disclosure.
      expect(screen.getByTestId(`classic-reachable-${totem.id}`)).toBeTruthy()
    }
    // Disclosure trigger present.
    expect(screen.getByTestId('classic-totem-reachable')).toBeTruthy()
  })

  it('opens an inline inspect panel on click and closes on second click / ESC', () => {
    const model = makeTotemFixture()
    render(<ClassicTotemGrid model={model} />)
    const btn = screen.getByTestId('classic-totem-first-session')
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('classic-totem-inspect-first-session')).toBeTruthy()
    fireEvent.keyDown(btn, { key: 'Escape' })
    expect(screen.queryByTestId('classic-totem-inspect-first-session')).toBeNull()
  })

  it('forbidden-rendering guards (parity with retro): no streak counters / silhouettes / time-window / peer / rarity', () => {
    const model = makeTotemFixture()
    const { container } = render(<ClassicTotemGrid model={model} />)
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

  it('mounts NO <audio> element', () => {
    const model = makeTotemFixture()
    const { container } = render(<ClassicTotemGrid model={model} />)
    expect(container.querySelectorAll('audio')).toHaveLength(0)
  })

  it('renders calm empty-state copy when zero totems are earned', () => {
    const model = makeTotemFixture([])
    render(<ClassicTotemGrid model={model} />)
    expect(screen.getByTestId('classic-totem-empty')).toBeTruthy()
  })

  it('earned cards expose earned-date via aria-describedby pointing to a hidden span; unearned cards do not exist in the main grid', () => {
    const model = makeTotemFixture()
    render(<ClassicTotemGrid model={model} />)
    const earned = model.totems.filter((t) => t.state === 'earned')
    for (const totem of earned) {
      const btn = screen.getByTestId(`classic-totem-${totem.id}`)
      expect(btn.getAttribute('aria-describedby')).toBe(`totem-date-${totem.id}`)
      const hidden = screen.getByTestId(`classic-totem-date-${totem.id}`)
      expect(hidden.id).toBe(`totem-date-${totem.id}`)
      expect(hidden.className).toMatch(/sr-only/)
      expect(hidden.textContent ?? '').not.toBe('')
    }
    const unearned = model.totems.filter((t) => t.state === 'available')
    for (const totem of unearned) {
      // Unearned totems are not rendered as buttons in the main grid, so
      // there is nothing to carry an `aria-describedby` attribute.
      expect(screen.queryByTestId(`classic-totem-${totem.id}`)).toBeNull()
      expect(screen.queryByTestId(`classic-totem-date-${totem.id}`)).toBeNull()
    }
  })
})
