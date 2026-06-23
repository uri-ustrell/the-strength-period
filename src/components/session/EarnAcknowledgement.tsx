import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { SessionCompletionTotemPayload } from '@/services/session/buildSessionCompletionTotemPayload'

/**
 * Inline earn-acknowledgement frame.
 *
 * NEVER a modal: no `<dialog>`, no `role="dialog"`, no `aria-modal`. When
 * `payload === null` the component renders nothing.
 *
 * Idempotency latch: a `useRef` keyed on `payload.sessionId` so any future
 * autoplay animation can fire exactly once per session-finished event
 * without re-firing on parent re-renders.
 */
export type EarnAcknowledgementProps = {
  payload: SessionCompletionTotemPayload | null
  /** Localized name of `payload.primaryTotemId`. Unused when `payload === null`. */
  primaryName?: string
  /** Localized names of secondary newly-earned totems. Unused when `payload === null`. */
  secondaryNames?: readonly string[]
}

export const EarnAcknowledgement = ({
  payload,
  primaryName = '',
  secondaryNames = [],
}: EarnAcknowledgementProps) => {
  const { t } = useTranslation('common')
  const ackShownForSessionId = useRef<string | null>(null)

  useEffect(() => {
    if (!payload) return
    if (ackShownForSessionId.current !== payload.sessionId) {
      ackShownForSessionId.current = payload.sessionId
    }
  }, [payload])

  if (!payload) return null

  return (
    <section
      data-testid="earn-ack"
      aria-label={t('session.completion.totem_ack.headline', {
        defaultValue: 'Nou tòtem',
      })}
      className="rounded-2xl border border-highlight/40 bg-surface p-5 shadow-elevated"
    >
      <h3 className="font-display text-base font-semibold text-text-primary">
        {t('session.completion.totem_ack.headline', { defaultValue: 'Has aconseguit un tòtem' })}
      </h3>
      <p className="mt-1 text-sm text-text-muted">
        {t('session.completion.totem_ack.body', {
          defaultValue: 'Has guanyat el tòtem {{totemName}}.',
          totemName: primaryName,
        })}
      </p>
      {secondaryNames.length > 0 && (
        <p className="mt-2 font-mono text-xs text-text-muted">
          {t('session.completion.totem_ack.also_earned', {
            defaultValue: 'També: {{names}}',
            names: secondaryNames.join(', '),
          })}
        </p>
      )}
    </section>
  )
}
