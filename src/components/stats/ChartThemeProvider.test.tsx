import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ChartThemeProvider,
  useChartTheme,
} from '@/components/stats/ChartThemeProvider'
import { useUserStore } from '@/stores/userStore'

/**
 * Step 16 Phase E sub-phase E3 — chart variant theming wrapper tests.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase E Shared Contracts (Polish + Deferred Totems) → E3 — Chart
 * Variant Theming Contract".
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

const Probe = () => {
  const { isAnimationActive } = useChartTheme()
  return <span data-testid="probe">{isAnimationActive ? 'animated' : 'static'}</span>
}

describe('<ChartThemeProvider />', () => {
  beforeEach(() => {
    setMatchMedia(false)
    useUserStore.getState().reset()
  })
  afterEach(() => cleanup())

  it('classic variant: wrapper does NOT set retro-only --theme-game-charts-axis-font', () => {
    useUserStore.getState().setAestheticVariant('classic-boring')
    const { container } = render(
      <ChartThemeProvider>
        <div data-testid="child" />
      </ChartThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-aesthetic-variant')).toBe('classic-boring')
    expect(wrapper.style.getPropertyValue('--theme-game-charts-axis-font')).toBe('')
    expect(wrapper.style.getPropertyValue('--theme-charts-axis-fg')).toBe('')
  })

  it('retro variant: wrapper sets pixel mono --theme-game-charts-axis-font and #1f2937 axis-fg', () => {
    useUserStore.getState().setAestheticVariant('retro-platformer')
    const { container } = render(
      <ChartThemeProvider>
        <div data-testid="child" />
      </ChartThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-aesthetic-variant')).toBe('retro-platformer')
    const axisFont = wrapper.style.getPropertyValue('--theme-game-charts-axis-font')
    expect(axisFont).toContain('ui-monospace')
    expect(axisFont).toContain('Menlo')
    expect(wrapper.style.getPropertyValue('--theme-charts-axis-fg')).toBe('#1f2937')
    expect(wrapper.style.getPropertyValue('--theme-charts-tooltip-bg')).toBe('#fef3c7')
  })

  it('reduced-motion: useChartTheme returns isAnimationActive=false', () => {
    setMatchMedia(true)
    useUserStore.getState().setAestheticVariant('classic-boring')
    render(
      <ChartThemeProvider>
        <Probe />
      </ChartThemeProvider>
    )
    expect(screen.getByTestId('probe').textContent).toBe('static')
  })

  it('reduced-motion + retro persisted: collapses to classic, no retro overrides leak', () => {
    setMatchMedia(true)
    useUserStore.getState().setAestheticVariant('retro-platformer')
    const { container } = render(
      <ChartThemeProvider>
        <Probe />
      </ChartThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    // useEffectiveAestheticVariant collapses to classic-boring when reduced.
    expect(wrapper.getAttribute('data-aesthetic-variant')).toBe('classic-boring')
    expect(wrapper.style.getPropertyValue('--theme-game-charts-axis-font')).toBe('')
    expect(wrapper.style.getPropertyValue('--theme-charts-axis-fg')).toBe('')
    expect(screen.getByTestId('probe').textContent).toBe('static')
  })
})
