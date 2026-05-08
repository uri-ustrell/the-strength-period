import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useEffectiveAestheticVariant } from '@/hooks/useEffectiveAestheticVariant'
import type { SessionCompletionTotemPayload } from '@/services/session/buildSessionCompletionTotemPayload'

/**
 * Step 16 Phase E sub-phase E1 — Earn-acknowledgement frame.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase E Shared Contracts → E1 — Earn-Acknowledgement Frame Contract".
 *
 * Inline-only celebration of newly-earned totems shown after a session is
 * finished. NEVER a modal: no `<dialog>`, no `role="dialog"`, no
 * `aria-modal`. When `payload === null` the component renders nothing.
 *
 * The classic and retro variants render entirely separate subtrees so each
 * variant only ever resolves its own i18n keys (parity contract).
 *
 * Idempotency latch: a `useRef` keyed on `payload.sessionId` so downstream
 * E2 Rive autoplay can fire exactly once per session-finished event without
 * re-firing on parent re-renders.
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
  const variant = useEffectiveAestheticVariant()
  // TODO(E2): Rive autoplay hook will fire here on first-show per session.
  const ackShownForSessionId = useRef<string | null>(null)

  // E2 Rive autoplay hook will fire here on first-show per session.
  // Today the latch only tracks the most recently displayed sessionId so
  // re-renders with the same payload are observably no-ops.
  useEffect(() => {
    if (!payload) return
    if (ackShownForSessionId.current !== payload.sessionId) {
      ackShownForSessionId.current = payload.sessionId
    }
  }, [payload])

  if (!payload) return null

  if (variant === 'retro-platformer') {
    return (
      <RetroEarnAcknowledgement primaryName={primaryName} secondaryNames={secondaryNames} />
    )
  }
  return (
    <ClassicEarnAcknowledgement primaryName={primaryName} secondaryNames={secondaryNames} />
  )
}

type VariantProps = {
  primaryName: string
  secondaryNames: readonly string[]
}

const ClassicEarnAcknowledgement = ({ primaryName, secondaryNames }: VariantProps) => {
  // Classic variant NEVER reads any `*.retro.*` key and NEVER references
  // retro tokens. Single calm inline section, system fonts only.
  const { t } = useTranslation('common')
  return (
    <section
      data-testid="earn-ack"
      data-variant="classic"
      aria-label={t('session.completion.totem_ack.calm.headline')}
      className="rounded-2xl bg-white p-5 shadow-sm"
    >
      <h3 className="text-base font-semibold text-gray-900">
        {t('session.completion.totem_ack.calm.headline')}
      </h3>
      <p className="mt-1 text-sm text-gray-700">
        {t('session.completion.totem_ack.calm.body', { totemName: primaryName })}
      </p>
      {secondaryNames.length > 0 && (
        <p className="mt-2 text-sm text-gray-600">
          {t('session.completion.totem_ack.calm.also_earned', {
            names: secondaryNames.join(', '),
          })}
        </p>
      )}
    </section>
  )
}

const RetroEarnAcknowledgement = ({ primaryName, secondaryNames }: VariantProps) => {
  // Retro variant — pixel-art inline frame. NEVER a modal. Reads only the
  // `*.retro.*` key tree. E2 will introduce a Rive flash here, gated by
  // the idempotency latch above.
  //
  // Tokens reused from Phase C `RetroLevelRun` (the closest aesthetic
  // analog) so the ack frame is visually consistent with the surrounding
  // retro session HUD: `--theme-game-session-checkpoint` for the surface,
  // `--theme-game-session-platform` for the saturated border, and
  // `--theme-session-hud-fg` for the foreground. Display font reuses the
  // Tailwind `font-mono` class \u2014 same convention as `RetroLevelRun`'s
  // level-clear stamp \u2014 so no new CSS variable is introduced.
  const { t } = useTranslation('common')
  return (
    <section
      data-testid="earn-ack"
      data-variant="retro"
      aria-label={t('session.completion.totem_ack.retro.headline')}
      className="rounded-none border-2 p-4 font-mono"
      style={{
        backgroundColor: 'var(--theme-game-session-checkpoint)',
        borderColor: 'var(--theme-game-session-platform)',
        color: 'var(--theme-session-hud-fg)',
      }}
    >
      <p className="text-xs uppercase tracking-widest">
        {t('session.completion.totem_ack.retro.headline')}
      </p>
      <p className="mt-1 text-sm">
        {t('session.completion.totem_ack.retro.body', { totemName: primaryName })}
      </p>
      {secondaryNames.length > 0 && (
        <p className="mt-2 text-xs opacity-90">
          {t('session.completion.totem_ack.retro.also_earned', {
            names: secondaryNames.join(', '),
          })}
        </p>
      )}
    </section>
  )
}
