import { useTranslation } from 'react-i18next'

import type { WeekProgressionRate } from '@/types/planning'

interface WeekProgressionTableProps {
  weeks: number
  rates: WeekProgressionRate[]
  onChange: (rates: WeekProgressionRate[]) => void
}

export const WeekProgressionTable = ({ weeks, rates, onChange }: WeekProgressionTableProps) => {
  const { t } = useTranslation('planning')

  if (weeks <= 0) {
    return null
  }

  const handleChange = (week: number, raw: string) => {
    const parsed = raw === '' || raw === '-' ? 0 : Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed)) return
    const next = Array.from({ length: weeks }, (_, i) => {
      const w = i + 1
      const existing = rates[i]
      if (w === week) return { week: w, progressionPct: parsed }
      if (existing) return { week: w, progressionPct: existing.progressionPct }
      return { week: w, progressionPct: w % 4 === 0 ? -40 : 5 }
    })
    onChange(next)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="px-3 py-2 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-700">{t('progression_table_title')}</p>
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: weeks }, (_, i) => {
          const week = i + 1
          const rate = rates[i]?.progressionPct ?? (week % 4 === 0 ? -40 : 5)
          const isDeload = rate < 0
          return (
            <div key={week} className="flex items-center gap-3 px-3 py-2">
              <span className="text-sm text-gray-600 w-20 shrink-0">
                {t('week_label', { n: week })}
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step={1}
                  value={rate}
                  onChange={(e) => handleChange(week, e.target.value)}
                  className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm text-right focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  aria-label={t('week_label', { n: week })}
                />
                <span className="text-xs text-gray-400">{t('progression_pct_suffix')}</span>
              </div>
              {isDeload && (
                <span className="text-xs font-medium text-amber-600">{t('deload_week_hint')}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
