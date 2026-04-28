import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DEFAULT_VISIBLE_COUNT,
  EQUIPMENT_CATALOG,
  type EquipmentCategoryGroup,
} from '@/data/equipmentCatalog'
import type { Equipment } from '@/types/exercise'

interface Props {
  selected: Equipment[]
  onChange: (next: Equipment[]) => void
}

export const EquipmentChipSelector = ({ selected, onChange }: Props) => {
  const { t } = useTranslation(['onboarding', 'planning'])
  const [expanded, setExpanded] = useState(false)

  const toggle = (item: Equipment) => {
    if (selected.includes(item)) {
      onChange(selected.filter((e) => e !== item))
    } else {
      onChange([...selected, item])
    }
  }

  // Build a flat list with category meta to slice by visible count.
  const flat: Array<{ item: Equipment; category: EquipmentCategoryGroup['category'] }> = []
  for (const group of EQUIPMENT_CATALOG) {
    for (const item of group.items) {
      flat.push({ item, category: group.category })
    }
  }

  const visibleFlat = expanded ? flat : flat.slice(0, DEFAULT_VISIBLE_COUNT)

  // Re-group visible items, preserving catalog category order.
  const visibleByCategory = EQUIPMENT_CATALOG.map((group) => ({
    category: group.category,
    items: group.items.filter((it) => visibleFlat.some((v) => v.item === it)),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-3">
      {visibleByCategory.map((group) => (
        <div key={group.category}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t(`onboarding:equipment_category_${group.category}`)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => {
              const isSelected = selected.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggle(item)}
                  aria-pressed={isSelected}
                  className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {t(`onboarding:equipment.${item}`)}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {flat.length > DEFAULT_VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          {expanded ? (
            <>
              <ChevronUp size={14} />
              {t('onboarding:equipment_show_less')}
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              {t('onboarding:equipment_show_more')}
            </>
          )}
        </button>
      )}
    </div>
  )
}
