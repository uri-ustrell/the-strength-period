import { Check, Circle, Minus, Pause, Play } from 'lucide-react'
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useSessionAriaLabel,
  useStateLabel,
  weekAccentStyle,
} from '@/components/dashboard/dashboardMapShared'
import type { DashboardMapModel, SessionNodeState } from '@/services/dashboard/buildDashboardMap'

export type ClassicCalendarProps = {
  model: DashboardMapModel
  onSelectSession: (sessionId: string) => void
}

const STATE_ICON: Record<SessionNodeState, typeof Circle> = {
  future: Circle,
  available: Circle,
  'in-progress': Play,
  completed: Check,
  skipped: Minus,
}

const STATE_VAR: Record<SessionNodeState, string> = {
  future: 'var(--theme-dashboard-state-future)',
  available: 'var(--theme-dashboard-state-available)',
  'in-progress': 'var(--theme-dashboard-state-in-progress)',
  completed: 'var(--theme-dashboard-state-completed)',
  skipped: 'var(--theme-dashboard-state-skipped)',
}

/**
 * Step 16 Phase B — `classic-boring` dashboard renderer.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Variant: Classic Boring (Surface Treatments + Navigation Metaphor — Calendar)"
 * and "Phase B Shared Contracts (Dashboard)".
 *
 * - One row per week, one cell per session. Cells render small Lucide-based
 *   state glyphs (no custom pixel sprite at v1).
 * - Each cell uses the muted week-accent shade
 *   (`--theme-dashboard-week-accent-muted`) as a soft tint behind the canonical
 *   state color so weeks remain visually distinct without becoming loud.
 * - `future` cells stay interactable but visually muted (`opacity-70`).
 * - Identical aria contract and routing semantics to {@link RetroWorldMap}.
 */
export const ClassicCalendar = ({ model, onSelectSession }: ClassicCalendarProps) => {
  const { t } = useTranslation('common')
  const ariaName = useSessionAriaLabel()
  const stateLabel = useStateLabel()
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

  return (
    <div className="space-y-2" data-testid="classic-calendar">
      {model.weeks.map((week, rowIdx) => (
        <div
          key={week.weekNumber}
          className="rounded-md border border-gray-200 p-2"
          style={weekAccentStyle(week.weekIndex)}
          data-testid={`classic-week-${week.weekNumber}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-3 rounded-sm"
                style={{ backgroundColor: 'var(--theme-dashboard-week-accent-muted)' }}
                aria-hidden="true"
              />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                {`W${week.weekNumber}`}
              </span>
            </div>
            {week.isDeload && (
              <span
                className="rounded-sm border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-700"
                data-testid={`classic-deload-${week.weekNumber}`}
              >
                {t('dashboard.deload_label')}
              </span>
            )}
          </div>
          <div
            className="grid grid-flow-col auto-cols-fr gap-1.5"
            role="list"
            aria-label={t('dashboard.week_label', { week: week.weekNumber })}
          >
            {week.sessions.map((node, colIdx) => {
              const Icon = STATE_ICON[node.state]
              const isFuture = node.state === 'future'
              const isInProgress = node.state === 'in-progress'
              const label = ariaName(week.weekNumber, node.sessionIndexInWeek, node.state)
              const cellStyle: React.CSSProperties = {
                backgroundColor: 'var(--theme-dashboard-week-accent-muted)',
              }
              if (isInProgress) {
                // Drive the ring color via the canonical state token instead
                // of a hardcoded Tailwind utility so theme overrides apply.
                ;(cellStyle as React.CSSProperties & Record<string, string>)['--tw-ring-color'] =
                  'var(--theme-dashboard-state-in-progress)'
              }
              return (
                <button
                  key={node.sessionId}
                  ref={setRef(rowIdx, colIdx)}
                  type="button"
                  role="link"
                  aria-label={label}
                  title={isFuture ? t('dashboard.future_hint') : stateLabel(node.state)}
                  data-state={node.state}
                  data-testid={`classic-cell-${node.sessionId}`}
                  onClick={() => onSelectSession(node.sessionId)}
                  onKeyDown={handleKey(rowIdx, colIdx)}
                  className={`flex h-10 items-center justify-center gap-1 rounded-sm border border-gray-300 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                    isFuture ? 'opacity-70' : ''
                  } ${isInProgress ? 'ring-2' : ''}`}
                  style={cellStyle}
                >
                  <Icon
                    size={16}
                    strokeWidth={2.5}
                    aria-hidden="true"
                    style={{ color: STATE_VAR[node.state] }}
                  />
                  {isInProgress && (
                    <Pause
                      size={10}
                      strokeWidth={2.5}
                      aria-hidden="true"
                      style={{ color: 'var(--theme-dashboard-state-in-progress)' }}
                    />
                  )}
                  <span className="sr-only">{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
