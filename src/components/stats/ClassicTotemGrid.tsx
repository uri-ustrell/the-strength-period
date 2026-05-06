import { Sparkles } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  FAMILY_VAR,
  groupByFamily,
  isEmptyInventory,
  useEarnedOnLabel,
  useFamilyLabel,
  useTotemAriaLabel,
} from '@/components/stats/totemInventoryShared'
import type {
  TotemEntry,
  TotemId,
  TotemInventoryModel,
} from '@/services/stats/buildTotemInventoryModel'

export type ClassicTotemGridProps = {
  model: TotemInventoryModel
}

/**
 * Step 16 Phase D — `classic-boring` totem inventory renderer (D6).
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Variant: Classic Boring → Stats / Inventory Surface" and
 * "Phase D Shared Contracts (Stats / Inventory)".
 *
 * - Responsive card grid grouped by family. Earned cards show the sprite,
 *   system-font name, family motif color stripe, and earned-date footer.
 * - Unearned totems are NOT in the main grid; they only appear inside the
 *   "What can I earn?" disclosure (`<details>`), keeping the main surface
 *   strictly celebratory.
 * - Inspect panel opens INLINE beneath the card (non-modal). ESC and a
 *   second activation collapse it. No focus trap, no scroll lock.
 * - This renderer NEVER reads any `--theme-game-stats-*` token (verified
 *   by D11 grep guard) and NEVER imports / calls `statsAudio`. No `<audio>`
 *   element is ever mounted.
 */
