import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

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

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        {t('no_data')}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-900">{t('adherence')}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            formatter={(value, name) => [value, name === 'planned' ? t('planned') : t('completed')]}
          />
          <Legend
            formatter={(value: string) => (value === 'planned' ? t('planned') : t('completed'))}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar dataKey="planned" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
          <Bar dataKey="completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
