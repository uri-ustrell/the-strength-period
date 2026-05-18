import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: 'default' | 'elevated' | 'flush'
  className?: string
}

const VARIANT_CLASS: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'rounded-2xl bg-surface border border-border-subtle shadow-card',
  elevated: 'rounded-2xl bg-surface-elevated border border-border-subtle shadow-elevated',
  flush: 'rounded-2xl bg-surface border border-border-subtle',
}

/**
 * Feature 17 — "Cristal de Progreso" surface primitive.
 *
 * Default `padding` is `p-4`; pass a custom `className` to override (e.g. for
 * tightly-padded session set rows).
 */
export const Card = ({ children, variant = 'default', className = '', ...rest }: CardProps) => (
  <div className={`${VARIANT_CLASS[variant]} p-4 ${className}`} {...rest}>
    {children}
  </div>
)
