import { useTranslation } from 'react-i18next'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface VolumeDataPoint {
  week: string
  [muscleGroup: string]: number | string
}

interface Props {
  data: VolumeDataPoint[]
  muscleGroups: string[]
}

const MUSCLE_COLORS: Record<string, string> = {
  quadriceps: '#6366f1',
  isquiotibials: '#ec4899',
  glutis: '#14b8a6',
  bessons: '#f59e0b',
  pectoral: '#8b5cf6',
  dorsal: '#3b82f6',
  trapezi: '#10b981',
  deltoides: '#06b6d4',
  biceps: '#84cc16',
  triceps: '#f97316',
  avantbras: '#a855f7',
  abdominal: '#ef4444',
  oblics: '#d946ef',
  lumbar: '#0ea5e9',
  adductors: '#22c55e',
  abductors: '#eab308',
  psoes: '#e11d48',
  tibial_anterior: '#0891b2',
  estabilitzadors_cadera: '#7c3aed',
  mobilitat_cadera: '#059669',
  mobilitat_turmell: '#ca8a04',
  mobilitat_toracica: '#dc2626',
  fascies: '#9333ea',
}

export const VolumeChart = ({ data, muscleGroups }: Props) => {
  const { t } = useTranslation(['stats', 'muscles'])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        {t('stats:no_data')}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-900">{t('stats:volume_by_muscle')}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value, name) => [
              `${value} ${t('stats:sets')}`,
              t(`muscles:${String(name)}`),
            ]}
          />
          <Legend
            formatter={(value: string) => t(`muscles:${value}`)}
            wrapperStyle={{ fontSize: 11 }}
          />
          {muscleGroups.map((mg) => (
            <Area
              key={mg}
              type="monotone"
              dataKey={mg}
              stackId="1"
              stroke={MUSCLE_COLORS[mg] ?? '#94a3b8'}
              fill={MUSCLE_COLORS[mg] ?? '#94a3b8'}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
