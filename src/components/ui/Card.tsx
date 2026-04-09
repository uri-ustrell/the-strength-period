import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export const Card = ({ children, className = '' }: Props) => (
  <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>
)
