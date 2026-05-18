import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useChartTheme } from '@/components/stats/ChartThemeProvider'

interface ProgressionDataPoint {
  date: string
  weight: number
  volume: number
}

interface Props {
  data: ProgressionDataPoint[]
  exerciseName: string
}

export const ProgressionChart = ({ data, exerciseName }: Props) => {
  const { t } = useTranslation('stats')
  const { isAnimationActive } = useChartTheme()

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-text-muted/70">
        {t('no_data')}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-text-primary">
        {t('progression')} — {exerciseName}
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-charts-grid)" />
          <XAxis
            dataKey="date"
            stroke="var(--theme-charts-axis-fg)"
            tick={{
              fontSize: 11,
              fill: 'var(--theme-charts-axis-fg)',
              fontFamily: 'var(--theme-game-charts-axis-font, inherit)',
              letterSpacing: 'var(--theme-game-charts-axis-letter-spacing, normal)',
            }}
          />
          <YAxis
            stroke="var(--theme-charts-axis-fg)"
            tick={{
              fontSize: 11,
              fill: 'var(--theme-charts-axis-fg)',
              fontFamily: 'var(--theme-game-charts-axis-font, inherit)',
              letterSpacing: 'var(--theme-game-charts-axis-letter-spacing, normal)',
            }}
          />
          <Tooltip
            formatter={(value, name) => {
              const label = name === 'weight' ? t('weight_kg') : t('best_volume')
              return [`${value}`, label]
            }}
            contentStyle={{
              background: 'var(--theme-charts-tooltip-bg)',
              color: 'var(--theme-charts-tooltip-fg)',
              borderColor: 'var(--theme-charts-grid)',
              fontFamily: 'inherit',
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--theme-charts-tooltip-fg)', fontFamily: 'inherit' }}
            itemStyle={{ color: 'var(--theme-charts-tooltip-fg)', fontFamily: 'inherit' }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="var(--theme-charts-series-1)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={isAnimationActive}
          />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="var(--theme-charts-series-2)"
            strokeWidth={2}
            dot={{ r: 3 }}
            strokeDasharray="5 5"
            isAnimationActive={isAnimationActive}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
