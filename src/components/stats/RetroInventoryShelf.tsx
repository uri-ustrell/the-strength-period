import { Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  FAMILY_VAR,
  groupByFamily,
  isEmptyInventory,
  useEarnedOnLabel,
  useFamilyLabel,
  useTotemAriaLabel,
} from '@/components/stats/totemInventoryShared'
import { playTotemInspect, resetTotemInspect } from '@/services/audio/statsAudio'
import type {
  TotemEntry,
  TotemId,
  TotemInventoryModel,
} from '@/services/stats/buildTotemInventoryModel'

export type RetroInventoryShelfProps = {
  model: TotemInventoryModel
}

/**
 * Step 16 Phase D — `retro-platformer` totem inventory renderer (D5).
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Variant: Retro Platformer → Stats / Inventory Surface" and
 * "Phase D Shared Contracts (Stats / Inventory)".
 *
 * - Pixel-shelf grouped by family (Consistency → Recovery → Reflection).
 * - Earned slots: filled pixel sprite + earned-date stamp.
 * - Unearned slots: rendered as **unexplored terrain** — a soft tinted slot
 *   with a subtle pixel hatch motif. NEVER a locked silhouette, NEVER a "?"
 *   tile (forbidden by the Phase D contract).
 * - Inspect detail panel is non-modal, opens INLINE beneath the activated
 *   totem; ESC and second activation collapse it.
 * - Optional pickup chime via `statsAudio.playTotemInspect()` on inspect open;
 *   silent in `classic-boring` because the audio service short-circuits.
 * - Reads tokens via `--theme-stats-*` and `--theme-game-stats-*` only.
 */
