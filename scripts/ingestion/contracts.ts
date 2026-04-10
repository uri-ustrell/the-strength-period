export const CANONICAL_MUSCLE_GROUPS = [
  'quadriceps',
  'isquiotibials',
  'glutis',
  'bessons',
  'tibial_anterior',
  'adductors',
  'abductors',
  'psoes',
  'pectoral',
  'dorsal',
  'trapezi',
  'deltoides',
  'biceps',
  'triceps',
  'avantbras',
  'abdominal',
  'oblics',
  'lumbar',
  'estabilitzadors_cadera',
  'mobilitat_cadera',
  'mobilitat_turmell',
  'mobilitat_toracica',
  'fascies',
] as const

export const CANONICAL_EQUIPMENT = [
  'pes_corporal',
  'manueles',
  'barra',
  'banda_elastica',
  'pilates',
  'trx',
] as const

export const CANONICAL_EXERCISE_TAGS = [
  'corredor',
  'pujada',
  'baixada',
  'velocitat',
  'rehab_genoll',
  'rehab_turmell',
  'rehab_lumbar',
  'tendinitis_rotuliana',
  'tendinitis_anserina',
  'core_estabilitat',
  'equilibri',
  'pliometria',
  'mobilitat',
  'escalfament',
  'tornada_calma',
] as const

export const CANONICAL_RESTRICTION_CONDITIONS = [
  'rehab_genoll',
  'rehab_lumbar',
  'rehab_turmell',
  'tendinitis_rotuliana',
] as const

export const CANONICAL_LEVELS = ['beginner', 'intermediate', 'expert'] as const

export const CANONICAL_CATEGORIES = [
  'strength',
  'mobility',
  'stability',
  'plyometrics',
  'cardio',
] as const

export const CANONICAL_PROGRESSION_METRICS = ['weight', 'reps', 'seconds'] as const

export const CANONICAL_PROGRESSION_TYPES = ['linear', 'undulating', 'block'] as const

export type MuscleGroup = (typeof CANONICAL_MUSCLE_GROUPS)[number]
export type Equipment = (typeof CANONICAL_EQUIPMENT)[number]
export type ExerciseTag = (typeof CANONICAL_EXERCISE_TAGS)[number]
export type RestrictionCondition = (typeof CANONICAL_RESTRICTION_CONDITIONS)[number]
export type ExerciseLevel = (typeof CANONICAL_LEVELS)[number]
export type ExerciseCategory = (typeof CANONICAL_CATEGORIES)[number]
export type ProgressionMetric = (typeof CANONICAL_PROGRESSION_METRICS)[number]
export type ProgressionType = (typeof CANONICAL_PROGRESSION_TYPES)[number]

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

export type CanonicalExercise = {
  id: string
  nameKey: string
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  equipment: Equipment[]
  level: ExerciseLevel
  category: ExerciseCategory
  estimatedSeriesDurationSeconds: number
  progressionMetric: ProgressionMetric
  tags: ExerciseTag[]
  restrictions: Restriction[]
  instructions: string[]
  images: ExerciseImage[]
}

// Mirror of src/types/planning.ts — keep in sync when modifying
export type PresetExerciseEntry = {
  exerciseId: string
  sets: number
  reps: number | [number, number]
  restSeconds: number
  tempo?: string
  rpe?: number
  notes?: string
}

// Mirror of src/types/planning.ts — keep in sync when modifying
export type PresetSessionTemplate = {
  label?: string
  exercises: PresetExerciseEntry[]
  isDeload?: boolean
}

export type CanonicalPreset = {
  id: string
  nameKey: string
  descriptionKey: string
  durationOptions: number[]
  muscleDistribution?: Partial<Record<MuscleGroup, number>>
  requiredTags: ExerciseTag[]
  autoRestrictions: RestrictionCondition[]
  progressionType: ProgressionType
  notes?: string
  sessions?: PresetSessionTemplate[]
  weeklyProgression?: number
}

export type SourceLicenseMetadata = {
  licenseName: string
  licenseUrl?: string
  allowsRedistribution: boolean
  allowsCommercialUse: boolean
  requiresAttribution: boolean
  attributionText?: string
  provenance: string
  verifiedAt: string
  verifiedBy: string
}

export type IngestionSourceDescriptor = {
  adapterId: string
  sourceId: string
  sourceType: 'external-api' | 'llm-json'
  sourceUrl?: string
  fetchedAt: string
}

export type ExerciseCandidateInput = {
  kind: 'exercise'
  sourceExternalId: string
  title: string
  aliases?: string[]
  primaryMuscles: string[]
  secondaryMuscles?: string[]
  equipment?: string[]
  level?: string | null
  category?: string | null
  estimatedSeriesDurationSeconds?: number
  progressionMetric?: string | null
  tags?: string[]
  restrictions?: Array<{
    condition: string
    action: string
    note?: string
  }>
  instructions?: string[]
  representativeImageUrl?: string
}

