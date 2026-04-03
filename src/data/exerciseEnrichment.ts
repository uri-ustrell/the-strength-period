import type { ExerciseTag, Restriction } from '@/types/exercise'

export type EnrichmentData = {
  nameKey: string
  tags: ExerciseTag[]
  restrictions: Restriction[]
  category: 'strength' | 'mobility' | 'stability' | 'plyometrics' | 'cardio'
  estimatedSeriesDurationSeconds: number
}

export const exerciseEnrichment: Record<string, EnrichmentData> = {
  // =============================================
  // LOWER BODY (25 exercises)
  // =============================================
  Barbell_Squat: {
    nameKey: 'exercises:Barbell_Squat',
    tags: ['corredor', 'pujada'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'modify', note: 'Limitar profunditat, evitar rebots' },
      { condition: 'rehab_genoll', action: 'modify', note: 'Reduir càrrega, controlar ROM' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Barbell_Deadlift: {
    nameKey: 'exercises:Barbell_Deadlift',
    tags: ['corredor', 'pujada'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Mantenir esquena neutra, reduir càrrega' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Leg_Press: {
    nameKey: 'exercises:Leg_Press',
    tags: ['corredor', 'pujada'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'modify', note: 'Evitar flexió profunda de genoll' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Dumbbell_Lunges: {
    nameKey: 'exercises:Dumbbell_Lunges',
    tags: ['corredor', 'pujada', 'baixada', 'equilibri'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'modify', note: 'Passos curts, evitar impacte' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Romanian_Deadlift: {
    nameKey: 'exercises:Romanian_Deadlift',
    tags: ['corredor', 'pujada'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Mantenir esquena neutra' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Leg_Extensions: {
    nameKey: 'exercises:Leg_Extensions',
    tags: ['corredor', 'rehab_genoll'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'modify', note: 'Rang parcial, evitar extensió completa amb càrrega' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Lying_Leg_Curls: {
    nameKey: 'exercises:Lying_Leg_Curls',
    tags: ['corredor', 'velocitat'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Standing_Calf_Raises: {
    nameKey: 'exercises:Standing_Calf_Raises',
    tags: ['corredor', 'pujada', 'rehab_turmell'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Seated_Calf_Raise: {
    nameKey: 'exercises:Seated_Calf_Raise',
    tags: ['corredor', 'rehab_turmell'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Barbell_Step_Ups: {
    nameKey: 'exercises:Barbell_Step_Ups',
    tags: ['corredor', 'pujada', 'equilibri'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'modify', note: 'Reduir alçada del banc' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Split_Squat_with_Dumbbells: {
    nameKey: 'exercises:Split_Squat_with_Dumbbells',
    tags: ['corredor', 'pujada', 'baixada', 'equilibri'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'modify', note: 'Limitar profunditat' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Sumo_Deadlift: {
    nameKey: 'exercises:Sumo_Deadlift',
    tags: ['corredor'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Mantenir esquena neutra' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Front_Barbell_Squat: {
    nameKey: 'exercises:Front_Barbell_Squat',
    tags: ['corredor', 'pujada'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'modify', note: 'Controlar profunditat' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Goblet_Squat: {
    nameKey: 'exercises:Goblet_Squat',
    tags: ['corredor', 'escalfament'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Bodyweight_Walking_Lunge: {
    nameKey: 'exercises:Bodyweight_Walking_Lunge',
    tags: ['corredor', 'escalfament', 'equilibri'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Bodyweight_Squat: {
    nameKey: 'exercises:Bodyweight_Squat',
    tags: ['corredor', 'escalfament'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Barbell_Glute_Bridge: {
    nameKey: 'exercises:Barbell_Glute_Bridge',
    tags: ['corredor', 'pujada', 'rehab_genoll'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Barbell_Hip_Thrust: {
    nameKey: 'exercises:Barbell_Hip_Thrust',
    tags: ['corredor', 'pujada', 'velocitat'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Glute_Ham_Raise: {
    nameKey: 'exercises:Glute_Ham_Raise',
    tags: ['corredor', 'velocitat', 'rehab_genoll'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'modify', note: 'Reduir rang si hi ha dolor' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Good_Morning: {
    nameKey: 'exercises:Good_Morning',
    tags: ['corredor'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'avoid', note: 'Alt estrès lumbar' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Single_Leg_Glute_Bridge: {
    nameKey: 'exercises:Single_Leg_Glute_Bridge',
    tags: ['corredor', 'rehab_genoll', 'equilibri'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  'Stiff-Legged_Barbell_Deadlift': {
    nameKey: 'exercises:Stiff-Legged_Barbell_Deadlift',
    tags: ['corredor', 'velocitat'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Reduir càrrega, mantenir esquena neutra' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Standing_Leg_Curl: {
    nameKey: 'exercises:Standing_Leg_Curl',
    tags: ['corredor', 'velocitat'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Barbell_Lunge: {
    nameKey: 'exercises:Barbell_Lunge',
    tags: ['corredor', 'pujada', 'baixada'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'modify', note: 'Passos curts, controlar descens' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  'Calf_Raises_-_With_Bands': {
    nameKey: 'exercises:Calf_Raises_-_With_Bands',
    tags: ['corredor', 'rehab_turmell', 'escalfament'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 35,
  },

  // =============================================
  // CORE (17 exercises)
  // =============================================
  Plank: {
    nameKey: 'exercises:Plank',
    tags: ['core_estabilitat', 'corredor', 'escalfament'],
    restrictions: [],
    category: 'stability',
    estimatedSeriesDurationSeconds: 45,
  },
  'Push_Up_to_Side_Plank': {
    nameKey: 'exercises:Push_Up_to_Side_Plank',
    tags: ['core_estabilitat', 'corredor'],
    restrictions: [],
    category: 'stability',
    estimatedSeriesDurationSeconds: 45,
  },
  Hanging_Leg_Raise: {
    nameKey: 'exercises:Hanging_Leg_Raise',
    tags: ['core_estabilitat'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Flexionar genolls, evitar extensió excessiva' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Ab_Roller: {
    nameKey: 'exercises:Ab_Roller',
    tags: ['core_estabilitat'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Limitar rang, mantenir core activat' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Russian_Twist: {
    nameKey: 'exercises:Russian_Twist',
    tags: ['core_estabilitat', 'corredor'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Reduir rotació i càrrega' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Air_Bike: {
    nameKey: 'exercises:Air_Bike',
    tags: ['core_estabilitat', 'corredor'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Dead_Bug: {
    nameKey: 'exercises:Dead_Bug',
    tags: ['core_estabilitat', 'corredor', 'rehab_lumbar', 'escalfament'],
    restrictions: [],
    category: 'stability',
    estimatedSeriesDurationSeconds: 40,
  },
  Mountain_Climbers: {
    nameKey: 'exercises:Mountain_Climbers',
    tags: ['core_estabilitat', 'corredor', 'escalfament', 'pliometria'],
    restrictions: [],
    category: 'cardio',
    estimatedSeriesDurationSeconds: 35,
  },
  Pallof_Press: {
    nameKey: 'exercises:Pallof_Press',
    tags: ['core_estabilitat', 'corredor', 'rehab_lumbar'],
    restrictions: [],
    category: 'stability',
    estimatedSeriesDurationSeconds: 40,
  },
  Decline_Crunch: {
    nameKey: 'exercises:Decline_Crunch',
    tags: ['core_estabilitat'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Reduir rang de moviment' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Reverse_Crunch: {
    nameKey: 'exercises:Reverse_Crunch',
    tags: ['core_estabilitat', 'corredor'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 35,
  },
  Flutter_Kicks: {
    nameKey: 'exercises:Flutter_Kicks',
    tags: ['core_estabilitat', 'corredor'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Mantenir lumbar a terra' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 35,
  },
  'Jackknife_Sit-Up': {
    nameKey: 'exercises:Jackknife_Sit-Up',
    tags: ['core_estabilitat'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Reduir amplitud' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Alternate_Heel_Touchers: {
    nameKey: 'exercises:Alternate_Heel_Touchers',
    tags: ['core_estabilitat', 'corredor'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 35,
  },
  Crunches: {
    nameKey: 'exercises:Crunches',
    tags: ['core_estabilitat'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 35,
  },
  Superman: {
    nameKey: 'exercises:Superman',
    tags: ['core_estabilitat', 'corredor', 'rehab_lumbar'],
    restrictions: [],
    category: 'stability',
    estimatedSeriesDurationSeconds: 35,
  },
  'Cross-Body_Crunch': {
    nameKey: 'exercises:Cross-Body_Crunch',
    tags: ['core_estabilitat', 'corredor'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 35,
  },

  // =============================================
  // MOBILITY (14 exercises)
  // =============================================
  Hip_Circles_prone: {
    nameKey: 'exercises:Hip_Circles_prone',
    tags: ['mobilitat', 'escalfament', 'corredor'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },
  Standing_Hip_Circles: {
    nameKey: 'exercises:Standing_Hip_Circles',
    tags: ['mobilitat', 'escalfament', 'corredor'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },
  Cat_Stretch: {
    nameKey: 'exercises:Cat_Stretch',
    tags: ['mobilitat', 'escalfament', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },
  Ankle_Circles: {
    nameKey: 'exercises:Ankle_Circles',
    tags: ['mobilitat', 'escalfament', 'rehab_turmell'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },
  Childs_Pose: {
    nameKey: 'exercises:Childs_Pose',
    tags: ['mobilitat', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },
  Kneeling_Hip_Flexor: {
    nameKey: 'exercises:Kneeling_Hip_Flexor',
    tags: ['mobilitat', 'corredor', 'escalfament'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 35,
  },
  Groin_and_Back_Stretch: {
    nameKey: 'exercises:Groin_and_Back_Stretch',
    tags: ['mobilitat', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },
  IT_Band_and_Glute_Stretch: {
    nameKey: 'exercises:IT_Band_and_Glute_Stretch',
    tags: ['mobilitat', 'corredor', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },
  Adductor_Groin: {
    nameKey: 'exercises:Adductor_Groin',
    tags: ['mobilitat', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },
  '90_90_Hamstring': {
    nameKey: 'exercises:90_90_Hamstring',
    tags: ['mobilitat', 'corredor', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },
  Intermediate_Hip_Flexor_and_Quad_Stretch: {
    nameKey: 'exercises:Intermediate_Hip_Flexor_and_Quad_Stretch',
    tags: ['mobilitat', 'corredor', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },
  Standing_Hip_Flexors: {
    nameKey: 'exercises:Standing_Hip_Flexors',
    tags: ['mobilitat', 'corredor', 'escalfament'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },
  All_Fours_Quad_Stretch: {
    nameKey: 'exercises:All_Fours_Quad_Stretch',
    tags: ['mobilitat', 'corredor', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },
  Dancers_Stretch: {
    nameKey: 'exercises:Dancers_Stretch',
    tags: ['mobilitat', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },

  // =============================================
  // UPPER BODY (20 exercises)
  // =============================================
  'Barbell_Bench_Press_-_Medium_Grip': {
    nameKey: 'exercises:Barbell_Bench_Press_-_Medium_Grip',
    tags: [],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Standing_Military_Press: {
    nameKey: 'exercises:Standing_Military_Press',
    tags: ['corredor'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Fer assegut per reduir estrès lumbar' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Pullups: {
    nameKey: 'exercises:Pullups',
    tags: ['corredor'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Bent_Over_Barbell_Row: {
    nameKey: 'exercises:Bent_Over_Barbell_Row',
    tags: ['corredor'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Reduir inclinació del tronc' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Dumbbell_Bench_Press: {
    nameKey: 'exercises:Dumbbell_Bench_Press',
    tags: [],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Pushups: {
    nameKey: 'exercises:Pushups',
    tags: ['corredor', 'escalfament', 'core_estabilitat'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  'Dips_-_Chest_Version': {
    nameKey: 'exercises:Dips_-_Chest_Version',
    tags: [],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Dumbbell_Shoulder_Press: {
    nameKey: 'exercises:Dumbbell_Shoulder_Press',
    tags: [],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  'Wide-Grip_Lat_Pulldown': {
    nameKey: 'exercises:Wide-Grip_Lat_Pulldown',
    tags: ['corredor'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Seated_Cable_Rows: {
    nameKey: 'exercises:Seated_Cable_Rows',
    tags: ['corredor'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Dumbbell_Flyes: {
    nameKey: 'exercises:Dumbbell_Flyes',
    tags: [],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Side_Lateral_Raise: {
    nameKey: 'exercises:Side_Lateral_Raise',
    tags: [],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Face_Pull: {
    nameKey: 'exercises:Face_Pull',
    tags: ['corredor', 'rehab_lumbar'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Dumbbell_Bicep_Curl: {
    nameKey: 'exercises:Dumbbell_Bicep_Curl',
    tags: [],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Triceps_Pushdown: {
    nameKey: 'exercises:Triceps_Pushdown',
    tags: [],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  'Chin-Up': {
    nameKey: 'exercises:Chin-Up',
    tags: ['corredor'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Bench_Dips: {
    nameKey: 'exercises:Bench_Dips',
    tags: ['corredor'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  'One-Arm_Dumbbell_Row': {
    nameKey: 'exercises:One-Arm_Dumbbell_Row',
    tags: ['corredor'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Arnold_Dumbbell_Press: {
    nameKey: 'exercises:Arnold_Dumbbell_Press',
    tags: [],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 50,
  },
  Band_Pull_Apart: {
    nameKey: 'exercises:Band_Pull_Apart',
    tags: ['corredor', 'escalfament', 'rehab_lumbar'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 35,
  },

  // =============================================
  // REHAB / STABILITY (16 exercises)
  // =============================================
  Butt_Lift_Bridge: {
    nameKey: 'exercises:Butt_Lift_Bridge',
    tags: ['rehab_genoll', 'rehab_lumbar', 'corredor', 'escalfament'],
    restrictions: [],
    category: 'stability',
    estimatedSeriesDurationSeconds: 35,
  },
  Band_Hip_Adductions: {
    nameKey: 'exercises:Band_Hip_Adductions',
    tags: ['rehab_genoll', 'tendinitis_anserina', 'corredor'],
    restrictions: [],
    category: 'stability',
    estimatedSeriesDurationSeconds: 35,
  },
  Thigh_Abductor: {
    nameKey: 'exercises:Thigh_Abductor',
    tags: ['rehab_genoll', 'corredor', 'equilibri'],
    restrictions: [],
    category: 'stability',
    estimatedSeriesDurationSeconds: 35,
  },
  Thigh_Adductor: {
    nameKey: 'exercises:Thigh_Adductor',
    tags: ['rehab_genoll', 'tendinitis_anserina', 'corredor'],
    restrictions: [],
    category: 'stability',
    estimatedSeriesDurationSeconds: 35,
  },
  Balance_Board: {
    nameKey: 'exercises:Balance_Board',
    tags: ['rehab_turmell', 'rehab_genoll', 'equilibri', 'corredor'],
    restrictions: [],
    category: 'stability',
    estimatedSeriesDurationSeconds: 40,
  },
  Ball_Leg_Curl: {
    nameKey: 'exercises:Ball_Leg_Curl',
    tags: ['rehab_genoll', 'corredor', 'core_estabilitat'],
    restrictions: [],
    category: 'stability',
    estimatedSeriesDurationSeconds: 40,
  },
  Adductor: {
    nameKey: 'exercises:Adductor',
    tags: ['rehab_genoll', 'tendinitis_anserina', 'mobilitat', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 35,
  },
  Band_Good_Morning: {
    nameKey: 'exercises:Band_Good_Morning',
    tags: ['rehab_lumbar', 'corredor', 'escalfament'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Usar banda lleugera, control postural' },
    ],
    category: 'stability',
    estimatedSeriesDurationSeconds: 35,
  },
  'Hyperextensions_Back_Extensions': {
    nameKey: 'exercises:Hyperextensions_Back_Extensions',
    tags: ['rehab_lumbar', 'corredor'],
    restrictions: [
      { condition: 'rehab_lumbar', action: 'modify', note: 'Evitar hiperextensió, rang controlat' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },
  Side_Lying_Groin_Stretch: {
    nameKey: 'exercises:Side_Lying_Groin_Stretch',
    tags: ['rehab_genoll', 'tendinitis_anserina', 'mobilitat', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 30,
  },
  'Piriformis-SMR': {
    nameKey: 'exercises:Piriformis-SMR',
    tags: ['rehab_lumbar', 'corredor', 'mobilitat', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 35,
  },
  'Calves-SMR': {
    nameKey: 'exercises:Calves-SMR',
    tags: ['rehab_turmell', 'corredor', 'mobilitat', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 35,
  },
  'Quadriceps-SMR': {
    nameKey: 'exercises:Quadriceps-SMR',
    tags: ['rehab_genoll', 'tendinitis_rotuliana', 'corredor', 'mobilitat', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 35,
  },
  'Lower_Back-SMR': {
    nameKey: 'exercises:Lower_Back-SMR',
    tags: ['rehab_lumbar', 'corredor', 'mobilitat', 'tornada_calma'],
    restrictions: [],
    category: 'mobility',
    estimatedSeriesDurationSeconds: 35,
  },
  Crossover_Reverse_Lunge: {
    nameKey: 'exercises:Crossover_Reverse_Lunge',
    tags: ['rehab_genoll', 'corredor', 'equilibri'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'modify', note: 'Reduir profunditat' },
    ],
    category: 'strength',
    estimatedSeriesDurationSeconds: 45,
  },
  Prone_Manual_Hamstring: {
    nameKey: 'exercises:Prone_Manual_Hamstring',
    tags: ['rehab_genoll', 'corredor', 'velocitat'],
    restrictions: [],
    category: 'strength',
    estimatedSeriesDurationSeconds: 40,
  },

  // =============================================
  // PLYOMETRICS (5 exercises)
  // =============================================
  Box_Jump_Multiple_Response: {
    nameKey: 'exercises:Box_Jump_Multiple_Response',
    tags: ['pliometria', 'corredor', 'velocitat', 'pujada'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'avoid', note: 'Impacte alt sobre tendó rotulià' },
      { condition: 'rehab_genoll', action: 'avoid', note: 'Impacte alt sobre articulació' },
      { condition: 'rehab_turmell', action: 'avoid', note: 'Impacte alt sobre turmell' },
    ],
    category: 'plyometrics',
    estimatedSeriesDurationSeconds: 35,
  },
  Front_Box_Jump: {
    nameKey: 'exercises:Front_Box_Jump',
    tags: ['pliometria', 'corredor', 'velocitat'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'avoid', note: 'Impacte alt' },
      { condition: 'rehab_genoll', action: 'avoid', note: 'Impacte alt' },
    ],
    category: 'plyometrics',
    estimatedSeriesDurationSeconds: 35,
  },
  Frog_Hops: {
    nameKey: 'exercises:Frog_Hops',
    tags: ['pliometria', 'corredor', 'velocitat'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'avoid', note: 'Alt impacte articular' },
      { condition: 'rehab_genoll', action: 'avoid', note: 'Alt impacte articular' },
    ],
    category: 'plyometrics',
    estimatedSeriesDurationSeconds: 35,
  },
  Knee_Tuck_Jump: {
    nameKey: 'exercises:Knee_Tuck_Jump',
    tags: ['pliometria', 'corredor', 'velocitat'],
    restrictions: [
      { condition: 'tendinitis_rotuliana', action: 'avoid', note: 'Impacte alt' },
      { condition: 'rehab_genoll', action: 'avoid', note: 'Impacte alt' },
    ],
    category: 'plyometrics',
    estimatedSeriesDurationSeconds: 35,
  },
  'Single_Leg_Push-off': {
    nameKey: 'exercises:Single_Leg_Push-off',
    tags: ['pliometria', 'corredor', 'velocitat', 'pujada', 'equilibri'],
    restrictions: [
      { condition: 'rehab_turmell', action: 'modify', note: 'Reduir alçada i impacte' },
    ],
    category: 'plyometrics',
    estimatedSeriesDurationSeconds: 35,
  },
}
