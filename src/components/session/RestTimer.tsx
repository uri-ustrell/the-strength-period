import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  secondsRemaining: number
  onTick: () => void
  onSkip: () => void
}

export const RestTimer = ({ secondsRemaining, onTick, onSkip }: Props) => {
  const { t } = useTranslation('common')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      onTick()
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [onTick])

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center rounded-2xl bg-indigo-50 p-8 shadow-sm">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-600">
        {t('session.rest')}
      </p>
      <p className="mb-6 font-mono text-6xl font-bold text-indigo-900">{display}</p>
      <button
        type="button"
        onClick={onSkip}
        className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-indigo-600 shadow-sm active:bg-gray-50"
      >
        {t('session.skip_rest')}
      </button>
    </div>
  )
}