export const RetroInventoryShelf = ({ model }: RetroInventoryShelfProps) => {
  const { t } = useTranslation('stats')
  const familyLabel = useFamilyLabel()
  const ariaName = useTotemAriaLabel()
  const earnedOn = useEarnedOnLabel()
  const groups = groupByFamily(model.totems)
  const empty = isEmptyInventory(model.totems)

  const [openId, setOpenId] = useState<TotemId | null>(null)
  // Refs are stored as a 2D matrix (family-row index → totem-col index).
  const matrix = useRef<Array<Array<HTMLButtonElement | null>>>([])

  const setRef = useCallback(
    (rowIdx: number, colIdx: number) => (el: HTMLButtonElement | null) => {
      const row = (matrix.current[rowIdx] ??= [])
      row[colIdx] = el
    },
    []
  )

  const toggle = useCallback((id: TotemId) => {
    setOpenId((prev) => {
      if (prev === id) {
        // Closing — reset chime latch so the next open re-arms it.
        resetTotemInspect()
        return null
      }
      // Opening — fire the single-shot chime (no-op outside retro).
      resetTotemInspect()
      playTotemInspect()
      return id
    })
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
              resetTotemInspect()
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

  // Reset chime arming when unmounted.
  useEffect(() => () => resetTotemInspect(), [])

  return (
    <div
      className="space-y-3"
      data-testid="retro-inventory-shelf"
      style={{ backgroundColor: 'var(--theme-game-stats-shelf-bg)' }}
    >
      <h3
        className="px-3 pt-2 text-xs font-bold uppercase tracking-wide"
        style={{ color: 'var(--theme-stats-inspect-fg)' }}
      >
        {t('totem.section_title')}
      </h3>

      {empty && (
        <p
          className="px-3 pb-2 text-sm"
          data-testid="retro-totem-empty"
          style={{ color: 'var(--theme-stats-empty-muted)' }}
        >
          {t('totem.empty.calm')}
        </p>
      )}

      {groups.map((group, rowIdx) => (
        <div
          key={group.family}
          className="rounded-md border-2 px-2 py-2"
          style={{
            borderColor: FAMILY_VAR[group.family],
            backgroundColor: 'var(--theme-stats-slot-bg)',
            borderWidth: 'var(--theme-game-stats-slot-border)',
          }}
          data-testid={`retro-family-${group.family}`}
        >
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              aria-hidden="true"
              style={{ backgroundColor: FAMILY_VAR[group.family] }}
            />
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--theme-stats-inspect-fg)' }}
            >
              {familyLabel(group.family)}
            </span>
          </div>
          <ul
            className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
            role="list"
            aria-label={familyLabel(group.family)}
          >
            {group.totems.map((totem, colIdx) => {
              const isOpen = openId === totem.id
              const isEarned = totem.state === 'earned'
              const ariaLabel = ariaName(totem)
              const detailId = `retro-totem-detail-${totem.id}`
              const dateId = `totem-date-${totem.id}`
              const earnedOnLabel = isEarned ? earnedOn(totem.earnedDateISO) : ''
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
                    aria-describedby={isEarned && earnedOnLabel ? dateId : undefined}
                    data-testid={`retro-totem-${totem.id}`}
                    data-totem-state={totem.state}
                    onClick={() => toggle(totem.id)}
                    onKeyDown={handleKey(rowIdx, colIdx, totem)}
                    className="relative flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-gray-900/40 p-1 font-mono transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-1 motion-reduce:transition-none motion-reduce:hover:scale-100"
                    style={{
                      backgroundColor: isEarned
                        ? 'var(--theme-stats-totem-earned)'
                        : 'var(--theme-stats-totem-available)',
                      color: 'var(--theme-stats-inspect-fg)',
                    }}
                  >
                    {isEarned ? (
                      <>
                        <Sparkles
                          size={20}
                          strokeWidth={2.5}
                          aria-hidden="true"
                          style={{
                            color: 'var(--theme-stats-inspect-fg)',
                            transform: 'scale(var(--theme-game-stats-sprite-scale, 1))',
                            transformOrigin: 'center',
                          }}
                        />
                        <span className="sr-only">{ariaLabel}</span>
                      </>
                    ) : (
                      <span
                        // "Unexplored terrain" — a soft pixel hatch. NOT a
                        // silhouette, NOT a "?" — those are forbidden renderings.
                        aria-hidden="true"
                        data-testid={`retro-totem-terrain-${totem.id}`}
                        className="block h-6 w-6 rounded-sm"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, rgba(15,23,42,0.06) 0 3px, transparent 3px 6px)',
                        }}
                      />
                    )}
                    <span className="sr-only">{ariaLabel}</span>
                  </button>
                  {isEarned && earnedOnLabel && (
                    <span
                      id={dateId}
                      className="sr-only"
                      data-testid={`retro-totem-date-${totem.id}`}
                    >
                      {earnedOnLabel}
                    </span>
                  )}
                  {isOpen && (
                    <RetroInspectPanel
                      id={detailId}
                      totem={totem}
                      earnedOn={earnedOn(totem.earnedDateISO)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

type InspectProps = {
  id: string
  totem: TotemEntry
  earnedOn: string
}

const RetroInspectPanel = ({ id, totem, earnedOn }: InspectProps) => {
  const { t } = useTranslation('stats')
  return (
    <div
      id={id}
      role="region"
      data-testid={`retro-totem-inspect-${totem.id}`}
      className="mt-1 rounded-sm border-2 border-gray-900/40 p-2 text-xs"
      style={{
        backgroundColor: 'var(--theme-stats-inspect-bg)',
        color: 'var(--theme-stats-inspect-fg)',
      }}
    >
      <p className="mb-1 font-bold">{t(totem.nameI18nKey)}</p>
      <p className="text-[11px] leading-snug">{t(totem.ruleI18nKey)}</p>
      {totem.state === 'earned' && earnedOn && (
        <p className="mt-1 text-[10px]" style={{ color: 'var(--theme-stats-empty-muted)' }}>
          {earnedOn}
        </p>
      )}
    </div>
  )
}
