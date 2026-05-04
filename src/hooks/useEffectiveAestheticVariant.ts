import { useUserStore } from '@/stores/userStore'
import type { AestheticVariant } from '@/types/user'
import { DEFAULT_AESTHETIC_VARIANT } from '@/types/user'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Pure resolver for the effective aesthetic variant.
 *
 * Spec (`specs/features/16-ethical-gamification.md` →
 * "`prefers-reduced-motion` Behavior"): when the OS reports reduced motion,
 * the app **forces** `classic-boring` regardless of the persisted preference.
 * The persisted value MUST NOT be overwritten — it is restored automatically
 * when reduced motion is no longer reported.
 *
 * Exported so unit tests can verify the runtime-only override semantics
 * without rendering React.
 */
export function resolveEffectiveAestheticVariant(
  persisted: AestheticVariant | undefined,
  prefersReducedMotion: boolean,
): AestheticVariant {
  if (prefersReducedMotion) return 'classic-boring'
  return persisted ?? DEFAULT_AESTHETIC_VARIANT
}

/**
 * Returns the aesthetic variant currently in effect, taking into account the
 * runtime `prefers-reduced-motion` override. This hook is read-only: it never
 * writes to the store, so toggling the OS preference does not corrupt the
 * user's persisted selection.
 */
export function useEffectiveAestheticVariant(): AestheticVariant {
  const persisted = useUserStore((s) => s.aestheticVariant)
  const reducedMotion = usePrefersReducedMotion()
  return resolveEffectiveAestheticVariant(persisted, reducedMotion)
}
