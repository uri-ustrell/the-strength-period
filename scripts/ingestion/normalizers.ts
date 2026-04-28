import type {
  CandidateEnvelope,
  CanonicalPreset,
  Equipment,
  ExerciseCategory,
  ExerciseLevel,
  ExerciseTag,
  MuscleGroup,
  NormalizedCandidate,
  NormalizedExerciseCandidate,
  NormalizedPresetCandidate,
  PresetCandidateInput,
  PresetExerciseEntry,
  PresetSessionTemplate,
  ProgressionMetric,
  ProgressionType,
  Restriction,
  RestrictionCondition,
} from './contracts'
import {
  CANONICAL_EQUIPMENT,
  CANONICAL_EXERCISE_TAGS,
  CANONICAL_LEVELS,
  CANONICAL_MUSCLE_GROUPS,
  CANONICAL_PROGRESSION_METRICS,
  CANONICAL_PROGRESSION_TYPES,
  CANONICAL_RESTRICTION_CONDITIONS,
} from './contracts'
import { clampNumber, ensurePositiveInteger, normalizeText, slugify, uniqueArray } from './utils'

const MUSCLE_ALIASES: Record<string, MuscleGroup> = {
  quadriceps: 'quadriceps',
  hamstrings: 'isquiotibials',
  isquiotibials: 'isquiotibials',
  glutes: 'glutis',
  glutis: 'glutis',
  calves: 'bessons',
  bessons: 'bessons',
  tibial_anterior: 'tibial_anterior',
  adductors: 'adductors',
  abductors: 'abductors',
  psoes: 'psoes',
  chest: 'pectoral',
  pectoral: 'pectoral',
  lats: 'dorsal',
  dorsal: 'dorsal',
  traps: 'trapezi',
  trapezi: 'trapezi',
  shoulders: 'deltoides',
  deltoides: 'deltoides',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'avantbras',
  avantbras: 'avantbras',
  abdominals: 'abdominal',
  abdominal: 'abdominal',
  obliques: 'oblics',
  oblics: 'oblics',
  lumbar: 'lumbar',
  lower_back: 'lumbar',
  hip_stabilizers: 'estabilitzadors_cadera',
  estabilitzadors_cadera: 'estabilitzadors_cadera',
  hip_mobility: 'mobilitat_cadera',
  mobilitat_cadera: 'mobilitat_cadera',
  ankle_mobility: 'mobilitat_turmell',
  mobilitat_turmell: 'mobilitat_turmell',
  thoracic_mobility: 'mobilitat_toracica',
  mobilitat_toracica: 'mobilitat_toracica',
  fascia: 'fascies',
  fascies: 'fascies',
}

const EQUIPMENT_ALIASES: Record<string, Equipment> = {
  // Bodyweight
  body_only: 'pes_corporal',
  bodyweight: 'pes_corporal',
  pes_corporal: 'pes_corporal',
  // Free weights
  dumbbell: 'manueles',
  dumbbells: 'manueles',
  manuelles: 'manueles',
  mancuernas: 'manueles',
  manueles: 'manueles',
  kettlebell: 'kettlebell',
  kettlebells: 'kettlebell',
  kb: 'kettlebell',
  barbell: 'barra',
  barra: 'barra',
  discos: 'discos',
  plates: 'discos',
  weight_vest: 'weight_vest',
  weighted_vest: 'weight_vest',
  // Bands
  bands: 'banda_elastica',
  resistance_band: 'banda_elastica',
  banda_elastica: 'banda_elastica',
  mini_band: 'mini_band',
  mini_bands: 'mini_band',
  banda_tubular: 'banda_tubular',
  // Suspension & bars
  trx: 'trx',
  suspension: 'trx',
  pull_up_bar: 'barra_dominades',
  barra_dominades: 'barra_dominades',
  rings: 'anelles',
  anelles: 'anelles',
  // Cardio
  rope: 'corda',
  corda: 'corda',
  jump_rope: 'comba',
  comba: 'comba',
  step: 'step',
  bicicleta: 'bicicleta',
  bike: 'bicicleta',
  cinta: 'cinta',
  treadmill: 'cinta',
  // Mobility & recovery
  foam_roller: 'foam_roller',
  foam_roll: 'foam_roller',
  pilota_massatge: 'pilota_massatge',
  massage_ball: 'pilota_massatge',
  mat: 'mat',
  yoga_mat: 'mat',
  // Stability
  fitball: 'fitball',
  exercise_ball: 'fitball',
  swiss_ball: 'fitball',
  bosu: 'bosu',
  plataforma_inestable: 'plataforma_inestable',
  // Other
  paralettes: 'paralettes',
  plyo_box: 'plyo_box',
  box: 'plyo_box',
  sandbag: 'sandbag',
  // Legacy
  pilates: 'pilates',
  // Cable / machines: no canonical match yet — fall back to barra to retain a load metric
  cable: 'barra',
  machine: 'barra',
}

