import { resolveEffectiveAestheticVariant } from '@/hooks/useEffectiveAestheticVariant'
import { useUserStore } from '@/stores/userStore'

/**
 * Step 16 Phase D — Stats audio service (D9).
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase D Shared Contracts (Stats / Inventory)" → "Audio Gating Contract".
 *
 * Mirrors the {@link import('./sessionAudio').playRestEndChime} pattern
 * exactly: the public entrypoint short-circuits immediately when:
 *   • the effective aesthetic variant is NOT `retro-platformer`, OR
 *   • the user opt-in `sfx` flag is false (TODO below; currently no such
 *     flag exists in `userStore`, so we gate solely on the variant — no
 *     new persistence is added in this phase).
 *
 * `classic-boring` is therefore guaranteed silent on the totem inventory
 * surface: no `<audio>` element ever mounts and no `AudioContext` is
 * created. The chime is single-fire per inspect-open (the renderer must
 * call `resetTotemInspect()` when the inspect panel collapses so the
 * next open re-arms the chime).
 */

let chimeCache: { audioCtx: AudioContext } | null = null
let chimeFiredForCurrentInspect = false

function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const persisted = useUserStore.getState().aestheticVariant
  // Variant override is enforced by the render layer; the audio service
  // only cares about the user's persisted choice.
  const effective = resolveEffectiveAestheticVariant(persisted, false)
  if (effective !== 'retro-platformer') return false
  // TODO: wire user opt-in flag (`userStore.audioOptIn`) once the Settings
  // UI exposes it (Phase E). Until then, opting into the variant gates
  // the audio surface.
  return true
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  return new Ctor()
}

/**
 * Plays a short, calm pickup chime when a totem inspect panel opens. Single-
 * fire per inspect-open: subsequent calls within the same open session are
 * no-ops. Callers MUST invoke {@link resetTotemInspect} when the inspect
 * panel collapses so a fresh open re-arms the chime.
 *
 * No-op outside `retro-platformer`. No-op when the cached AudioContext is
 * unavailable (some browsers suspend it before user gesture).
 */
export function playTotemInspect(): void {
  if (!isAudioEnabled()) return
  if (chimeFiredForCurrentInspect) return
  if (!chimeCache) {
    const audioCtx = ensureContext()
    if (!audioCtx) return
    chimeCache = { audioCtx }
  }
  const { audioCtx } = chimeCache
  try {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 660
    gain.gain.value = 0.04
    osc.connect(gain).connect(audioCtx.destination)
    const t0 = audioCtx.currentTime
    osc.start(t0)
    osc.stop(t0 + 0.12)
    chimeFiredForCurrentInspect = true
  } catch {
    // Browser may have suspended the context; we never escalate to the user.
  }
}

/**
 * Re-arm the single-fire latch so the next {@link playTotemInspect} call can
 * emit a chime. Renderers call this when the inspect panel collapses. The
 * cached `AudioContext` is intentionally preserved so we don't churn audio
 * resources between inspect-opens within the same Stats session.
 */
export function resetTotemInspect(): void {
  chimeFiredForCurrentInspect = false
}

/**
 * Test-only: fully resets module-level state (latch + cached AudioContext).
 * Not exported from any barrel; consumed only by `statsAudio.test.ts` so
 * each test starts from a clean slate without leaking the cached context
 * from a prior test's mocked `window.AudioContext`. Production code must
 * call {@link resetTotemInspect} instead.
 */
export function __resetStatsAudioForTests(): void {
  chimeFiredForCurrentInspect = false
  chimeCache = null
}
