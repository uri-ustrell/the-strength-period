import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

import type { AvailableWeights, WeightEquipment } from '@/types/user'
import type { Equipment } from '@/types/exercise'

interface Props {
  equipment: Equipment[]
  availableWeights: AvailableWeights
  onChange: (weights: AvailableWeights) => void
  namespace?: 'common' | 'onboarding'
}

const COMMON_DUMBBELL_WEIGHTS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40,
]
const COMMON_BARBELL_WEIGHTS = [
  20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120,
]

const EQUIPMENT_CONFIG: { key: WeightEquipment; equipmentMatch: Equipment; presets: number[] }[] = [
  { key: 'manueles', equipmentMatch: 'manueles', presets: COMMON_DUMBBELL_WEIGHTS },
  { key: 'barra', equipmentMatch: 'barra', presets: COMMON_BARBELL_WEIGHTS },
]

const sortUniqueWeights = (weights: number[]): number[] =>
  [...new Set(weights)].sort((a, b) => a - b)

export const WeightSelector = ({
  equipment,
  availableWeights,
  onChange,
  namespace = 'common',
}: Props) => {
  const { t } = useTranslation([namespace, 'common'])
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({})
  const [initialCascadeApplied, setInitialCascadeApplied] = useState<
    Partial<Record<WeightEquipment, boolean>>
  >({})

  const hasWeightEquipment = equipment.includes('manueles') || equipment.includes('barra')

  if (!hasWeightEquipment) {
    return (
      <p className="text-sm text-gray-400 italic">
        {t('common:available_weights.no_equipment_hint')}
      </p>
    )
  }

  const hasInitialCascadeApplied = (equipmentKey: WeightEquipment): boolean => {
    if (initialCascadeApplied[equipmentKey] !== undefined) {
      return initialCascadeApplied[equipmentKey] as boolean
    }

    return (availableWeights[equipmentKey] ?? []).length > 0
  }

  const markInitialCascadeApplied = (equipmentKey: WeightEquipment) => {
    setInitialCascadeApplied((prev) => {
      if (prev[equipmentKey]) return prev
      return { ...prev, [equipmentKey]: true }
    })
  }

  const toggleWeight = (
    equipmentKey: WeightEquipment,
    weight: number,
    equipmentWeights: number[]
  ) => {
    const current = availableWeights[equipmentKey] ?? []
    const isSelected = current.includes(weight)
    const shouldApplyCascade = !isSelected && !hasInitialCascadeApplied(equipmentKey)
    const updated = isSelected
      ? current.filter((w) => w !== weight)
      : shouldApplyCascade
        ? sortUniqueWeights([...current, ...equipmentWeights.filter((w) => w <= weight)])
        : sortUniqueWeights([...current, weight])

    if (shouldApplyCascade) {
      markInitialCascadeApplied(equipmentKey)
    }

    onChange({ ...availableWeights, [equipmentKey]: updated })
  }

  const addCustomWeight = (equipmentKey: WeightEquipment) => {
    const raw = customInputs[equipmentKey]?.trim()
    if (!raw) return
    const value = parseFloat(raw)
    if (isNaN(value) || value <= 0 || value > 500) return
    const equipmentConfig = EQUIPMENT_CONFIG.find((config) => config.key === equipmentKey)
    if (!equipmentConfig) return

    const current = availableWeights[equipmentKey] ?? []
    const equipmentWeights = sortUniqueWeights([...equipmentConfig.presets, ...current, value])
    const shouldApplyCascade = !hasInitialCascadeApplied(equipmentKey)
    const updated = shouldApplyCascade
      ? sortUniqueWeights([...current, ...equipmentWeights.filter((w) => w <= value)])
      : sortUniqueWeights([...current, value])

    if (shouldApplyCascade) {
      markInitialCascadeApplied(equipmentKey)
    }

    onChange({
      ...availableWeights,
      [equipmentKey]: updated,
    })

    setCustomInputs((prev) => ({ ...prev, [equipmentKey]: '' }))
  }

  const labelKey = (key: WeightEquipment): string => {
    if (namespace === 'onboarding') {
      return key === 'manueles' ? 'onboarding:step3.dumbbells' : 'onboarding:step3.barbell'
    }
    return key === 'manueles'
      ? 'common:available_weights.dumbbells'
      : 'common:available_weights.barbell'
  }

  return (
    <div className="space-y-4">
      {EQUIPMENT_CONFIG.map(({ key, equipmentMatch, presets }) => {
        if (!equipment.includes(equipmentMatch)) return null
        const selected = availableWeights[key] ?? []
        // Merge custom (selected but not in presets) into grid so they can be toggled off
        const customWeights = selected.filter((w) => !presets.includes(w))
        const allWeights = sortUniqueWeights([...presets, ...customWeights])

        return (
          <div key={key}>
            <h4 className="mb-2 text-sm font-medium text-gray-600">{t(labelKey(key))}</h4>
            <div className="flex flex-wrap gap-1.5">
              {allWeights.map((w) => {
                const isSelected = selected.includes(w)
                const isCustom = !presets.includes(w)
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => toggleWeight(key, w, allWeights)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                    } ${isCustom ? 'ring-1 ring-indigo-200' : ''}`}
                  >
                    {w}
                  </button>
                )
              })}
            </div>
            {/* Custom weight input */}
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="0.5"
                max="500"
                step="0.5"
                value={customInputs[key] ?? ''}
                onChange={(e) => setCustomInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustomWeight(key)
                  }
                }}
                placeholder={t('common:available_weights.add_placeholder')}
                className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => addCustomWeight(key)}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                <Plus size={12} />
                {t('common:available_weights.add_custom')}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