const TAG_ALIASES: Record<string, ExerciseTag> = {
  corredor: 'corredor',
  runner: 'corredor',
  pujada: 'pujada',
  uphill: 'pujada',
  baixada: 'baixada',
  downhill: 'baixada',
  velocitat: 'velocitat',
  speed: 'velocitat',
  rehab_genoll: 'rehab_genoll',
  rehab_turmell: 'rehab_turmell',
  rehab_lumbar: 'rehab_lumbar',
  tendinitis_rotuliana: 'tendinitis_rotuliana',
  tendinitis_anserina: 'tendinitis_anserina',
  core_estabilitat: 'core_estabilitat',
  core_stability: 'core_estabilitat',
  equilibri: 'equilibri',
  balance: 'equilibri',
  pliometria: 'pliometria',
  plyometrics: 'pliometria',
  mobilitat: 'mobilitat',
  mobility: 'mobilitat',
  escalfament: 'escalfament',
  warmup: 'escalfament',
  tornada_calma: 'tornada_calma',
  cooldown: 'tornada_calma',
  // Strength
  forca: 'forca',
  strength: 'forca',
  hipertrofia: 'hipertrofia',
  hypertrophy: 'hipertrofia',
  potencia: 'potencia',
  power: 'potencia',
  resistencia: 'resistencia',
  endurance: 'resistencia',
  // Mobility / yoga / breath
  iogues: 'iogues',
  yoga: 'iogues',
  respiracio: 'respiracio',
  breathing: 'respiracio',
  mobilitat_toracica: 'mobilitat_toracica',
  thoracic_mobility: 'mobilitat_toracica',
  anti_rotacio: 'anti_rotacio',
  anti_rotation: 'anti_rotacio',
  // Pre/postnatal
  gestacio: 'gestacio',
  pregnancy: 'gestacio',
  prenatal: 'gestacio',
  postpart: 'postpart',
  postpartum: 'postpart',
  sol_pelvic: 'sol_pelvic',
  pelvic_floor: 'sol_pelvic',
  // Other
  prehab: 'prehab',
  unilateral: 'unilateral',
  isometric: 'isometric',
}

const RESTRICTION_ALIASES: Record<string, RestrictionCondition> = {
  rehab_genoll: 'rehab_genoll',
  knee_rehab: 'rehab_genoll',
  rehab_lumbar: 'rehab_lumbar',
  lumbar_rehab: 'rehab_lumbar',
  rehab_turmell: 'rehab_turmell',
  ankle_rehab: 'rehab_turmell',
  tendinitis_rotuliana: 'tendinitis_rotuliana',
  tendinitis_aquilea: 'tendinitis_aquilea',
  achilles_tendinopathy: 'tendinitis_aquilea',
  lesio_lumbar_aguda: 'lesio_lumbar_aguda',
  acute_lumbar_injury: 'lesio_lumbar_aguda',
  embaras: 'embaras',
  pregnancy: 'embaras',
  postpart: 'postpart',
  postpartum: 'postpart',
  diastasi: 'diastasi',
  diastasis: 'diastasi',
  hipertensio: 'hipertensio',
  hypertension: 'hipertensio',
}

const CATEGORY_ALIASES: Record<string, ExerciseCategory> = {
  strength: 'strength',
  mobility: 'mobility',
  stability: 'stability',
  plyometrics: 'plyometrics',
  cardio: 'cardio',
}

const LEVEL_ALIASES: Record<string, ExerciseLevel> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  expert: 'expert',
}

