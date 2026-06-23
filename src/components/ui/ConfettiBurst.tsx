import { useEffect, useRef } from 'react'

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export interface ConfettiBurstProps {
  /** Toggle that triggers the burst when it transitions from false → true. */
  trigger: boolean
}

/**
 * Single-fire confetti burst.
 *
 * Wraps `canvas-confetti`. Honors `prefers-reduced-motion: reduce`: when the
 * user has reduced motion enabled, the component is a strict no-op (no DOM,
 * no library import, no audible side effect).
 *
 * The burst fires exactly once per `trigger` rising edge — re-renders with
 * the same `trigger=true` do not re-fire.
 */
export const ConfettiBurst = ({ trigger }: ConfettiBurstProps) => {
  const reduced = usePrefersReducedMotion()
  const lastFiredRef = useRef(false)

  useEffect(() => {
    if (reduced) return
    if (!trigger) {
      lastFiredRef.current = false
      return
    }
    if (lastFiredRef.current) return
    lastFiredRef.current = true

    let cancelled = false
    void import('canvas-confetti').then((mod) => {
      if (cancelled) return
      const fire = mod.default
      fire({
        particleCount: 80,
        spread: 70,
        startVelocity: 35,
        gravity: 0.9,
        origin: { x: 0.5, y: 0.7 },
        colors: ['#ff6b4a', '#f9a826', '#2dd4bf', '#a78bfa'],
      })
    })
    return () => {
      cancelled = true
    }
  }, [trigger, reduced])

  return null
}
