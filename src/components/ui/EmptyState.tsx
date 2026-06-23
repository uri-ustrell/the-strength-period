import type { ReactNode } from 'react'

export interface EmptyStateProps {
  icon?: ReactNode
  headline: string
  body?: string
  action?: ReactNode
  className?: string
}

/**
 * Empty state primitive.
 *
 * Quiet, centered. Used wherever a screen has no data yet (no plan, no
 * sessions logged, no totems unlocked). Never punitive.
 */
export const EmptyState = ({ icon, headline, body, action, className = '' }: EmptyStateProps) => (
  <div
    className={`flex flex-col items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-8 text-center ${className}`}
    role="status"
  >
    {icon ? <div className="text-text-muted">{icon}</div> : null}
    <h3 className="font-display text-base font-semibold text-text-primary">{headline}</h3>
    {body ? <p className="max-w-prose text-sm text-text-muted">{body}</p> : null}
    {action ? <div className="pt-1">{action}</div> : null}
  </div>
)