const PROGRESSION_METRIC_ALIASES: Record<string, ProgressionMetric> = {
  weight: 'weight',
  reps: 'reps',
  seconds: 'seconds',
  time: 'seconds',
  hold: 'seconds',
}

const PROGRESSION_TYPE_ALIASES: Record<string, ProgressionType> = {
  linear: 'linear',
  undulating: 'undulating',
  block: 'block',
}

const MUSCLE_GROUP_SET = new Set<string>(CANONICAL_MUSCLE_GROUPS)
const EQUIPMENT_SET = new Set<string>(CANONICAL_EQUIPMENT)
const TAG_SET = new Set<string>(CANONICAL_EXERCISE_TAGS)
const RESTRICTION_SET = new Set<string>(CANONICAL_RESTRICTION_CONDITIONS)
const LEVEL_SET = new Set<string>(CANONICAL_LEVELS)
const METRIC_SET = new Set<string>(CANONICAL_PROGRESSION_METRICS)
const TYPE_SET = new Set<string>(CANONICAL_PROGRESSION_TYPES)

function normalizeKey(raw: string): string {
  return normalizeText(raw).replace(/\s+/g, '_')
}

function sanitizeIdentifier(raw: string, fallback: string): string {
  const base = raw
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!base) {
    return fallback
  }

  if (/^[0-9]/.test(base)) {
    return `X_${base}`
  }

  return base
}

function mapMuscleGroup(raw: string): MuscleGroup | undefined {
  const key = normalizeKey(raw)
  if (MUSCLE_GROUP_SET.has(key)) {
    return key as MuscleGroup
  }
  return MUSCLE_ALIASES[key]
}

function mapEquipment(raw: string): Equipment | undefined {
  const key = normalizeKey(raw)
  if (EQUIPMENT_SET.has(key)) {
    return key as Equipment
  }
  return EQUIPMENT_ALIASES[key]
}

function mapTag(raw: string): ExerciseTag | undefined {
  const key = normalizeKey(raw)
  if (TAG_SET.has(key)) {
    return key as ExerciseTag
  }
  return TAG_ALIASES[key]
}

function mapRestriction(raw: string): RestrictionCondition | undefined {
  const key = normalizeKey(raw)
  if (RESTRICTION_SET.has(key)) {
    return key as RestrictionCondition
  }
  return RESTRICTION_ALIASES[key]
}

function mapExerciseLevel(raw: string | null | undefined): ExerciseLevel | undefined {
  if (!raw) return undefined
  const key = normalizeKey(raw)
  if (LEVEL_SET.has(key)) {
    return key as ExerciseLevel
  }
  return LEVEL_ALIASES[key]
}

function mapProgressionMetric(raw: string | null | undefined): ProgressionMetric | undefined {
  if (!raw) return undefined
  const key = normalizeKey(raw)
  if (METRIC_SET.has(key)) {
    return key as ProgressionMetric
  }
  return PROGRESSION_METRIC_ALIASES[key]
}

function mapProgressionType(raw: string | null | undefined): ProgressionType | undefined {
  if (!raw) return undefined
  const key = normalizeKey(raw)
  if (TYPE_SET.has(key)) {
    return key as ProgressionType
  }
  return PROGRESSION_TYPE_ALIASES[key]
}

function mapCategory(raw: string | null | undefined): ExerciseCategory | undefined {
  if (!raw) return undefined
  const key = normalizeKey(raw)
  return CATEGORY_ALIASES[key]
}

function normalizeDistribution(
  input?: Record<string, number> | null
): Partial<Record<MuscleGroup, number>> {
  if (!input || typeof input !== 'object') {
    return {}
  }
  const mappedEntries: Array<[MuscleGroup, number]> = []

  for (const [rawMuscle, rawWeight] of Object.entries(input)) {
    const mapped = mapMuscleGroup(rawMuscle)
    if (!mapped) continue
    if (!Number.isFinite(rawWeight) || rawWeight <= 0) continue
    mappedEntries.push([mapped, rawWeight])
  }

  if (mappedEntries.length === 0) {
    return {}
  }

  const total = mappedEntries.reduce((acc, [, value]) => acc + value, 0)
  if (total <= 0) {
    return {}
  }

  const normalized: Partial<Record<MuscleGroup, number>> = {}
  for (const [muscle, value] of mappedEntries) {
    normalized[muscle] = Math.round((value / total) * 100)
  }

  return normalized
}

