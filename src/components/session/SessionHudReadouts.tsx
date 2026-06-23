import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { SessionExecutionModel } from '@/services/session/buildSessionExecutionModel'

/**
 * Shared session HUD.
 *
 * Renders the four canonical readouts (`elapsed`, `volume`, `sets`, `mean
 * RPE`) with a per-readout `aria-live="polite"` region. Numbers update in
 * stepped (whole-second) increments — there is no smooth tween. When the OS
 * reports `prefers-reduced-motion`, the elapsed counter still ticks (count-up
 * is informational, not motion) but no transition is applied. Variant
 * renderers wrap us in their own chrome so this component stays neutral.
 */

type Props = {
  model: SessionExecutionModel
  /** Visual variant tag — drives surface chrome only, never numeric semantics. */
  variant: 'retro' | 'classic'
}

function formatElapsed(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Internal hook: drives the elapsed-time display. The model's `hud.elapsedSec`
 * is a snapshot at `nowMs`; for a live readout we re-render every 1s and
 * recompute against `sessionStartedAtMs`. Reduced motion does not disable the
 * tick — the counter is information, not animation.
 */
function useLiveElapsedSec(model: SessionExecutionModel): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (model.sessionStartedAtMs === null || model.isFinished) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [model.sessionStartedAtMs, model.isFinished])
  if (model.sessionStartedAtMs === null) return model.hud.elapsedSec
  return Math.max(0, Math.floor((now - model.sessionStartedAtMs) / 1000))
}

export const SessionHudReadouts = ({ model, variant }: Props) => {
  const { t } = useTranslation('common')
  // Read reduced-motion (purely informational here — the only "motion" in
  // the HUD is the integer step animation). Kept as an explicit reference
  // so future visual treatments can branch on it.
  usePrefersReducedMotion()
  const elapsedSec = useLiveElapsedSec(model)

  const wrapper =
    variant === 'retro'
      ? 'grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-md border-2 border-border-strong p-2'
      : 'grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-lg border border-border-subtle p-2 bg-surface'

  const valueClass =
    variant === 'retro'
      ? 'font-mono text-lg font-bold tabular-nums'
      : 'font-mono text-lg font-semibold tabular-nums'

  const meanRpeDisplay = model.hud.meanRpe === null ? '—' : Math.round(model.hud.meanRpe * 10) / 10

  return (
    <div
      className={wrapper}
      data-testid={`session-hud-${variant}`}
      style={{
        backgroundColor: variant === 'retro' ? 'var(--theme-session-hud-accent)' : undefined,
        color: 'var(--theme-session-hud-fg)',
      }}
    >
      <div className="text-center">
        <p
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--theme-session-hud-muted)' }}
        >
          {t('session.hud.label.elapsed')}
        </p>
        <p
          aria-live="polite"
          className={valueClass}
          data-testid="hud-elapsed"
          style={{ color: 'var(--theme-session-hud-fg)' }}
        >
          {formatElapsed(elapsedSec)}
        </p>
      </div>
      <div className="text-center">
        <p
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--theme-session-hud-muted)' }}
        >
          {t('session.hud.label.volume')}
        </p>
        <p
          aria-live="polite"
          className={valueClass}
          data-testid="hud-volume"
          style={{ color: 'var(--theme-session-hud-fg)' }}
        >
          {Math.round(model.hud.volumeKg)}
        </p>
      </div>
      <div className="text-center">
        <p
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--theme-session-hud-muted)' }}
        >
          {t('session.hud.label.sets')}
        </p>
        <p
          aria-live="polite"
          className={valueClass}
          data-testid="hud-sets"
          style={{ color: 'var(--theme-session-hud-fg)' }}
        >
          {model.hud.setsCompleted}/{model.hud.setsTotal}
        </p>
      </div>
      <div className="text-center">
        <p
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--theme-session-hud-muted)' }}
        >
          {t('session.hud.label.rpe')}
        </p>
        <p
          aria-live="polite"
          className={valueClass}
          data-testid="hud-rpe"
          style={{ color: 'var(--theme-session-hud-fg)' }}
        >
          {meanRpeDisplay}
        </p>
      </div>
    </div>
  )
}
