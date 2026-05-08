import { type CSSProperties, createContext, type ReactNode, useContext } from 'react'

import { useEffectiveAestheticVariant } from '@/hooks/useEffectiveAestheticVariant'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Step 16 Phase E sub-phase E3 — chart variant theming wrapper for the
 * analytics surface (`VolumeChart`, `ProgressionChart`, `AdherenceChart`).
 *
 * Spec: `specs/features/16-ethical-gamification.md` → "Phase E Shared
 * Contracts (Polish + Deferred Totems) → E3 — Chart Variant Theming
 * Contract". This wrapper lifts the Phase D analytics scope-lock per
 * Phase E3.
 *
 * Approach: wrapper, not fork. The three chart components stay as-is and
 * read CSS variables. `<ChartThemeProvider>` resolves the active variant
 * via `useEffectiveAestheticVariant()` (which already collapses to
 * `classic-boring` under `prefers-reduced-motion: reduce`) and either:
 *   - retro-platformer → overrides shared `--theme-charts-*` tokens with
 *     the AA-audited retro palette and additionally exposes retro-only
 *     `--theme-game-charts-*` tokens (pixel mono font for axis ticks +
 *     legend labels);
 *   - classic-boring → renders a transparent wrapper and lets charts
 *     inherit the global `:root` defaults declared in `src/index.css`.
 *
 * Strict guardrails (enforced by tests):
 *   - Tooltip body and data labels MUST inherit the system font in BOTH
 *     variants — the pixel mono font is limited to axis ticks and legend
 *     labels (readability guardrail).
 *   - `MUSCLE_COLORS` in `VolumeChart.tsx` stays variant-agnostic (data
 *     identity). Only the 2-series Progression and 2-series Adherence
 *     charts consume `--theme-charts-series-*` tokens.
 *   - When `prefers-reduced-motion: reduce` is reported, chart entrance
 *     animations collapse to instant via `isAnimationActive: false` from
 *     `useChartTheme()`.
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
  const variant = useEffectiveAestheticVariant()
  const reduced = usePrefersReducedMotion()
  const isRetro = variant === 'retro-platformer'

  // Retro overrides shared tokens AND adds retro-only tokens.
  // Classic relies on global :root declarations in src/index.css.
  // VolumeChart.MUSCLE_COLORS intentionally stays as data-identity colors
  // in both variants.
  const style: CSSProperties = isRetro
    ? ({
        width: '100%',
        ['--theme-charts-axis-fg' as string]: '#1f2937',
        ['--theme-charts-grid' as string]: '#cbd5e1',
        ['--theme-charts-tooltip-bg' as string]: '#fef3c7',
        ['--theme-charts-tooltip-fg' as string]: '#0f172a',
        ['--theme-charts-legend-fg' as string]: '#1f2937',
        ['--theme-charts-series-1' as string]: '#1d4ed8',
        ['--theme-charts-series-2' as string]: '#15803d',
        ['--theme-charts-series-3' as string]: '#a16207',
        ['--theme-game-charts-axis-font' as string]:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        ['--theme-game-charts-axis-letter-spacing' as string]: '0.05em',
        ['--theme-game-charts-tick-stroke' as string]: '#1f2937',
      } as CSSProperties)
    : { width: '100%' }

  return (
    <div style={style} data-aesthetic-variant={variant}>
      <ChartThemeContext.Provider value={{ isAnimationActive: !reduced }}>
        {children}
      </ChartThemeContext.Provider>
    </div>
  )
}
