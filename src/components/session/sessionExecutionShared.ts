import { useTranslation } from 'react-i18next'

import type { SetExecutionState } from '@/services/session/buildSessionExecutionModel'

/**
 * Step 16 Phase C — Shared helpers for session-execution renderers.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase C Shared Contracts → Shared Accessibility Contract".
 *
 * Same pattern as `dashboardMapShared` from Phase B: both variant renderers
 * import these so the aria contract and state label resolution stay in
 * exactly one place.
 */

export function useSetStateLabel(): (state: SetExecutionState) => string {
  const { t } = useTranslation('common')
  return (state) => t(`session.set.state.${state}`)
}

export function useSetAriaLabel(): (
  exercise: number,
  set: number,
  total: number,
  state: SetExecutionState
) => string {
  const { t } = useTranslation('common')
  const stateLabel = useSetStateLabel()
  return (exercise, set, total, state) =>
    t('session.set.aria', { exercise, set, total, state: stateLabel(state) })
}

export const SET_STATE_VAR: Record<SetExecutionState, string> = {
  pending: 'var(--theme-session-set-pending)',
  active: 'var(--theme-session-set-active)',
  completed: 'var(--theme-session-set-completed)',
  skipped: 'var(--theme-session-set-skipped)',
}
