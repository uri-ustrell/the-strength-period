import type { ReactNode } from 'react'

export interface CardProps {
  children: ReactNode
  className?: string
}

export const Card = ({ children, className = '' }: CardProps) => (
  <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>
)
