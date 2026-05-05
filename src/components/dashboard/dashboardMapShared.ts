import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  DashboardMapModel,
  SessionNode,
  WeekRow,
} from '@/services/dashboard/buildDashboardMap'

/**
 * Returns the per-week sub-palette CSS variables for inline `style` injection.
 * The Phase B contract is deterministic: `weekIndex % 6`. Both the saturated
 * (`-300`) and muted (`-100`) shades are exposed so each renderer can pick the
 * one that fits its surface treatment without re-deriving the palette.
 */
export function weekAccentStyle(weekIndex: number): CSSProperties {
  const slot = (weekIndex % 6) + 1
  return {
    // Saturated (retro-platformer) and muted (classic-boring) live side by side
    // so a single render tree can host both renderers in tests.
    ['--theme-dashboard-week-accent' as string]: `var(--theme-dashboard-week-accent-${slot})`,
    ['--theme-dashboard-week-accent-muted' as string]: `var(--theme-dashboard-week-accent-muted-${slot})`,
  } as CSSProperties
}

/**
 * Resolves the i18n-localized human label for a session state. Uses the
 * Phase B canonical key namespace (`dashboard.state.<state>`).
 */
export function useStateLabel(): (state: SessionNode['state']) => string {
  const { t } = useTranslation('common')
  return (state) => {
    const key = state === 'in-progress' ? 'dashboard.state.in_progress' : `dashboard.state.${state}`
    return t(key)
  }
}

/**
 * Builds the WCAG `aria-label` for a session surface. Identical contract for
 * both renderers — see `dashboard.session_aria` in `common.json`.
 */
export function useSessionAriaLabel(): (
  week: number,
  sessionIndex: number,
  state: SessionNode['state']
) => string {
  const { t } = useTranslation('common')
  const stateLabel = useStateLabel()
  return (week, session, state) =>
    t('dashboard.session_aria', { week, session, state: stateLabel(state) })
}

/**
 * Shared "no plan" guard used by both renderers — returns true when the model
 * has zero weeks (caller is responsible for showing the empty state).
 */
export function isEmptyModel(model: DashboardMapModel): boolean {
  return model.weeks.length === 0
}

export function totalSessionsInWeek(week: WeekRow): number {
  return week.sessions.length
}
