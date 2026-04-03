import type { MuscleGroup, ExerciseTag } from '@/types/exercise'
import type { UserProfile } from '@/types/user'
import type { ProgressionType } from '@/types/planning'

export interface CustomPreset {
  id: string
  name: string
  durationWeeks: number
  muscleDistribution: Partial<Record<MuscleGroup, number>>
  createdAt: string
}

export interface Preset {
  id: string
  nameKey: string
  descriptionKey: string
  durationOptions: number[]
  muscleDistribution: Partial<Record<MuscleGroup, number>>
  requiredTags: ExerciseTag[]
  autoRestrictions: string[]
  progressionType: ProgressionType
  profiles: UserProfile[]
  notes?: string
}

export const PRESETS: Preset[] = [
  {
    id: 'corredor_general',
    nameKey: 'planning:presets.corredor_general',
    descriptionKey: 'planning:presets.corredor_general_desc',
    durationOptions: [6, 8, 12],
    muscleDistribution: { glutis: 30, quadriceps: 25, isquiotibials: 20, bessons: 10, abdominal: 15 },
    requiredTags: ['corredor'],
    autoRestrictions: [],
    progressionType: 'linear',
    profiles: ['athlete', 'general'],
  },
  {
    id: 'pujada',
    nameKey: 'planning:presets.pujada',
    descriptionKey: 'planning:presets.pujada_desc',
    durationOptions: [6, 8],
    muscleDistribution: { glutis: 35, quadriceps: 30, psoes: 10, bessons: 10, abdominal: 15 },
    requiredTags: ['pujada'],
    autoRestrictions: [],
    progressionType: 'linear',
    profiles: ['athlete'],
  },
  {
    id: 'rehab_tendinitis_anserina',
    nameKey: 'planning:presets.rehab_tendinitis_anserina',
    descriptionKey: 'planning:presets.rehab_tendinitis_anserina_desc',
    durationOptions: [8, 12],
    muscleDistribution: { isquiotibials: 25, adductors: 20, quadriceps: 20, glutis: 20, mobilitat_cadera: 15 },
    requiredTags: ['tendinitis_anserina'],
    autoRestrictions: ['tendinitis_anserina'],
    progressionType: 'linear',
    profiles: ['rehab'],
  },
  {
    id: 'forca_general',
    nameKey: 'planning:presets.forca_general',
    descriptionKey: 'planning:presets.forca_general_desc',
    durationOptions: [8, 12],
    muscleDistribution: { quadriceps: 15, glutis: 15, isquiotibials: 10, pectoral: 12, dorsal: 13, abdominal: 15, mobilitat_cadera: 10, deltoides: 10 },
    requiredTags: [],
    autoRestrictions: [],
    progressionType: 'undulating',
    profiles: ['athlete', 'general'],
  },
  {
    id: 'mobilitat_prevencio',
    nameKey: 'planning:presets.mobilitat_prevencio',
    descriptionKey: 'planning:presets.mobilitat_prevencio_desc',
    durationOptions: [4, 6, 8],
    muscleDistribution: { mobilitat_cadera: 25, mobilitat_toracica: 20, mobilitat_turmell: 15, estabilitzadors_cadera: 20, fascies: 10, abdominal: 10 },
    requiredTags: ['mobilitat'],
    autoRestrictions: [],
    progressionType: 'linear',
    profiles: ['athlete', 'rehab', 'general'],
  },
]

export function getPresetsForProfile(profile: UserProfile): Preset[] {
  return PRESETS.filter((p) => p.profiles.includes(profile))
}

export function getPresetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id)
}
