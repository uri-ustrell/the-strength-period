import { cleanup, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DashboardMap } from '@/components/dashboard/DashboardMap'
import { buildDashboardMap } from '@/services/dashboard/buildDashboardMap'
import { useUserStore } from '@/stores/userStore'
import type { Mesocycle, SessionTemplate } from '@/types/planning'
import '@/i18n'

/**
 * Step 16 Phase B — B9 cross-variant parity test.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase B Shared Contracts (Dashboard)" + B9 in `tasks/todo.md`.
 *
 * Renders `<DashboardMap />` against the SAME `DashboardMapModel` fixture
 * twice — once per persisted aesthetic variant — and asserts:
 *   1. Both trees expose the same set of `[data-state]` values in the same
 *      chronological order.
 *   2. Every link routes to the same `sessionId` (no divergence in the click
 *      target between variants).
 *   3. Switching the persisted variant flips the rendered subtree
 *      (`retro-node-*` vs `classic-cell-*`) without mutating the underlying
 *      model object.
 */

function makeSession(
  id: string,
  weekNumber: number,
  dayOfWeek: SessionTemplate['dayOfWeek'],
  overrides: Partial<SessionTemplate> = {}
): SessionTemplate {
  return {
    id,
    mesocycleId: 'm1',
    weekNumber,
    dayOfWeek,
    durationMinutes: 45,
    muscleGroupTargets: [],
    progressionType: 'linear',
    restrictions: [],
    completed: false,
    skipped: false,
    ...overrides,
  }
}

function fixture(): Mesocycle {
  return {
    id: 'm1',
    name: 'Fixture',
    presetId: 'p1',
    startDate: '2026-01-01',
    durationWeeks: 2,
    sessions: [
      makeSession('s-comp', 1, 1, { completed: true }),
      makeSession('s-skip', 1, 3, { skipped: true }),
      makeSession('s-avail', 1, 5),
      makeSession('s-future', 2, 1),
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    active: true,
  }
}

describe('DashboardMap — cross-variant parity', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    useUserStore.getState().reset()
  })

  it('renders identical [data-state] order and identical sessionId routing across both variants', () => {
    const model = buildDashboardMap(fixture())
    const modelSnapshot = JSON.stringify(model)

    // ── retro-platformer ──────────────────────────────────────────────
    useUserStore.getState().setAestheticVariant('retro-platformer')
    const { unmount: unmountRetro } = render(
      <DashboardMap model={model} onSelectSession={vi.fn()} />
    )
    const retroLinks = screen.getAllByRole('link')
    const retroStates = retroLinks.map((el) => el.getAttribute('data-state'))
    const retroIds = retroLinks.map((el) =>
      (el.getAttribute('data-testid') ?? '').replace('retro-node-', '')
    )
    // Confirm the retro subtree is the one rendered.
    expect(screen.queryAllByTestId(/^retro-node-/)).toHaveLength(retroLinks.length)
    expect(screen.queryAllByTestId(/^classic-cell-/)).toHaveLength(0)
    unmountRetro()
    cleanup()

    // ── classic-boring ────────────────────────────────────────────────
    useUserStore.getState().setAestheticVariant('classic-boring')
    render(<DashboardMap model={model} onSelectSession={vi.fn()} />)
    const classicLinks = screen.getAllByRole('link')
    const classicStates = classicLinks.map((el) => el.getAttribute('data-state'))
    const classicIds = classicLinks.map((el) =>
      (el.getAttribute('data-testid') ?? '').replace('classic-cell-', '')
    )
    expect(screen.queryAllByTestId(/^classic-cell-/)).toHaveLength(classicLinks.length)
    expect(screen.queryAllByTestId(/^retro-node-/)).toHaveLength(0)

    // ── parity assertions ─────────────────────────────────────────────
    expect(classicStates).toEqual(retroStates)
    expect(classicIds).toEqual(retroIds)
    // Model object never mutated by either render.
    expect(JSON.stringify(model)).toBe(modelSnapshot)
  })
})
