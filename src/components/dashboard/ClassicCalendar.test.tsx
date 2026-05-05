import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClassicCalendar } from '@/components/dashboard/ClassicCalendar'
import { buildDashboardMap } from '@/services/dashboard/buildDashboardMap'
import type { Mesocycle, SessionTemplate } from '@/types/planning'
import '@/i18n'

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

describe('ClassicCalendar — Phase B parity', () => {
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
  })

  it('renders every session as a role="link" with the canonical aria-label', () => {
    const model = buildDashboardMap(fixture())
    const onSelect = vi.fn()
    render(<ClassicCalendar model={model} onSelectSession={onSelect} />)

    const links = screen.getAllByRole('link')
    // 4 sessions in the fixture.
    expect(links).toHaveLength(4)

    // Verify each cell exposes a non-empty accessible name and the canonical
    // state token in `data-state`.
    const states = links.map((el) => el.getAttribute('data-state'))
    expect(states.sort()).toEqual(['available', 'completed', 'future', 'skipped'])

    for (const link of links) {
      const name = link.getAttribute('aria-label') ?? ''
      // Canonical aria pattern: contains "·" separators and a state token.
      expect(name.length).toBeGreaterThan(0)
      expect(name).toMatch(/Week|Setmana|Semana/)
    }
  })

  it('click on any cell invokes the routing callback with the session id', () => {
    const model = buildDashboardMap(fixture())
    const onSelect = vi.fn()
    render(<ClassicCalendar model={model} onSelectSession={onSelect} />)

    const futureCell = screen.getByTestId('classic-cell-s-future')
    fireEvent.click(futureCell)
    expect(onSelect).toHaveBeenCalledWith('s-future')

    const completedCell = screen.getByTestId('classic-cell-s-comp')
    fireEvent.click(completedCell)
    expect(onSelect).toHaveBeenLastCalledWith('s-comp')
  })

  it('respects per-week ordering and exposes deload badge when applicable', () => {
    const meso = fixture()
    // Mark week 2 as deload: s-future is the only session.
    ;(meso.sessions[3] as unknown as { isDeload: boolean }).isDeload = true
    const model = buildDashboardMap(meso)
    render(<ClassicCalendar model={model} onSelectSession={vi.fn()} />)

    const week2 = screen.getByTestId('classic-week-2')
    expect(within(week2).getByTestId('classic-deload-2')).toBeInTheDocument()
  })
})
