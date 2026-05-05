import { Check, Circle, Flag, Lock, Play, SkipForward } from 'lucide-react'
import { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useSessionAriaLabel,
  useStateLabel,
  weekAccentStyle,
} from '@/components/dashboard/dashboardMapShared'
import type { DashboardMapModel, SessionNodeState } from '@/services/dashboard/buildDashboardMap'

export type RetroWorldMapProps = {
  model: DashboardMapModel
  onSelectSession: (sessionId: string) => void
}

const STATE_ICON: Record<SessionNodeState, typeof Circle> = {
  future: Lock,
  available: Circle,
  'in-progress': Play,
  completed: Flag,
  skipped: SkipForward,
}

// Map state → CSS variable from `--theme-dashboard-state-*` so renderers
// share the same canonical palette.
const STATE_VAR: Record<SessionNodeState, string> = {
  future: 'var(--theme-dashboard-state-future)',
  available: 'var(--theme-dashboard-state-available)',
  'in-progress': 'var(--theme-dashboard-state-in-progress)',
  completed: 'var(--theme-dashboard-state-completed)',
  skipped: 'var(--theme-dashboard-state-skipped)',
}

/**
 * Step 16 Phase B — `retro-platformer` dashboard renderer.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Variant: Retro Platformer / Navigation Metaphor — World Map" and
 * "Phase B Shared Contracts (Dashboard)".
 *
 * - Each `WeekRow` becomes a "world" with its sub-palette resolved via the
 *   shared `weekAccentStyle` (deterministic `weekIndex % 6`).
 * - Every node is `role="link"` and exposes the canonical `dashboard.session_aria`
 *   accessible name.
 * - `future` is rendered as silhouette (lock = storytelling only); routing is
 *   never gated.
 * - Tab order is chronological. Arrow keys walk the focus matrix:
 *   ←/→ within a week, ↑/↓ across weeks.
 * - Reads only `--theme-dashboard-*`/`--theme-game-*` tokens; no
 *   `matchMedia` calls.
 */
export const RetroWorldMap = ({ model, onSelectSession }: RetroWorldMapProps) => {
  const { t } = useTranslation('common')
  const ariaName = useSessionAriaLabel()
  const stateLabel = useStateLabel()
  // Refs are stored as a flat matrix (week-row index → session-col index).
  const matrix = useRef<Array<Array<HTMLButtonElement | null>>>([])

  const setRef = useCallback(
    (rowIdx: number, colIdx: number) => (el: HTMLButtonElement | null) => {
      const row = (matrix.current[rowIdx] ??= [])
      row[colIdx] = el
    },
    []
  )

  const handleKey = useCallback(
    (rowIdx: number, colIdx: number) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const move = (r: number, c: number) => {
        const target = matrix.current[r]?.[c]
        if (target) {
          event.preventDefault()
          target.focus()
        }
      }
      switch (event.key) {
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
    []
  )

  const futureHint = useMemo(() => t('dashboard.future_hint'), [t])

  return (
    <div className="space-y-4">
      {model.weeks.map((week, rowIdx) => (
        <div
          key={week.weekNumber}
          className="rounded-lg border-2 border-gray-900/10 bg-gray-50 p-3"
          style={weekAccentStyle(week.weekIndex)}
          data-testid={`retro-world-${week.weekNumber}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: 'var(--theme-dashboard-week-accent)' }}
                aria-hidden="true"
              />
              <span className="text-xs font-bold uppercase tracking-wide text-gray-700">
                {`W${week.weekNumber}`}
              </span>
            </div>
            {week.isDeload && (
              <span
                className="rounded-sm bg-gray-900/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                data-testid={`retro-deload-${week.weekNumber}`}
              >
                {t('dashboard.deload_label')}
              </span>
            )}
          </div>
          <div
            className="relative flex items-center gap-2 overflow-x-auto"
            role="list"
            aria-label={t('dashboard.week_label', { week: week.weekNumber })}
          >
            {week.sessions.map((node, colIdx) => {
              const Icon = STATE_ICON[node.state]
              const isFuture = node.state === 'future'
              const label = ariaName(week.weekNumber, node.sessionIndexInWeek, node.state)
              return (
                <button
                  key={node.sessionId}
                  ref={setRef(rowIdx, colIdx)}
                  type="button"
                  role="link"
                  aria-label={label}
                  title={isFuture ? futureHint : stateLabel(node.state)}
                  data-state={node.state}
                  data-testid={`retro-node-${node.sessionId}`}
                  onClick={() => onSelectSession(node.sessionId)}
                  onKeyDown={handleKey(rowIdx, colIdx)}
                  className={`relative flex h-12 w-12 flex-none items-center justify-center rounded-sm border-2 border-gray-900 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
                    isFuture ? 'opacity-60' : ''
                  }`}
                  style={{
                    backgroundColor: STATE_VAR[node.state],
                    color: '#0f172a',
                  }}
                >
                  <Icon size={18} strokeWidth={2.5} aria-hidden="true" />
                  <span className="sr-only">{label}</span>
                  {/* Replaces real "checkpoint stamp"; deterministic, never random. */}
                  {node.state === 'completed' && (
                    <Check
                      size={10}
                      strokeWidth={3}
                      className="absolute -bottom-1 -right-1 rounded-sm bg-white p-px"
                      aria-hidden="true"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
