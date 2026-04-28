import { useTranslation } from 'react-i18next'
import type { WeekProgressionRate } from '@/types/planning'

interface Props {
  rates: WeekProgressionRate[]
  height?: number
  className?: string
}

/**
 * Compact inline SVG sparkline plotting per-week progression %.
 * Negative weeks (deload) are rendered with a dashed amber stroke segment.
 * No external chart library; responsive width via viewBox.
 */
export const ProgressionSparkline = ({ rates, height = 60, className }: Props) => {
  const { t } = useTranslation('planning')
  if (rates.length === 0) return null

  const width = Math.max(120, rates.length * 28)
  const padX = 12
  const padY = 8
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  const values = rates.map((r) => r.progressionPct)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const range = max - min || 1

  const points = values.map((v, i) => {
    const x = rates.length === 1 ? padX + innerW / 2 : padX + (i * innerW) / (rates.length - 1)
    const y = padY + innerH - ((v - min) / range) * innerH
    return { x, y, v }
  })

  const baselineY = padY + innerH - ((0 - min) / range) * innerH

  return (
    <svg
      role="img"
      aria-label={t('progression_sparkline_aria')}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`w-full ${className ?? ''}`}
      style={{ height }}
    >
      <line
        x1={padX}
        y1={baselineY}
        x2={width - padX}
        y2={baselineY}
        stroke="#e5e7eb"
        strokeDasharray="2 3"
        strokeWidth={1}
      />
      {points.map((p, i) => {
        const next = points[i + 1]
        if (!next) return null
        const isDeloadSegment = p.v < 0 || next.v < 0
        return (
          <line
            key={`seg-${i}`}
            x1={p.x}
            y1={p.y}
            x2={next.x}
            y2={next.y}
            stroke={isDeloadSegment ? '#d97706' : '#4f46e5'}
            strokeWidth={2}
            strokeDasharray={isDeloadSegment ? '4 3' : undefined}
            strokeLinecap="round"
          />
        )
      })}
      {points.map((p, i) => (
        <circle key={`pt-${i}`} cx={p.x} cy={p.y} r={2.5} fill={p.v < 0 ? '#d97706' : '#4f46e5'} />
      ))}
    </svg>
  )
}
