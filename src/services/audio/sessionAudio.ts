import { useUserStore } from '@/stores/userStore'
import { resolveEffectiveAestheticVariant } from '@/hooks/useEffectiveAestheticVariant'

/**
 * Step 16 Phase C — Session audio service (C9).
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase C Shared Contracts (Session Execution)" → "Audio Gating Contract"
 * and "Variant: Classic Boring → Sound" (audio is disabled in classic).
 *
 * Both public entrypoints short-circuit immediately when:
 *   • the effective aesthetic variant is NOT `retro-platformer`, OR
 *   • the user opt-in flag is false (TODO below; currently no such flag
 *     exists in `userStore`, so we gate solely on the variant — no new
 *     persistence is added in this phase).
 *
 * `classic-boring` is therefore guaranteed silent: no `<audio>` element ever
 * mounts and no `AudioContext` is created.
 *
 * The variant is read via {@link resolveEffectiveAestheticVariant} against
 * the snapshot of `useUserStore` so audio entrypoints are usable from
 * non-React contexts (timers, callbacks). `prefers-reduced-motion` is
 * intentionally NOT consulted here — Settings already routes the user to
 * `classic-boring` via the runtime override, which short-circuits us.
 */

let restEndCache: { audioCtx: AudioContext } | null = null
let setCompleteCache: { audioCtx: AudioContext } | null = null

function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const persisted = useUserStore.getState().aestheticVariant
  // Note: we deliberately pass `false` for `prefersReducedMotion` here. The
  // variant override is enforced by the render layer; the audio service only
  // cares about the user's persisted choice — if they explicitly picked
  // retro-platformer, they opted into the audio surface.
  const effective = resolveEffectiveAestheticVariant(persisted, false)
  if (effective !== 'retro-platformer') return false
  // TODO: wire user opt-in flag (e.g. `userStore.audioOptIn`) once the
  // Settings UI exposes it (Phase E). Until then, opting into the variant
  // gates the audio surface.
  return true
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  return new Ctor()
}

/**
 * Plays a short 880Hz blip at session-rest end (t=0). No-op outside
 * `retro-platformer`. Idempotent per rest cycle: callers should invoke this
 * exactly once when the timer hits zero.
 */
export function playRestEndChime(): void {
  if (!isAudioEnabled()) return
  if (!restEndCache) {
    const audioCtx = ensureContext()
    if (!audioCtx) return
    restEndCache = { audioCtx }
  }
  const { audioCtx } = restEndCache
  try {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'square'
    osc.frequency.value = 880
    gain.gain.value = 0.05
    osc.connect(gain).connect(audioCtx.destination)
    const t0 = audioCtx.currentTime
    osc.start(t0)
    osc.stop(t0 + 0.18)
  } catch {
    // Browser may have suspended the context; we never escalate to the user.
  }
}

/**
 * Plays a short low blip when a set is logged in `retro-platformer`. No-op
 * outside that variant.
 */
export function playSetCompleteBlip(): void {
  if (!isAudioEnabled()) return
  if (!setCompleteCache) {
    const audioCtx = ensureContext()
    if (!audioCtx) return
    setCompleteCache = { audioCtx }
  }
  const { audioCtx } = setCompleteCache
  try {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'square'
    osc.frequency.value = 440
    gain.gain.value = 0.04
    osc.connect(gain).connect(audioCtx.destination)
    const t0 = audioCtx.currentTime
    osc.start(t0)
    osc.stop(t0 + 0.08)
  } catch {
    // see above
  }
}
