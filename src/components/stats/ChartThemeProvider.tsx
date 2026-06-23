import { type CSSProperties, createContext, type ReactNode, useContext } from 'react'

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Chart theming wrapper.
 *
 * Tokens live in `:root` (`--theme-charts-*` are
 * bridged to the new `--color-chart-*` palette in `src/index.css`), so this
 * wrapper just exposes the `isAnimationActive` flag via context and forces
 * `width: 100%` on its children.
 */

type ChartThemeContextValue = { isAnimationActive: boolean }

export const ChartThemeContext = createContext<ChartThemeContextValue>({
  isAnimationActive: true,
})

export function useChartTheme(): ChartThemeContextValue {
  return useContext(ChartThemeContext)
}

interface Props {
  children: ReactNode
}

export function ChartThemeProvider({ children }: Props) {
  const reduced = usePrefersReducedMotion()
  const style: CSSProperties = { width: '100%' }

  return (
    <div style={style} data-chart-theme="dark">
      <ChartThemeContext.Provider value={{ isAnimationActive: !reduced }}>
        {children}
      </ChartThemeContext.Provider>
    </div>
  )
}
