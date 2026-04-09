export type MuscleGroup =
  | 'quadriceps'
  | 'isquiotibials'
  | 'glutis'
  | 'bessons'
  | 'tibial_anterior'
  | 'adductors'
  | 'abductors'
  | 'psoes'
  | 'pectoral'
  | 'dorsal'
  | 'trapezi'
  | 'deltoides'
  | 'biceps'
  | 'triceps'
  | 'avantbras'
  | 'abdominal'
  | 'oblics'
  | 'lumbar'
  | 'estabilitzadors_cadera'
  | 'mobilitat_cadera'
  | 'mobilitat_turmell'
  | 'mobilitat_toracica'
  | 'fascies'

export type Equipment = 'pes_corporal' | 'manueles' | 'barra' | 'banda_elastica' | 'pilates' | 'trx'

export type ExerciseTag =
  | 'corredor'
  | 'pujada'
  | 'baixada'
  | 'velocitat'
  | 'rehab_genoll'
  | 'rehab_turmell'
  | 'rehab_lumbar'
  | 'tendinitis_rotuliana'
  | 'tendinitis_anserina'
  | 'core_estabilitat'
  | 'equilibri'
  | 'pliometria'
  | 'mobilitat'
  | 'escalfament'
  | 'tornada_calma'

export type ProgressionMetric = 'weight' | 'reps' | 'seconds'

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type RestrictionCondition =
  | 'rehab_genoll'
  | 'rehab_lumbar'
  | 'rehab_turmell'
  | 'tendinitis_rotuliana'

export const ALL_RESTRICTION_CONDITIONS: RestrictionCondition[] = [
  'rehab_genoll',
  'rehab_lumbar',
  'rehab_turmell',
  'tendinitis_rotuliana',
]

export type Restriction = {
  condition: RestrictionCondition
  action: 'avoid' | 'modify'
  note?: string
}

export type ExerciseImage = {
  url: string
  alt: string
  isRepresentative: boolean
}

export type Exercise = {
  id: string
  nameKey: string
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  equipment: Equipment[]
  level: 'beginner' | 'intermediate' | 'expert'
  category: 'strength' | 'mobility' | 'stability' | 'plyometrics' | 'cardio'
  estimatedSeriesDurationSeconds: number
  progressionMetric: ProgressionMetric
  tags: ExerciseTag[]
  restrictions: Restriction[]
  rehabNotesKey?: string
  instructions: string[]
  images: ExerciseImage[]
}
