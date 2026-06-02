import { useTranslation } from 'react-i18next'
import {
  FAMILY_ORDER,
  type TotemEntry,
  type TotemFamily,
  type TotemInventoryModel,
} from '@/services/stats/buildTotemInventoryModel'

export type TotemInventoryProps = {
  model: TotemInventoryModel
}

const FAMILY_COLOR: Record<TotemFamily, string> = {
  consistency: 'var(--color-family-consistency)',
  recovery: 'var(--color-family-recovery)',
  preparation: 'var(--color-family-preparation)',
  reflection: 'var(--color-family-reflection)',
}

/**
 * Feature 17 — Totem inventory.
 *
 * Single-renderer replacement for the Step 16 dual-skin TotemInventory
 * (`ClassicTotemGrid` + `RetroInventoryShelf`). Totems are rendered as a
 * collectible grid grouped by family. Locked totems remain visible — never
 * hidden — but dim, with a quiet hint copy ("Por desbloquear"). Earned
 * totems glow softly in mint.
 */
export const TotemInventory = ({ model }: TotemInventoryProps) => {
  const { t } = useTranslation('stats')

  const groups = FAMILY_ORDER.map((family) => ({
    family,
    totems: model.totems.filter((t) => t.family === family),
  })).filter((g) => g.totems.length > 0)

  return (
    <div className="space-y-4" data-testid="totem-inventory">
      {groups.map(({ family, totems }) => (
        <section key={family} className="space-y-2" data-testid={`totem-family-${family}`}>
          <header className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-3 rounded-sm"
              style={{ backgroundColor: FAMILY_COLOR[family] }}
              aria-hidden="true"
            />
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              {t(`totem.family.${family}`)}
            </h3>
          </header>
          <ul
            className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
            aria-label={t(`totem.family.${family}`)}
          >
            {totems.map((totem) => (
              <li key={totem.id} className="min-w-0">
                <TotemBadge totem={totem} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

type BadgeProps = { totem: TotemEntry }

const TotemBadge = ({ totem }: BadgeProps) => {
  const { t } = useTranslation('stats')
  const earned = totem.state === 'earned'
  const name = t(totem.nameI18nKey)
  const rule = t(totem.ruleI18nKey)
  const stateLabel = t(`totem.state.${totem.state}`)
  const familyColor = FAMILY_COLOR[totem.family]

  return (
    <div
      data-testid={`totem-${totem.id}`}
      data-state={totem.state}
      role="img"
      aria-label={`${name} — ${stateLabel}`}
      className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center ${
        earned
          ? 'border-success/40 bg-success/10 shadow-card'
          : 'border-border-subtle bg-surface opacity-60'
      }`}
      style={earned ? { boxShadow: '0 0 0 1px var(--color-success)' } : undefined}
    >
      <span
        className="inline-block h-5 w-5 rounded-sm"
        style={{ backgroundColor: earned ? familyColor : 'var(--color-text-muted)' }}
        aria-hidden="true"
      />
      <span className="line-clamp-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-text-primary">
        {name}
      </span>
      {!earned && <span className="line-clamp-2 text-[9px] text-text-muted">{rule}</span>}
    </div>
  )
}
