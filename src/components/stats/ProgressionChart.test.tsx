import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ChartThemeProvider } from '@/components/stats/ChartThemeProvider'
import { ProgressionChart } from '@/components/stats/ProgressionChart'
import { useUserStore } from '@/stores/userStore'
import '@/i18n'

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  const React = await import('react')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children as React.ReactElement<{ width?: number; height?: number }>, { width: 600, height: 300 }),
  }
})

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

const fixture = [
  { date: '2026-04-01', weight: 80, volume: 400 },
  { date: '2026-04-08', weight: 82, volume: 420 },
]

describe('<ProgressionChart /> theming parity', () => {
  beforeEach(() => {
    setMatchMedia(false)
    useUserStore.getState().reset()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('classic: lines consume series tokens; axis ticks fill via shared variable', () => {
    useUserStore.getState().setAestheticVariant('classic-boring')
    const { container } = render(
      <ChartThemeProvider>
        <ProgressionChart data={fixture} exerciseName="Squat" />
      </ChartThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-aesthetic-variant')).toBe('classic-boring')
    const tick = container.querySelector(
      '.recharts-cartesian-axis-tick-value'
    ) as SVGTextElement | null
    expect(tick?.getAttribute('fill')).toBe('var(--theme-charts-axis-fg)')
    const lines = container.querySelectorAll('.recharts-line-curve')
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(lines[0]?.getAttribute('stroke')).toBe('var(--theme-charts-series-1)')
    expect(lines[1]?.getAttribute('stroke')).toBe('var(--theme-charts-series-2)')
  })

  it('retro: same series tokens (overridden at wrapper scope); axis tick font-family uses pixel fallback', () => {
    useUserStore.getState().setAestheticVariant('retro-platformer')
    const { container } = render(
      <ChartThemeProvider>
        <ProgressionChart data={fixture} exerciseName="Squat" />
      </ChartThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-aesthetic-variant')).toBe('retro-platformer')
    const tick = container.querySelector(
      '.recharts-cartesian-axis-tick-value'
    ) as SVGTextElement | null
    expect(tick?.getAttribute('font-family')).toContain('--theme-game-charts-axis-font')
    const lines = container.querySelectorAll('.recharts-line-curve')
    expect(lines[0]?.getAttribute('stroke')).toBe('var(--theme-charts-series-1)')
    expect(lines[1]?.getAttribute('stroke')).toBe('var(--theme-charts-series-2)')
  })
})