function inferMetricFromEquipment(
  equipment: Equipment[],
  category: ExerciseCategory
): ProgressionMetric {
  if (equipment.length === 1 && equipment[0] === 'pes_corporal') {
    return category === 'mobility' || category === 'stability' ? 'seconds' : 'reps'
  }
  return 'weight'
}

function normalizeRestrictions(input: CandidateEnvelope['payload']['restrictions']): {
  restrictions: Restriction[]
  unknownCount: number
} {
  if (!Array.isArray(input)) {
    return {
      restrictions: [],
      unknownCount: 0,
    }
  }

  let unknownCount = 0
  const restrictions: Restriction[] = []

  for (const item of input) {
    const condition = mapRestriction(item.condition)
    const action = item.action === 'avoid' || item.action === 'modify' ? item.action : null

    if (!condition || !action) {
      unknownCount += 1
      continue
    }

    restrictions.push({
      condition,
      action,
      note: item.note?.trim() || undefined,
    })
  }

  return {
    restrictions: uniqueArray(restrictions),
    unknownCount,
  }
}

function normalizeExerciseCandidate(input: CandidateEnvelope): NormalizedExerciseCandidate {
  const payload = input.payload
  if (payload.kind !== 'exercise') {
    throw new Error(`Expected exercise payload for candidate ${input.candidateId}`)
  }

  let confidence = 1
  const reviewReasons: string[] = []

  const canonicalId = sanitizeIdentifier(
    payload.sourceExternalId,
    `ingested_exercise_${Date.now()}`
  )

  const primaryMuscles = uniqueArray(
    payload.primaryMuscles.map(mapMuscleGroup).filter(Boolean)
  ) as MuscleGroup[]
  if (primaryMuscles.length === 0) {
    primaryMuscles.push('abdominal')
    reviewReasons.push('No canonical primary muscles were mapped; defaulted to abdominal.')
    confidence -= 0.45
  }

  const secondaryMuscles = uniqueArray(
    (payload.secondaryMuscles ?? []).map(mapMuscleGroup).filter(Boolean)
  ) as MuscleGroup[]

  const mappedEquipment = uniqueArray(
    (payload.equipment ?? []).map(mapEquipment).filter(Boolean)
  ) as Equipment[]
  const equipment = mappedEquipment.length > 0 ? mappedEquipment : ['pes_corporal']
  if (mappedEquipment.length === 0) {
    reviewReasons.push('No canonical equipment was mapped; defaulted to pes_corporal.')
    confidence -= 0.2
  }

  const category = mapCategory(payload.category) ?? 'strength'
  if (!mapCategory(payload.category)) {
    reviewReasons.push('Unknown category mapped to strength.')
    confidence -= 0.08
  }

  const level = mapExerciseLevel(payload.level) ?? 'intermediate'
  if (!mapExerciseLevel(payload.level)) {
    reviewReasons.push('Unknown level mapped to intermediate.')
    confidence -= 0.05
  }

  const progressionMetric =
    mapProgressionMetric(payload.progressionMetric) ?? inferMetricFromEquipment(equipment, category)
  if (!mapProgressionMetric(payload.progressionMetric)) {
    reviewReasons.push('Unknown progression metric inferred from category/equipment.')
    confidence -= 0.1
  }

  const estimatedSeriesDurationSeconds = ensurePositiveInteger(
    payload.estimatedSeriesDurationSeconds ?? 40,
    40
  )

  const mappedTags = uniqueArray((payload.tags ?? []).map(mapTag).filter(Boolean)) as ExerciseTag[]
  const droppedTags = (payload.tags ?? []).length - mappedTags.length
  if (droppedTags > 0) {
    reviewReasons.push(`${droppedTags} tag(s) were dropped because they are not canonical.`)
    confidence -= Math.min(0.2, droppedTags * 0.03)
  }

  const restrictionResult = normalizeRestrictions(payload.restrictions)
  if (restrictionResult.unknownCount > 0) {
    reviewReasons.push(
      `${restrictionResult.unknownCount} restriction(s) were dropped due to invalid condition/action.`
    )
    confidence -= Math.min(0.2, restrictionResult.unknownCount * 0.05)
  }

  const instructions =
    payload.instructions && payload.instructions.length > 0
      ? payload.instructions.map((instruction) => instruction.trim()).filter(Boolean)
      : ['No instructions provided by source.']

  if (instructions.length === 1 && instructions[0] === 'No instructions provided by source.') {
    reviewReasons.push('Missing instructions from source; fallback instruction inserted.')
    confidence -= 0.15
  }

  const representativeImageUrl =
    payload.representativeImageUrl?.trim() || '/exercises/placeholder.svg'

  const aliases = uniqueArray([payload.title, payload.sourceExternalId, ...(payload.aliases ?? [])])

  const canonical = {
    id: canonicalId,
    nameKey: `exercises:${canonicalId}`,
    primaryMuscles,
    secondaryMuscles,
    equipment,
    level,
    category,
    estimatedSeriesDurationSeconds,
    progressionMetric,
    tags: mappedTags,
    restrictions: restrictionResult.restrictions,
    instructions,
    images: [
      {
        url: representativeImageUrl,
        alt: payload.title,
        isRepresentative: true,
      },
    ],
  }

  return {
    kind: 'exercise',
    candidateId: input.candidateId,
    sourceExternalId: payload.sourceExternalId,
    source: input.source,
    license: input.license,
    canonical,
    aliases,
    confidence: clampNumber(confidence, 0, 1),
    reviewReasons,
    titleFingerprint: normalizeText(payload.title),
    slugFingerprint: slugify(canonicalId),
  }
}

