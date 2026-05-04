import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Subscribes to the OS `prefers-reduced-motion` media query and returns its
 * live boolean value. SSR-safe: returns `false` when `window` is undefined.
 *
 * The hook is read-only — it never persists anything. Callers that need to
 * derive a runtime override (e.g. forcing the `classic-boring` aesthetic
 * variant) must do so without mutating any persisted store. See
 * {@link useEffectiveAestheticVariant}.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(QUERY)
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches)
    // Sync once in case the value changed between mount and effect.
    setReduced(mql.matches)
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    }
    // Safari < 14 fallback.
    mql.addListener(handler)
    return () => mql.removeListener(handler)
  }, [])

  return reduced
}