export const ClassicTotemGrid = ({ model }: ClassicTotemGridProps) => {
  const { t } = useTranslation('stats')
  const familyLabel = useFamilyLabel()
  const ariaName = useTotemAriaLabel()
  const earnedOn = useEarnedOnLabel()

  const groups = groupByFamily(model.totems)
  const earnedGroups = groups.map((g) => ({
    family: g.family,
    totems: g.totems.filter((tt) => tt.state === 'earned'),
  }))
  const reachableGroups = groups.map((g) => ({
    family: g.family,
    totems: g.totems.filter((tt) => tt.state === 'available'),
  }))
  const empty = isEmptyInventory(model.totems)
  const totalEarned = earnedGroups.reduce((acc, g) => acc + g.totems.length, 0)

  const [openId, setOpenId] = useState<TotemId | null>(null)
  const matrix = useRef<Array<Array<HTMLButtonElement | null>>>([])

  const setRef = useCallback(
    (rowIdx: number, colIdx: number) => (el: HTMLButtonElement | null) => {
      const row = (matrix.current[rowIdx] ??= [])
      row[colIdx] = el
    },
    []
  )

  const toggle = useCallback((id: TotemId) => {
    setOpenId((prev) => (prev === id ? null : id))
  }, [])

  const handleKey = useCallback(
    (rowIdx: number, colIdx: number, totem: TotemEntry) =>
      (event: React.KeyboardEvent<HTMLButtonElement>) => {
        const move = (r: number, c: number) => {
          const target = matrix.current[r]?.[c]
          if (target) {
            event.preventDefault()
            target.focus()
          }
        }
        switch (event.key) {
          case 'Escape':
            if (openId === totem.id) {
              event.preventDefault()
              setOpenId(null)
            }
            break
          case 'ArrowLeft':
            move(rowIdx, colIdx - 1)
            break
          case 'ArrowRight':
            move(rowIdx, colIdx + 1)
            break
          case 'ArrowUp':
            move(rowIdx - 1, colIdx)
            break
          case 'ArrowDown':
            move(rowIdx + 1, colIdx)
            break
        }
      },
    [openId]
  )

  return (
    <div className="space-y-3" data-testid="classic-totem-grid">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--theme-stats-inspect-fg)' }}>
        {t('totem.section_title')}
      </h3>

      {empty && (
        <p
          className="text-sm"
          data-testid="classic-totem-empty"
          style={{ color: 'var(--theme-stats-empty-muted)' }}
        >
          {t('totem.empty.calm')}
        </p>
      )}

      {totalEarned > 0 &&
        earnedGroups.map((group, rowIdx) => {
          if (group.totems.length === 0) return null
          return (
            <section
              key={group.family}
              data-testid={`classic-family-${group.family}`}
              className="space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-3 rounded-sm"
                  aria-hidden="true"
                  style={{ backgroundColor: FAMILY_VAR[group.family] }}
                />
                <span
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--theme-stats-empty-muted)' }}
                >
                  {familyLabel(group.family)}
                </span>
              </div>
              <ul
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                role="list"
                aria-label={familyLabel(group.family)}
              >
                {group.totems.map((totem, colIdx) => {
                  const isOpen = openId === totem.id
                  const ariaLabel = ariaName(totem)
                  const detailId = `classic-totem-detail-${totem.id}`
                  const dateId = `totem-date-${totem.id}`
                  const earnedOnLabel = totem.earnedDateISO ? earnedOn(totem.earnedDateISO) : ''
                  return (
                    <li key={totem.id} className="min-w-0">
                      <button
                        ref={setRef(rowIdx, colIdx)}
                        type="button"
                        role="button"
                        aria-pressed={isOpen}
                        aria-expanded={isOpen}
                        aria-controls={detailId}
                        aria-label={ariaLabel}
                        aria-describedby={earnedOnLabel ? dateId : undefined}
                        data-testid={`classic-totem-${totem.id}`}
                        data-totem-state={totem.state}
                        onClick={() => toggle(totem.id)}
                        onKeyDown={handleKey(rowIdx, colIdx, totem)}
                        className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                        style={{ borderLeftWidth: 4, borderLeftColor: FAMILY_VAR[group.family] }}
                      >
                        <span
                          className="flex h-7 w-7 flex-none items-center justify-center rounded-sm"
                          aria-hidden="true"
                          style={{ backgroundColor: 'var(--theme-stats-totem-earned)' }}
                        >
                          <Sparkles
                            size={14}
                            strokeWidth={2.5}
                            style={{ color: 'var(--theme-stats-inspect-fg)' }}
                          />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span
                            className="truncate text-xs font-semibold"
                            style={{ color: 'var(--theme-stats-inspect-fg)' }}
                          >
                            {t(totem.nameI18nKey)}
                          </span>
                          {totem.earnedDateISO && (
                            <span
                              className="truncate text-[10px]"
                              style={{ color: 'var(--theme-stats-empty-muted)' }}
                            >
                              {earnedOn(totem.earnedDateISO)}
                            </span>
                          )}
                        </span>
                      </button>
                      {earnedOnLabel && (
                        <span
                          id={dateId}
                          className="sr-only"
                          data-testid={`classic-totem-date-${totem.id}`}
                        >
                          {earnedOnLabel}
                        </span>
                      )}
                      {isOpen && (
                        <div
                          id={detailId}
                          role="region"
                          data-testid={`classic-totem-inspect-${totem.id}`}
                          className="mt-1 rounded-md border border-gray-200 p-2 text-xs"
                          style={{
                            backgroundColor: 'var(--theme-stats-inspect-bg)',
                            color: 'var(--theme-stats-inspect-fg)',
                          }}
                        >
                          <p className="mb-1 font-semibold">{t(totem.nameI18nKey)}</p>
                          <p className="text-[11px] leading-snug">{t(totem.ruleI18nKey)}</p>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}

      {/* Reachable disclosure — unearned totems live ONLY here, never side-by-side
          with earned cards (Phase D Shared Contracts: visual mapping for `available`
          in `classic-boring`). */}
      {reachableGroups.some((g) => g.totems.length > 0) && (
        <details
          className="rounded-md border border-gray-200 bg-white p-2"
          data-testid="classic-totem-reachable"
        >
          <summary
            className="cursor-pointer text-xs font-semibold"
            style={{ color: 'var(--theme-stats-inspect-fg)' }}
          >
            {t('totem.reachable_link')}
          </summary>
          <div className="mt-2 space-y-2">
            {reachableGroups.map((group) => {
              if (group.totems.length === 0) return null
              return (
                <div
                  key={`reach-${group.family}`}
                  data-testid={`classic-reachable-family-${group.family}`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-3 rounded-sm"
                      aria-hidden="true"
                      style={{ backgroundColor: FAMILY_VAR[group.family] }}
                    />
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--theme-stats-empty-muted)' }}
                    >
                      {familyLabel(group.family)}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {group.totems.map((totem) => (
                      <li key={`reach-${totem.id}`}>
                        <p
                          data-testid={`classic-reachable-${totem.id}`}
                          className="text-[11px]"
                          style={{ color: 'var(--theme-stats-inspect-fg)' }}
                        >
                          <span className="font-medium">{t(totem.nameI18nKey)}</span>
                          <span
                            className="ml-1 text-[10px]"
                            style={{ color: 'var(--theme-stats-empty-muted)' }}
                          >
                            — {t(totem.ruleI18nKey)}
                          </span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
