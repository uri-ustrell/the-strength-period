import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RetroWorldMap } from '@/components/dashboard/RetroWorldMap'
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

describe('RetroWorldMap — Phase B parity', () => {
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

  it('renders every session as role="link" with canonical aria-label and 5 valid states', () => {
    const model = buildDashboardMap(fixture())
    const onSelect = vi.fn()
    render(<RetroWorldMap model={model} onSelectSession={onSelect} />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(4)
    const states = links.map((el) => el.getAttribute('data-state')).sort()
    expect(states).toEqual(['available', 'completed', 'future', 'skipped'])

    for (const link of links) {
      expect(link.getAttribute('aria-label')).toBeTruthy()
    }
  })

  it('routes click events to the callback regardless of state (lock = storytelling only)', () => {
    const model = buildDashboardMap(fixture())
    const onSelect = vi.fn()
    render(<RetroWorldMap model={model} onSelectSession={onSelect} />)

    // Future node must still be clickable.
    fireEvent.click(screen.getByTestId('retro-node-s-future'))
    expect(onSelect).toHaveBeenCalledWith('s-future')

    fireEvent.click(screen.getByTestId('retro-node-s-skip'))
    expect(onSelect).toHaveBeenLastCalledWith('s-skip')
  })

  it('shows the deload badge when the week is marked as deload', () => {
    const meso = fixture()
    ;(meso.sessions[3] as unknown as { isDeload: boolean }).isDeload = true
    const model = buildDashboardMap(meso)
    render(<RetroWorldMap model={model} onSelectSession={vi.fn()} />)
    const week2 = screen.getByTestId('retro-world-2')
    expect(within(week2).getByTestId('retro-deload-2')).toBeInTheDocument()
  })
})
