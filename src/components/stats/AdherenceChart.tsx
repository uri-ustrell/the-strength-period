import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useChartTheme } from '@/components/stats/ChartThemeProvider'

interface AdherenceDataPoint {
  week: string
  planned: number
  completed: number
}

interface Props {
  data: AdherenceDataPoint[]
}

export const AdherenceChart = ({ data }: Props) => {
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
      <h3 className="text-sm font-semibold text-text-primary">{t('adherence')}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-charts-grid)" />
          <XAxis
            dataKey="week"
            stroke="var(--theme-charts-axis-fg)"
            tick={{
              fontSize: 11,
              fill: 'var(--theme-charts-axis-fg)',
              fontFamily: 'var(--theme-game-charts-axis-font, inherit)',
              letterSpacing: 'var(--theme-game-charts-axis-letter-spacing, normal)',
            }}
          />
          <YAxis
            allowDecimals={false}
            stroke="var(--theme-charts-axis-fg)"
            tick={{
              fontSize: 11,
              fill: 'var(--theme-charts-axis-fg)',
              fontFamily: 'var(--theme-game-charts-axis-font, inherit)',
              letterSpacing: 'var(--theme-game-charts-axis-letter-spacing, normal)',
            }}
          />
          <Tooltip
            formatter={(value, name) => [value, name === 'planned' ? t('planned') : t('completed')]}
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
          <Legend
            formatter={(value: string) => (value === 'planned' ? t('planned') : t('completed'))}
            wrapperStyle={{
              fontSize: 11,
              color: 'var(--theme-charts-legend-fg)',
              fontFamily: 'var(--theme-game-charts-axis-font, inherit)',
              letterSpacing: 'var(--theme-game-charts-axis-letter-spacing, normal)',
            }}
          />
          <Bar
            dataKey="planned"
            fill="var(--theme-charts-series-3)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={isAnimationActive}
          />
          <Bar
            dataKey="completed"
            fill="var(--theme-charts-series-1)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={isAnimationActive}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
