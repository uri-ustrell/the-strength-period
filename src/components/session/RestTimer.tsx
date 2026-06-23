import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '@/stores/sessionStore'

interface Props {
  onSkip: () => void
}

export const RestTimer = ({ onSkip }: Props) => {
  const { t } = useTranslation('common')
  // Subscribe directly to the timer slice so only this component re-renders on
  // every tick, not the whole `Session` page tree.
  const secondsRemaining = useSessionStore((s) => s.restSecondsRemaining)
  const tickRest = useSessionStore((s) => s.tickRest)
  const onTickRef = useRef(tickRest)
  onTickRef.current = tickRest
  // Holds the last worded "time remaining" phrase announced to screen readers.
  const announceRef = useRef('')
  // Note: the rest-end chime is fired by the store inside `tickRest` itself
  // — see `sessionStore.tickRest` for the rationale (this component would
  // otherwise unmount on the same tick that hits zero, so a render-driven
  // chime would never fire).

  useEffect(() => {
    // Tick immediately so the displayed value catches up after mount or
    // after the tab returns from background (where setInterval is throttled).
    onTickRef.current()
    const interval = setInterval(() => onTickRef.current(), 1000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        onTickRef.current()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Screen-reader announcement. A per-second polite region would spam the SR
  // queue, so the worded text is only refreshed at milestones (every 15s) and
  // for each of the final 10s (assertive, so it interrupts and counts down).
  // `announceRef` holds the last announced phrase; unchanged content between
  // milestones produces no new announcement.
  const isUrgent = secondsRemaining > 0 && secondsRemaining <= 10
  if (secondsRemaining > 0 && (isUrgent || secondsRemaining % 15 === 0)) {
    announceRef.current =
      minutes > 0
        ? t('session.rest_remaining_min', { minutes, seconds })
        : t('session.rest_remaining_sec', { seconds })
  }

  return (
    <div className="flex flex-col items-center rounded-2xl bg-accent/10 p-8 shadow-sm">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
        {t('session.rest')}
      </p>
      <p className="mb-6 font-mono text-6xl font-bold text-accent" aria-hidden="true">
        {display}
      </p>
      <span
        className="sr-only"
        role="timer"
        aria-label={t('session.rest_timer_label')}
        aria-live={isUrgent ? 'assertive' : 'polite'}
      >
        {announceRef.current}
      </span>
      <button
        type="button"
        onClick={onSkip}
        className="rounded-xl bg-surface px-8 py-3 text-sm font-semibold text-accent shadow-sm active:bg-bg"
      >
        {t('session.skip_rest')}
      </button>
    </div>
  )
}
