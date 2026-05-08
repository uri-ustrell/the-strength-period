import type { TotemEntry, TotemInventoryModel } from '@/services/stats/buildTotemInventoryModel'
import { TOTEM_CATALOG_V2 } from '@/services/stats/buildTotemInventoryModel'

/**
 * Step 16 Phase D — Test fixture for the totem inventory renderers.
 * Used by D10 render parity tests across both variants. Tracks the live
 * catalog (V2) so newly-added totems are exercised automatically.
 */
export function makeTotemFixture(
  earnedIds: ReadonlyArray<string> = ['first-session', 'first-deload-honored']
): TotemInventoryModel {
  const totems: TotemEntry[] = TOTEM_CATALOG_V2.map((entry, idx) => {
    const isEarned = earnedIds.includes(entry.id)
    return {
      id: entry.id,
      family: entry.family,
      state: isEarned ? 'earned' : 'available',
      earnedDateISO: isEarned ? `2026-04-${String(idx + 1).padStart(2, '0')}` : null,
      nameI18nKey: entry.nameI18nKey,
      ruleI18nKey: entry.ruleI18nKey,
    }
  })
  return { totems }
}
