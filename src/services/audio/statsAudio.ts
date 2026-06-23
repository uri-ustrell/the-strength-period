import { useUserStore } from '@/stores/userStore'

/**
 * Stats audio service.
 *
 * Mirrors the {@link import('./sessionAudio').playRestEndChime} pattern: the
 * public entrypoint short-circuits immediately when the user opt-in flag
 * (`userStore.audioOptIn`) is false, so no `<audio>` element mounts and no
 * `AudioContext` is created. The chime is single-fire per inspect-open (the
 * renderer must call `resetTotemInspect()` when the inspect panel collapses so
 * the next open re-arms the chime).
 */

let chimeCache: { audioCtx: AudioContext } | null = null
let chimeFiredForCurrentInspect = false

function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return false
  // Single, explicit user opt-in (default `false`).
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
  // iOS Safari (and some desktop browsers) suspend a fresh AudioContext
  // until a user gesture; resume() is a no-op when already running and
  // never throws synchronously.
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
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

/**
 * Releases the cached `AudioContext` used by the stats audio surface.
 * Pages that mount the stats UI (currently `Stats.tsx`) MUST invoke this
 * on unmount so we don't leak audio resources between visits.
 */
export function closeStatsAudio(): void {
  const cache = chimeCache
  chimeCache = null
  chimeFiredForCurrentInspect = false
  if (!cache) return
  try {
    cache.audioCtx.close().catch(() => {})
  } catch {
    // close() throws synchronously on already-closed contexts in some
    // browsers; nothing actionable here.
  }
}
