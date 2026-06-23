import { useUserStore } from '@/stores/userStore'

/**
 * Session audio service.
 *
 * Both public entrypoints short-circuit immediately when the user opt-in flag
 * (`userStore.audioOptIn`) is false — the default — so no `<audio>` element
 * mounts and no `AudioContext` is created unless the user explicitly enables
 * sound. The flag is read from the `useUserStore` snapshot so entrypoints are
 * usable from non-React contexts (timers, callbacks).
 */

let restEndCache: { audioCtx: AudioContext } | null = null
let setCompleteCache: { audioCtx: AudioContext } | null = null

function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return false
  // Single, explicit user opt-in. Default is `false` so the app is silent
  // unless the user enables it from Settings.
  return useUserStore.getState().audioOptIn === true
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
  // iOS Safari (and some desktop browsers) suspend a fresh AudioContext
  // until a user gesture; resume() is a no-op when already running and
  // never throws synchronously, so we ignore the returned promise.
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
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
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
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

/**
 * Releases the cached `AudioContext`s used by the session audio surface.
 * Pages that mount the session UI (currently `Session.tsx`) MUST invoke
 * this on unmount so we don't leak audio resources between visits — the
 * caches are module-scoped and survive component teardown otherwise.
 */
export function closeSessionAudio(): void {
  const caches = [restEndCache, setCompleteCache]
  restEndCache = null
  setCompleteCache = null
  for (const cache of caches) {
    if (!cache) continue
    try {
      cache.audioCtx.close().catch(() => {})
    } catch {
      // close() throws synchronously on already-closed contexts in some
      // browsers; nothing actionable here.
    }
  }
}

/**
 * Test-only: fully resets module-level cached AudioContexts. Production
 * code should call {@link closeSessionAudio} instead.
 */
export function __resetSessionAudioForTests(): void {
  restEndCache = null
  setCompleteCache = null
}
