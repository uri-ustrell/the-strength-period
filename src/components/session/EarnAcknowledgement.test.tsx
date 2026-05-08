import { cleanup, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EarnAcknowledgement } from '@/components/session/EarnAcknowledgement'
import type { SessionCompletionTotemPayload } from '@/services/session/buildSessionCompletionTotemPayload'
import { useUserStore } from '@/stores/userStore'
import '@/i18n'

/**
 * Step 16 Phase E sub-phase E1 — render parity tests for the
 * earn-acknowledgement frame.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase E Shared Contracts → E1 — Earn-Acknowledgement Frame Contract"
 * and "Phase E Forbidden Renderings".
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

const singleTotemPayload: SessionCompletionTotemPayload = {
  sessionId: 'session-1',
  newlyEarnedIds: ['first-session'],
  primaryTotemId: 'first-session',
  earnedDateISO: '2026-05-04',
}

const multiTotemPayload: SessionCompletionTotemPayload = {
  sessionId: 'session-2',
  newlyEarnedIds: ['first-session', 'first-deload-honored', 'rpe-awareness'],
  primaryTotemId: 'first-session',
  earnedDateISO: '2026-05-04',
}

describe('<EarnAcknowledgement />', () => {
  beforeEach(() => {
    setMatchMedia(false)
    useUserStore.getState().reset()
  })
  afterEach(() => cleanup())

  it('renders nothing when payload is null', () => {
    useUserStore.getState().setAestheticVariant('classic-boring')
    const { container } = render(
      <EarnAcknowledgement payload={null} primaryName="" secondaryNames={[]} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('classic variant: renders calm headline + body, never references retro keys, never mounts a dialog', () => {
    useUserStore.getState().setAestheticVariant('classic-boring')
    render(
      <EarnAcknowledgement
        payload={singleTotemPayload}
        primaryName="First Session"
        secondaryNames={[]}
      />
    )
    const section = screen.getByTestId('earn-ack')
    expect(section.getAttribute('data-variant')).toBe('classic')
    expect(section.textContent).toContain('New milestone')
    expect(section.textContent).toContain('You earned: First Session.')
    // No retro headline literal anywhere in the subtree.
    expect(section.textContent).not.toContain('Totem earned')
    expect(screen.queryAllByRole('dialog').length).toBe(0)
    expect(screen.queryAllByRole('alertdialog').length).toBe(0)
    expect(document.querySelector('dialog')).toBeNull()
    expect(section.getAttribute('aria-modal')).toBeNull()
  })

  it('retro variant: renders retro headline + body, no dialog, no aria-modal', () => {
    useUserStore.getState().setAestheticVariant('retro-platformer')
    render(
      <EarnAcknowledgement
        payload={singleTotemPayload}
        primaryName="First Session"
        secondaryNames={[]}
      />
    )
    const section = screen.getByTestId('earn-ack')
    expect(section.getAttribute('data-variant')).toBe('retro')
    expect(section.textContent).toContain('Totem earned')
    expect(section.textContent).toContain('First Session unlocked.')
    expect(screen.queryAllByRole('dialog').length).toBe(0)
    expect(screen.queryAllByRole('alertdialog').length).toBe(0)
    expect(document.querySelector('dialog')).toBeNull()
    expect(section.getAttribute('aria-modal')).toBeNull()
  })

  it('multi-totem: renders ONE frame with primary name and an also_earned line listing secondaries', () => {
    useUserStore.getState().setAestheticVariant('classic-boring')
    render(
      <EarnAcknowledgement
        payload={multiTotemPayload}
        primaryName="First Session"
        secondaryNames={['First Deload', 'RPE Awareness']}
      />
    )
    expect(screen.getAllByTestId('earn-ack').length).toBe(1)
    const section = screen.getByTestId('earn-ack')
    expect(section.textContent).toContain('First Session')
    expect(section.textContent).toContain('Also earned: First Deload, RPE Awareness.')
  })

  it('idempotency latch: re-rendering with the same payload (same sessionId) does not crash and renders identically', () => {
    // Today the latch only updates a `useRef`; there is no observable
    // side-effect to spy on. The latch is reserved for E2 Rive autoplay.
    useUserStore.getState().setAestheticVariant('classic-boring')
    const { rerender } = render(
      <EarnAcknowledgement
        payload={singleTotemPayload}
        primaryName="First Session"
        secondaryNames={[]}
      />
    )
    const firstHtml = screen.getByTestId('earn-ack').outerHTML
    rerender(
      <EarnAcknowledgement
        payload={singleTotemPayload}
        primaryName="First Session"
        secondaryNames={[]}
      />
    )
    expect(screen.getAllByTestId('earn-ack').length).toBe(1)
    expect(screen.getByTestId('earn-ack').outerHTML).toBe(firstHtml)
  })

  // W3 strengthening \u2014 key-isolation parity. Each variant must NEVER resolve
  // a key from the opposite variant's namespace, regardless of which copy
  // happens to share substrings between the two trees today.
  describe('key-isolation parity (W3)', () => {
    const matchesAck = (key: unknown): key is string =>
      typeof key === 'string' && key.startsWith('session.completion.totem_ack.')

    it('classic variant resolves only `*.calm.*` ack keys, never `*.retro.*`', () => {
      useUserStore.getState().setAestheticVariant('classic-boring')
      const spy = vi.spyOn(i18next, 't')
      render(
        <EarnAcknowledgement
          payload={singleTotemPayload}
          primaryName="First Session"
          secondaryNames={['Second']}
        />
      )
      const ackKeys = spy.mock.calls.map((c) => c[0]).filter(matchesAck)
      expect(ackKeys.length).toBeGreaterThan(0)
      expect(ackKeys.every((k) => k.includes('.calm.'))).toBe(true)
      expect(ackKeys.some((k) => k.includes('.retro.'))).toBe(false)
      spy.mockRestore()
    })

    it('retro variant resolves only `*.retro.*` ack keys, never `*.calm.*`', () => {
      useUserStore.getState().setAestheticVariant('retro-platformer')
      const spy = vi.spyOn(i18next, 't')
      render(
        <EarnAcknowledgement
          payload={multiTotemPayload}
          primaryName="First Session"
          secondaryNames={['First Deload', 'RPE Awareness']}
        />
      )
      const ackKeys = spy.mock.calls.map((c) => c[0]).filter(matchesAck)
      expect(ackKeys.length).toBeGreaterThan(0)
      expect(ackKeys.every((k) => k.includes('.retro.'))).toBe(true)
      expect(ackKeys.some((k) => k.includes('.calm.'))).toBe(false)
      spy.mockRestore()
    })
  })
})
