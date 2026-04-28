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

export type Equipment =
  // Bodyweight
  | 'pes_corporal'
  // Free weights
  | 'manueles'
  | 'kettlebell'
  | 'barra'
  | 'discos'
  | 'weight_vest'
  // Bands & elastics
  | 'banda_elastica'
  | 'mini_band'
  | 'banda_tubular'
  // Suspension & bars
  | 'trx'
  | 'barra_dominades'
  | 'anelles'
  // Cardio
  | 'corda'
  | 'comba'
  | 'step'
  | 'bicicleta'
  | 'cinta'
  // Mobility & recovery
  | 'foam_roller'
  | 'pilota_massatge'
  | 'mat'
  // Stability
  | 'fitball'
  | 'bosu'
  | 'plataforma_inestable'
  // Calisthenics / other
  | 'paralettes'
  | 'plyo_box'
  | 'sandbag'

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
  // Strength & hypertrophy
  | 'forca'
  | 'hipertrofia'
  | 'potencia'
  | 'resistencia'
  // Mobility / yoga / breath
  | 'iogues'
  | 'respiracio'
  | 'mobilitat_toracica'
  | 'anti_rotacio'
  // Pre/postnatal
  | 'gestacio'
  | 'postpart'
  | 'sol_pelvic'
  // Other
  | 'prehab'
  | 'unilateral'
  | 'isometric'

export type ProgressionMetric = 'weight' | 'reps' | 'seconds'

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type RestrictionCondition =
  | 'rehab_genoll'
  | 'rehab_lumbar'
  | 'rehab_turmell'
  | 'tendinitis_rotuliana'
  | 'tendinitis_aquilea'
  | 'lesio_lumbar_aguda'
  | 'embaras'
  | 'postpart'
  | 'diastasi'
  | 'hipertensio'

export const ALL_RESTRICTION_CONDITIONS: RestrictionCondition[] = [
  'rehab_genoll',
  'rehab_lumbar',
  'rehab_turmell',
  'tendinitis_rotuliana',
  'tendinitis_aquilea',
  'lesio_lumbar_aguda',
  'embaras',
  'postpart',
  'diastasi',
  'hipertensio',
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
