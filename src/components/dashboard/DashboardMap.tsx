import { useTranslation } from 'react-i18next'
import type { DashboardMapModel, SessionNode } from '@/services/dashboard/buildDashboardMap'

export type DashboardMapProps = {
  model: DashboardMapModel
  onSelectSession: (sessionId: string) => void
}

const STATE_CLASS: Record<SessionNode['state'], string> = {
  future: 'border border-border-subtle bg-transparent text-text-muted',
  available: 'border border-border-strong bg-surface text-text-primary',
  'in-progress': 'border-2 border-accent bg-surface text-text-primary shadow-card',
  completed: 'bg-surface-elevated text-text-primary',
  skipped: 'bg-surface text-text-muted',
}

const DAY_KEY: Record<number, string> = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
  7: 'sun',
}

/**
 * Feature 17 — Dashboard period strip.
 *
 * Single-renderer replacement for the Step 16 dual-skin DashboardMap. Renders
 * the mesocycle as a sequence of weeks of session pills:
 *
 *   - future        → outlined, muted
 *   - available     → bordered, neutral surface
 *   - in-progress   → accent (coral) ring, focal card
 *   - completed     → filled surface, normal text
 *   - skipped       → muted (never red)
 *
 * No router, no aesthetic variant. The previous Phase B classic-calendar +
 * retro-world-map fork is gone.
 */
export const DashboardMap = ({ model, onSelectSession }: DashboardMapProps) => {
  const { t } = useTranslation('common')

  if (model.weeks.length === 0) {
    return (
      <p className="text-sm text-text-muted" data-testid="dashboard-map-empty">
        {t('dashboard.no_sessions', { defaultValue: 'Encara no tens cap pla actiu.' })}
      </p>
    )
  }

  return (
    <div className="space-y-4" data-testid="dashboard-period-strip">
      {model.weeks.map((week) => (
        <section
          key={week.weekNumber}
          className="space-y-2"
          data-testid={`week-${week.weekNumber}`}
        >
          <header className="flex items-baseline justify-between">
            <h3 className="font-display text-sm font-semibold text-text-primary">
              {t('dashboard.week_label', {
                defaultValue: 'Setmana {{n}}',
                n: week.weekNumber,
              })}
            </h3>
            {week.isDeload ? (
              <span className="font-mono text-[11px] uppercase tracking-wider text-highlight">
                {t('dashboard.deload', { defaultValue: 'Descàrrega' })}
              </span>
            ) : null}
          </header>
          <ul className="flex flex-wrap gap-2">
            {week.sessions.map((session) => (
              <li key={session.sessionId}>
                <button
                  type="button"
                  onClick={() => onSelectSession(session.sessionId)}
                  data-testid={`period-day-${session.sessionId}`}
                  data-state={session.state}
                  className={`flex min-w-[5.5rem] flex-col items-start gap-0.5 rounded-2xl px-3 py-2 text-left transition-colors ${STATE_CLASS[session.state]}`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                    {t(`common.day.${DAY_KEY[session.dayOfWeek] ?? 'mon'}`, {
                      defaultValue: DAY_KEY[session.dayOfWeek] ?? 'mon',
                    })}
                  </span>
                  <span className="font-display text-sm font-semibold tabular">
                    {session.durationMinutes}'
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
