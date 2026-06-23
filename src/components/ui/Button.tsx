import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    'bg-accent text-bg hover:brightness-110 active:scale-[0.96] transition-transform disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'border border-border-strong bg-surface text-text-primary hover:bg-surface-elevated active:scale-[0.96] transition-transform disabled:opacity-50',
  danger:
    'bg-warning text-bg hover:brightness-110 active:scale-[0.96] transition-transform disabled:opacity-50',
  ghost:
    'text-text-muted hover:text-text-primary hover:bg-surface-elevated active:scale-[0.96] transition-transform disabled:opacity-50',
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-full',
  md: 'px-4 py-2.5 text-sm rounded-full',
  lg: 'px-6 py-3 text-base rounded-full',
}

/**
 * "Progreso Jugable" button primitive.
 *
 * Primary button is a coral pill in `font-display` semibold with a subtle
 * `active:scale-[0.96]` press-bounce. Honors `prefers-reduced-motion` via the
 * global override in `src/index.css`.
 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  type = 'button',
  ...rest
}: Props) => (
  // eslint-disable-next-line react/button-has-type
  <button
    type={type}
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 font-display font-semibold ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
    {...rest}
  >
    {loading && <LoadingSpinner size={size === 'sm' ? 14 : 16} />}
    {children}
  </button>
)
