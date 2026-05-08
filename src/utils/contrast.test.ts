import { describe, expect, it } from 'vitest'

/**
 * Step 16 Phase E sub-phase E3 — WCAG 2.1 AA contrast audit for the
 * shared chart token palettes (classic + retro) consumed by
 * `<ChartThemeProvider>`.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase E Shared Contracts (Polish + Deferred Totems) → E3 — Chart
 * Variant Theming Contract": "AA contrast audited for retro chart text
 * on chart background (axis fg vs grid bg ≥ 4.5:1)".
 *
 * Card background is `bg-white` (#ffffff) on each <section> in
 * `Stats.tsx` (architect-verified). Retro tooltip body is `#fef3c7`
 * (amber-100) per the `<ChartThemeProvider>` retro overrides.
 *
 * Helper is intentionally inlined here — it is not used by production
 * code, so we avoid creating a new export surface.
 */

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '')
  return [
    Number.parseInt(v.slice(0, 2), 16),
    Number.parseInt(v.slice(2, 4), 16),
    Number.parseInt(v.slice(4, 6), 16),
  ]
}

function relativeLuminance(hex: string): number {
  // WCAG 2.1 relative luminance formula.
  const channels = hexToRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

describe('chart palette WCAG 2.1 AA contrast', () => {
  describe('classic (white card bg)', () => {
    const bg = '#ffffff'

    it('axis-fg #64748b vs #ffffff ≥ 4.5:1', () => {
      expect(contrastRatio('#64748b', bg)).toBeGreaterThanOrEqual(4.5)
    })

    it('legend-fg #64748b vs #ffffff ≥ 4.5:1', () => {
      expect(contrastRatio('#64748b', bg)).toBeGreaterThanOrEqual(4.5)
    })

    it('tooltip-fg #0f172a vs #ffffff ≥ 4.5:1', () => {
      expect(contrastRatio('#0f172a', bg)).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe('retro (white card bg + amber tooltip bg)', () => {
    const cardBg = '#ffffff'
    const tooltipBg = '#fef3c7'

    it('axis-fg #1f2937 vs #ffffff ≥ 4.5:1', () => {
      expect(contrastRatio('#1f2937', cardBg)).toBeGreaterThanOrEqual(4.5)
    })

    it('legend-fg #1f2937 vs #ffffff ≥ 4.5:1', () => {
      expect(contrastRatio('#1f2937', cardBg)).toBeGreaterThanOrEqual(4.5)
    })

    it('tooltip-fg #0f172a vs tooltip-bg #fef3c7 ≥ 4.5:1', () => {
      expect(contrastRatio('#0f172a', tooltipBg)).toBeGreaterThanOrEqual(4.5)
    })
  })
})