export type PresetCandidateInput = {
  kind: 'preset'
  sourceExternalId: string
  title: string
  description?: string
  durationOptions?: number[]
  muscleDistribution: Record<string, number>
  requiredTags?: string[]
  autoRestrictions?: string[]
  progressionType?: string | null
  notes?: string
  sessions?: Array<{
    label?: string
    exercises: Array<{
      exerciseId: string
      sets?: number
      reps?: number | [number, number]
      restSeconds?: number
      tempo?: string
      rpe?: number
      notes?: string
    }>
    isDeload?: boolean
  }>
  weeklyProgression?: number
}

export type IngestionCandidateInput = ExerciseCandidateInput | PresetCandidateInput

export type CandidateEnvelope = {
  candidateId: string
  source: IngestionSourceDescriptor
  license: SourceLicenseMetadata
  payload: IngestionCandidateInput
}

export type NormalizedExerciseCandidate = {
  kind: 'exercise'
  candidateId: string
  sourceExternalId: string
  source: IngestionSourceDescriptor
  license: SourceLicenseMetadata
  canonical: CanonicalExercise
  aliases: string[]
  confidence: number
  reviewReasons: string[]
  titleFingerprint: string
  slugFingerprint: string
}

export type NormalizedPresetCandidate = {
  kind: 'preset'
  candidateId: string
  sourceExternalId: string
  source: IngestionSourceDescriptor
  license: SourceLicenseMetadata
  canonical: CanonicalPreset
  aliases: string[]
  confidence: number
  reviewReasons: string[]
  titleFingerprint: string
  slugFingerprint: string
}

export type NormalizedCandidate = NormalizedExerciseCandidate | NormalizedPresetCandidate

export type ValidationIssue = {
  field: string
  message: string
}

export type ValidationResult = {
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

export type IngestionItemStatus = 'accepted' | 'skipped' | 'duplicate' | 'rejected'

export type IngestionReportItem = {
  candidateId: string
  kind: 'exercise' | 'preset'
  sourceId: string
  sourceExternalId: string
  status: IngestionItemStatus
  confidence: number
  reasons: string[]
  canonicalId?: string
  duplicateOf?: string
}

export type IngestionReport = {
  runId: string
  startedAt: string
  completedAt: string
  dryRun: boolean
  counts: {
    accepted: number
    skipped: number
    duplicate: number
    rejected: number
  }
  acceptedExerciseIds: string[]
  acceptedPresetIds: string[]
  reviewQueuePath?: string
  photosTriggered: boolean
  filesWritten: string[]
  sources: Array<{
    sourceId: string
    adapterId: string
    candidateCount: number
  }>
  items: IngestionReportItem[]
}

export type ReviewQueueItem = {
  candidateId: string
  kind: 'exercise' | 'preset'
  sourceId: string
  canonicalId: string
  confidence: number
  reasons: string[]
  suggestedAction: 'accept' | 'reject'
}

export type ReviewQueue = {
  runId: string
  createdAt: string
  items: ReviewQueueItem[]
}

export type ReviewDecision = 'accept' | 'reject'

export type ReviewDecisionMap = Record<string, ReviewDecision>

export type SourceRegistry = {
  exercises: Record<string, string>
  presets: Record<string, string>
}

export type AliasMap = {
  aliases: Record<string, string>
}

export type ExerciseCatalogEntry = CanonicalExercise & {
  ingestionMeta?: {
    sourceRecords: Array<{
      sourceId: string
      sourceExternalId: string
      adapterId: string
      ingestedAt: string
      licenseName: string
      provenance: string
    }>
  }
}

export type PresetCatalogEntry = CanonicalPreset & {
  ingestionMeta?: {
    sourceRecords: Array<{
      sourceId: string
      sourceExternalId: string
      adapterId: string
      ingestedAt: string
      licenseName: string
      provenance: string
    }>
  }
}

export type SourceRunConfig = {
  adapter: string
  sourceId: string
  sourceType: 'external-api' | 'llm-json'
  input: string
  sourceUrl?: string
  license: SourceLicenseMetadata
  options?: Record<string, unknown>
}

export type IngestionConfigFile = {
  sources: SourceRunConfig[]
}

export type SourceAdapter = {
  id: string
  description: string
  fetchCandidates: (config: SourceRunConfig) => Promise<CandidateEnvelope[]>
}

export type MergeWriteResult = {
  targetPath: string
  backupPath?: string
  written: boolean
}