const TEMPO_PATTERN = /^\d+-\d+-\d+-\d+$/

function normalizeExerciseEntry(raw: Record<string, unknown>): PresetExerciseEntry | undefined {
  const exerciseId = typeof raw.exerciseId === 'string' ? raw.exerciseId.trim() : ''
  if (!exerciseId) return undefined

  const sets = clampNumber(typeof raw.sets === 'number' ? Math.round(raw.sets) : 3, 1, 10)

  let reps: number | [number, number] = 10
  if (Array.isArray(raw.reps) && raw.reps.length === 2) {
    const [lo, hi] = raw.reps
    if (typeof lo === 'number' && typeof hi === 'number' && lo > 0 && hi > 0) {
      reps = [Math.round(Math.min(lo, hi)), Math.round(Math.max(lo, hi))]
    }
  } else if (typeof raw.reps === 'number' && raw.reps > 0) {
    reps = Math.round(raw.reps)
  }

  const restSeconds = clampNumber(
    typeof raw.restSeconds === 'number' ? Math.round(raw.restSeconds) : 60,
    0,
    600
  )

  const entry: PresetExerciseEntry = { exerciseId, sets, reps, restSeconds }

  if (typeof raw.tempo === 'string' && TEMPO_PATTERN.test(raw.tempo.trim())) {
    entry.tempo = raw.tempo.trim()
  }

  if (typeof raw.rpe === 'number' && raw.rpe >= 1 && raw.rpe <= 10) {
    entry.rpe = raw.rpe
  }

  if (typeof raw.notes === 'string' && raw.notes.trim()) {
    entry.notes = raw.notes.trim()
  }

  return entry
}

function normalizeSessions(
  rawSessions: PresetCandidateInput['sessions']
): PresetSessionTemplate[] | undefined {
  if (!Array.isArray(rawSessions) || rawSessions.length === 0) {
    return undefined
  }

  const sessions: PresetSessionTemplate[] = []

  for (const rawSession of rawSessions) {
    if (typeof rawSession !== 'object' || rawSession === null) continue
    const raw = rawSession as Record<string, unknown>
    if (!Array.isArray(raw.exercises)) continue

    const exercises = (raw.exercises as Array<Record<string, unknown>>)
      .map(normalizeExerciseEntry)
      .filter((entry): entry is PresetExerciseEntry => entry !== undefined)

    if (exercises.length === 0) continue

    const session: PresetSessionTemplate = { exercises }

    if (typeof raw.label === 'string' && raw.label.trim()) {
      session.label = raw.label.trim()
    }

    if (raw.isDeload === true) {
      session.isDeload = true
    }

    sessions.push(session)
  }

  return sessions
}

