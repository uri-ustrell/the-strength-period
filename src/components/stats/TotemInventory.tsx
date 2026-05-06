import { ClassicTotemGrid } from '@/components/stats/ClassicTotemGrid'
import { RetroInventoryShelf } from '@/components/stats/RetroInventoryShelf'
import { useEffectiveAestheticVariant } from '@/hooks/useEffectiveAestheticVariant'
import type { TotemInventoryModel } from '@/services/stats/buildTotemInventoryModel'

export type TotemInventoryProps = {
  model: TotemInventoryModel
}

/**
 * Step 16 Phase D — Variant router for the totem inventory surface (D7).
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase D Shared Contracts (Stats / Inventory)".
 *
 * Mirrors {@link import('@/components/dashboard/DashboardMap').DashboardMap}
 * (Phase B) and {@link import('@/components/session/SessionExecution').SessionExecution}
 * (Phase C) exactly: picks a renderer based on the effective aesthetic variant
 * resolved by `useEffectiveAestheticVariant` (which honors the OS
 * `prefers-reduced-motion` override without ever writing to the persisted
 * store) and forwards the same shared `model` to it. New variants only need
 * to be added here.
 */
export const TotemInventory = ({ model }: TotemInventoryProps) => {
  const variant = useEffectiveAestheticVariant()
  if (variant === 'retro-platformer') {
    return <RetroInventoryShelf model={model} />
  }
  // Default + `classic-boring` (also the reduced-motion forced variant).
  return <ClassicTotemGrid model={model} />
}
