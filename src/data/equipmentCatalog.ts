import type { Equipment } from '@/types/exercise'

export type EquipmentCategory =
  | 'bodyweight'
  | 'free_weights'
  | 'bands'
  | 'suspension'
  | 'cardio'
  | 'mobility'
  | 'stability'
  | 'calisthenics'

export interface EquipmentCategoryGroup {
  category: EquipmentCategory
  items: Equipment[]
}

export const EQUIPMENT_CATALOG: EquipmentCategoryGroup[] = [
  { category: 'bodyweight', items: ['pes_corporal'] },
  {
    category: 'free_weights',
    items: ['manueles', 'kettlebell', 'barra', 'discos', 'weight_vest'],
  },
  { category: 'bands', items: ['banda_elastica', 'mini_band', 'banda_tubular'] },
  { category: 'suspension', items: ['trx', 'barra_dominades', 'anelles'] },
  { category: 'cardio', items: ['corda', 'comba', 'step', 'bicicleta', 'cinta'] },
  { category: 'mobility', items: ['foam_roller', 'pilota_massatge', 'mat'] },
  { category: 'stability', items: ['fitball', 'bosu', 'plataforma_inestable'] },
  { category: 'calisthenics', items: ['paralettes', 'plyo_box', 'sandbag'] },
]

export const ALL_EQUIPMENT: Equipment[] = EQUIPMENT_CATALOG.flatMap((g) => g.items)

export const DEFAULT_VISIBLE_COUNT = 8