function normalizePresetCandidate(input: CandidateEnvelope): NormalizedPresetCandidate {
  const payload = input.payload
  if (payload.kind !== 'preset') {
    throw new Error(`Expected preset payload for candidate ${input.candidateId}`)
  }

  let confidence = 1
  const reviewReasons: string[] = []

  const presetId = sanitizeIdentifier(
    payload.sourceExternalId,
    `ingested_preset_${Date.now()}`
  ).toLowerCase()

  const hasSessions = Array.isArray(payload.sessions) && payload.sessions.length > 0

  const normalizedDistribution = normalizeDistribution(payload.muscleDistribution)

  if (!hasSessions && Object.keys(normalizedDistribution).length === 0) {
    reviewReasons.push('No canonical muscle distribution mapped; defaulted to abdominal=100.')
    normalizedDistribution.abdominal = 100
    confidence -= 0.45
  }

  const durationOptions = uniqueArray(
    (payload.durationOptions ?? [4, 6, 8]).map((value) => ensurePositiveInteger(value, 4))
  ).sort((a, b) => a - b)

  if (!payload.durationOptions || payload.durationOptions.length === 0) {
    reviewReasons.push('Missing duration options; defaulted to [4, 6, 8].')
    confidence -= 0.1
  }

  const requiredTags = uniqueArray(
    (payload.requiredTags ?? []).map(mapTag).filter(Boolean)
  ) as ExerciseTag[]
  const droppedTags = (payload.requiredTags ?? []).length - requiredTags.length
  if (droppedTags > 0) {
    reviewReasons.push(
      `${droppedTags} required tag(s) were dropped because they are not canonical.`
    )
    confidence -= Math.min(0.15, droppedTags * 0.03)
  }

  const autoRestrictions = uniqueArray(
    (payload.autoRestrictions ?? []).map(mapRestriction).filter(Boolean)
  ) as RestrictionCondition[]

  const droppedRestrictions = (payload.autoRestrictions ?? []).length - autoRestrictions.length
  if (droppedRestrictions > 0) {
    reviewReasons.push(
      `${droppedRestrictions} auto restriction(s) were dropped because they are not canonical.`
    )
    confidence -= Math.min(0.15, droppedRestrictions * 0.04)
  }

  const progressionType = mapProgressionType(payload.progressionType) ?? 'linear'
  if (!mapProgressionType(payload.progressionType)) {
    reviewReasons.push('Unknown progression type mapped to linear.')
    confidence -= 0.05
  }

  const sessions = normalizeSessions(payload.sessions)
  if (sessions && sessions.length === 0) {
    reviewReasons.push('Preset sessions array was provided but empty after normalization.')
    confidence -= 0.1
  }

  const weeklyProgression =
    typeof payload.weeklyProgression === 'number' && Number.isFinite(payload.weeklyProgression)
      ? Math.round(clampNumber(payload.weeklyProgression, 0, 10))
      : undefined

  const aliases = uniqueArray([payload.title, payload.sourceExternalId])

  const canonical: CanonicalPreset = {
    id: presetId,
    nameKey: `planning:ingested_presets.${presetId}.name`,
    descriptionKey: `planning:ingested_presets.${presetId}.description`,
    durationOptions,
    ...(hasSessions ? {} : { muscleDistribution: normalizedDistribution }),
    requiredTags,
    autoRestrictions,
    progressionType,
    notes: payload.notes?.trim() || payload.description?.trim() || undefined,
    ...(hasSessions ? { sessions } : {}),
    ...(weeklyProgression !== undefined ? { weeklyProgression } : {}),
  }

  return {
    kind: 'preset',
    candidateId: input.candidateId,
    sourceExternalId: payload.sourceExternalId,
    source: input.source,
    license: input.license,
    canonical,
    aliases,
    confidence: clampNumber(confidence, 0, 1),
    reviewReasons,
    titleFingerprint: normalizeText(payload.title),
    slugFingerprint: slugify(presetId),
  }
}

export function normalizeCandidate(input: CandidateEnvelope): NormalizedCandidate {
  return input.payload.kind === 'exercise'
    ? normalizeExerciseCandidate(input)
    : normalizePresetCandidate(input)
}
