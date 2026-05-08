import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdherenceChart } from '@/components/stats/AdherenceChart'
import { ChartThemeProvider } from '@/components/stats/ChartThemeProvider'
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
  { week: 'W1', planned: 3, completed: 2 },
  { week: 'W2', planned: 3, completed: 3 },
]

describe('<AdherenceChart /> theming parity', () => {
  beforeEach(() => {
    setMatchMedia(false)
    useUserStore.getState().reset()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('classic: bars consume series tokens; legend wrapper uses var fallback', () => {
    useUserStore.getState().setAestheticVariant('classic-boring')
    const { container } = render(
      <ChartThemeProvider>
        <AdherenceChart data={fixture} />
      </ChartThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-aesthetic-variant')).toBe('classic-boring')
    // Recharts <Bar> rectangles do not paint in jsdom (no layout/animation),
    // but the legend icons (one <path> per series) do carry the resolved fill.
    const legendIcons = container.querySelectorAll('path.recharts-legend-icon')
    expect(legendIcons.length).toBeGreaterThanOrEqual(2)
    const fills = Array.from(legendIcons).map((p) => p.getAttribute('fill'))
    expect(fills).toContain('var(--theme-charts-series-3)')
    expect(fills).toContain('var(--theme-charts-series-1)')
    const legend = container.querySelector('.recharts-legend-wrapper') as HTMLElement | null
    expect(legend?.getAttribute('style') ?? '').toContain('--theme-game-charts-axis-font')
  })

  it('retro: bars use same series tokens; axis ticks pick up pixel font-family', () => {
    useUserStore.getState().setAestheticVariant('retro-platformer')
    const { container } = render(
      <ChartThemeProvider>
        <AdherenceChart data={fixture} />
      </ChartThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-aesthetic-variant')).toBe('retro-platformer')
    const legendIcons = container.querySelectorAll('path.recharts-legend-icon')
    const fills = Array.from(legendIcons).map((p) => p.getAttribute('fill'))
    expect(fills).toContain('var(--theme-charts-series-3)')
    expect(fills).toContain('var(--theme-charts-series-1)')
    const tick = container.querySelector(
      '.recharts-cartesian-axis-tick-value'
    ) as SVGTextElement | null
    expect(tick?.getAttribute('font-family')).toContain('--theme-game-charts-axis-font')
  })
})
