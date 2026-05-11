import { useTranslation } from 'react-i18next'

import {
  FAMILY_ORDER,
  type TotemEntry,
  type TotemFamily,
  type TotemState,
} from '@/services/stats/buildTotemInventoryModel'

/**
 * Step 16 Phase D — Shared helpers for totem-inventory renderers.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase D Shared Contracts → Shared Accessibility Contract".
 *
 * Same pattern as `dashboardMapShared` (Phase B) / `sessionExecutionShared`
 * (Phase C): both variant renderers import these so the aria contract,
 * state-label and family-label resolution stay in exactly one place.
 *
 * `FAMILY_ORDER` is owned by the service layer (`buildTotemInventoryModel`)
 * because both pure model code (e.g. `buildSessionCompletionTotemPayload`)
 * and renderers depend on it; we re-export it here so existing component
 * imports keep working.
 */

export { FAMILY_ORDER }

/** Maps a totem family to its motif color CSS variable. Shared across both renderers. */
export const FAMILY_VAR: Record<TotemFamily, string> = {
  consistency: 'var(--theme-stats-family-consistency)',
  recovery: 'var(--theme-stats-family-recovery)',
  preparation: 'var(--theme-stats-family-preparation)',
  reflection: 'var(--theme-stats-family-reflection)',
}

export function useFamilyLabel(): (family: TotemFamily) => string {
  const { t } = useTranslation('stats')
  return (family) => t(`totem.family.${family}`)
}

export function useStateLabel(): (state: TotemState) => string {
  const { t } = useTranslation('stats')
  return (state) => t(`totem.state.${state}`)
}

export function useTotemAriaLabel(): (totem: TotemEntry) => string {
  const { t } = useTranslation('stats')
  const familyLabel = useFamilyLabel()
  const stateLabel = useStateLabel()
  return (totem) =>
    t('totem.aria', {
      name: t(totem.nameI18nKey),
      family: familyLabel(totem.family),
      state: stateLabel(totem.state),
    })
}

/** Returns the `Earned {{date}}` formatted string, with an empty string when not earned. */
export function useEarnedOnLabel(): (dateISO: string | null) => string {
  const { t, i18n } = useTranslation('stats')
  return (dateISO) => {
    if (!dateISO) return ''
    let formatted: string
    try {
      formatted = new Intl.DateTimeFormat(i18n.language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(`${dateISO}T00:00:00Z`))
    } catch {
      formatted = dateISO
    }
    return t('totem.earned_on', { date: formatted })
  }
}

/** Groups totems into the canonical family order. */
export function groupByFamily(totems: ReadonlyArray<TotemEntry>): Array<{
  family: TotemFamily
  totems: TotemEntry[]
}> {
  return FAMILY_ORDER.map((family) => ({
    family,
    totems: totems.filter((t) => t.family === family),
  }))
}

/** True when no totem in the model has been earned. */
export function isEmptyInventory(totems: ReadonlyArray<TotemEntry>): boolean {
  return totems.every((t) => t.state === 'available')
}
