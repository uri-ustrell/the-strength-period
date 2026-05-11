import { ClassicSessionCards } from '@/components/session/ClassicSessionCards'
import { RetroLevelRun } from '@/components/session/RetroLevelRun'
import { useEffectiveAestheticVariant } from '@/hooks/useEffectiveAestheticVariant'
import type { SessionExecutionModel } from '@/services/session/buildSessionExecutionModel'

export type SessionExecutionActions = {
  logSet: (repsActual: number, weightActual?: number, isWarmup?: boolean) => void
  skipSet: () => void
  skipRest: () => void
  updateCurrentExerciseWeight: (newWeight: number) => void
}

export type SessionExecutionProps = {
  model: SessionExecutionModel
  actions: SessionExecutionActions
}

/**
 * Step 16 Phase C — Variant router for the session execution surface.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase C Shared Contracts (Session Execution)".
 *
 * Mirrors the {@link DashboardMap} router from Phase B exactly: picks a
 * renderer based on the effective aesthetic variant resolved by
 * `useEffectiveAestheticVariant` (which honors the OS `prefers-reduced-motion`
 * override without ever writing to the persisted store) and forwards the
 * same shared `model` + `actions` to it. New variants only need to be
 * added here.
 */
export const SessionExecution = ({ model, actions }: SessionExecutionProps) => {
  const variant = useEffectiveAestheticVariant()
  if (variant === 'retro-platformer') {
    return <RetroLevelRun model={model} actions={actions} />
  }
  // Default + `classic-boring` (also the reduced-motion forced variant).
  return <ClassicSessionCards model={model} actions={actions} />
}
