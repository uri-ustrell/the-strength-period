import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ChartThemeProvider } from '@/components/stats/ChartThemeProvider'
import { VolumeChart } from '@/components/stats/VolumeChart'
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
  { week: 'W1', quadriceps: 5, pectoral: 3 },
  { week: 'W2', quadriceps: 6, pectoral: 4 },
]

describe('<VolumeChart /> theming parity', () => {
  beforeEach(() => {
    setMatchMedia(false)
    useUserStore.getState().reset()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('classic: wrapper marks classic; axis ticks fill via shared CSS variable; legend wrapper uses var fallback', () => {
    useUserStore.getState().setAestheticVariant('classic-boring')
    const { container } = render(
      <ChartThemeProvider>
        <VolumeChart data={fixture} muscleGroups={['quadriceps', 'pectoral']} />
      </ChartThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-aesthetic-variant')).toBe('classic-boring')
    const tickText = container.querySelector(
      '.recharts-cartesian-axis-tick-value'
    ) as SVGTextElement | null
    expect(tickText?.getAttribute('fill')).toBe('var(--theme-charts-axis-fg)')
    const legend = container.querySelector('.recharts-legend-wrapper') as HTMLElement | null
    expect(legend?.getAttribute('style') ?? '').toContain('--theme-game-charts-axis-font')
  })

  it('retro: wrapper marks retro; axis ticks fill via shared CSS variable; legend wrapper uses var fallback', () => {
    useUserStore.getState().setAestheticVariant('retro-platformer')
    const { container } = render(
      <ChartThemeProvider>
        <VolumeChart data={fixture} muscleGroups={['quadriceps', 'pectoral']} />
      </ChartThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-aesthetic-variant')).toBe('retro-platformer')
    const tickText = container.querySelector(
      '.recharts-cartesian-axis-tick-value'
    ) as SVGTextElement | null
    expect(tickText?.getAttribute('fill')).toBe('var(--theme-charts-axis-fg)')
    const legend = container.querySelector('.recharts-legend-wrapper') as HTMLElement | null
    expect(legend?.getAttribute('style') ?? '').toContain('--theme-game-charts-axis-font')
  })
})
