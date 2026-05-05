import { ClassicCalendar } from '@/components/dashboard/ClassicCalendar'
import { RetroWorldMap } from '@/components/dashboard/RetroWorldMap'
import { useEffectiveAestheticVariant } from '@/hooks/useEffectiveAestheticVariant'
import type { DashboardMapModel } from '@/services/dashboard/buildDashboardMap'

export type DashboardMapProps = {
  model: DashboardMapModel
  onSelectSession: (sessionId: string) => void
}

/**
 * Step 16 Phase B — Variant router for the dashboard map.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase B Shared Contracts (Dashboard)".
 *
 * The router is intentionally trivial: it picks a renderer based on the
 * effective aesthetic variant resolved by `useEffectiveAestheticVariant`
 * (which honors the OS `prefers-reduced-motion` override without ever writing
 * to the persisted store) and forwards the same shared `model` to it. New
 * variants only need to be added here.
 */
export const DashboardMap = ({ model, onSelectSession }: DashboardMapProps) => {
  const variant = useEffectiveAestheticVariant()
  if (variant === 'retro-platformer') {
    return <RetroWorldMap model={model} onSelectSession={onSelectSession} />
  }
  // Default + `classic-boring` (also the reduced-motion forced variant).
  return <ClassicCalendar model={model} onSelectSession={onSelectSession} />
}
