#!/usr/bin/env node
/* eslint-disable */
/**
 * QA-7 (Feature 17): regenerate `data/ingestion/presets/catalog.json` so every
 * preset declares exactly 4 sessions A/B/C/D with non-empty exercises[],
 * plus weeklyProgressionRates of length === durationOptions[0].
 *
 * - Pure offline transform of an input JSON catalog.
 * - Drops exercises with `pilates` equipment (QA-5).
 * - Validates exerciseId against `public/exercises/exercises.json`.
 * - Produces a markdown report at data/ingestion/reports/qa17-faithful-presets.md
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const CATALOG_PATH = path.join(ROOT, 'data/ingestion/presets/catalog.json')
const EXERCISES_PATH = path.join(ROOT, 'public/exercises/exercises.json')
const REPORT_PATH = path.join(ROOT, 'data/ingestion/reports/qa17-faithful-presets.md')

// ---------- Load ----------
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'))
const exercisesAll = JSON.parse(fs.readFileSync(EXERCISES_PATH, 'utf8'))
const exById = new Map(exercisesAll.map((e) => [e.id, e]))

// QA-5: filter out pilates-equipment exercises (Equipment enum no longer includes 'pilates')
const exercisesValid = exercisesAll.filter((e) => !(e.equipment || []).includes('pilates'))
const droppedPilatesIds = new Set(
  exercisesAll.filter((e) => (e.equipment || []).includes('pilates')).map((e) => e.id)
)

// ---------- Helpers ----------
const TEMPLATE_KEYS = ['A', 'B', 'C', 'D']

function buildWeeklyProgressionRates(weeks) {
  return Array.from({ length: weeks }, (_, i) => {
    const week = i + 1
    return { week, progressionPct: week % 4 === 0 ? -40 : 5 }
  })
}

// Default volume defaults by category & level
function defaultsFor(exercise) {
  const cat = exercise.category
  const lvl = exercise.level
  const metric = exercise.progressionMetric
  // Time-based exercises (mobility holds, isometric, cardio): reps express seconds
  if (cat === 'mobility') {
    return { sets: 2, reps: 30, restSeconds: 30 }
  }
  if (cat === 'cardio') {
    return { sets: 3, reps: 30, restSeconds: 60 }
  }
  if (cat === 'plyometrics') {
    return { sets: 4, reps: [6, 8], restSeconds: 120 }
  }
  if (cat === 'stability') {
    if (metric === 'seconds') {
      return { sets: 3, reps: 30, restSeconds: 60 }
    }
    return { sets: 3, reps: [10, 15], restSeconds: 60 }
  }
  // strength
  if (lvl === 'beginner') {
    return { sets: 3, reps: [10, 12], restSeconds: 90 }
  }
  if (lvl === 'expert') {
    return { sets: 4, reps: [5, 8], restSeconds: 150 }
  }
  return { sets: 3, reps: [8, 12], restSeconds: 90 } // intermediate
}

// Build PresetExerciseEntry, attaching optional initialLoadKg for weight-based work.
function toEntry(exercise) {
  const base = defaultsFor(exercise)
  const entry = { exerciseId: exercise.id, ...base }
  if (exercise.progressionMetric === 'weight') {
    // Sensible "Auto-derive" sentinel left undefined; set a conservative
    // beginner starting load only when it's a barbell compound for which 0kg
    // would be misleading. We leave initialLoadKg undefined to signal Auto.
  }
  return entry
}

// Compute archetype + per-session shapes & filters per preset.
function archetypeFor(preset) {
  const id = preset.id
  const tags = new Set(preset.requiredTags || [])
  const isRehabKnee =
    tags.has('rehab_genoll') || tags.has('tendinitis_anserina') || tags.has('tendinitis_rotuliana')
  const isRehabLumbar = tags.has('rehab_lumbar')
  const isRehabAnkle = tags.has('rehab_turmell')
  const isRehabAny = isRehabKnee || isRehabLumbar || isRehabAnkle || id.startsWith('rehab_')
  const isMobilityOnly =
    (id.startsWith('mobilitat_') ||
      id.startsWith('rutina_mobilitat_') ||
      id === 'mobilitat_prevencio') &&
    !tags.has('corredor') === false &&
    !tags.has('core_estabilitat')
  // Override: explicit mobility-only ids
  const mobilityOnlyIds = new Set([
    'mobilitat_prevencio',
    'mobilitat_toracica_espatlles_v1',
    'mobilitat_tren_inferior_v1',
    'rutina_mobilitat_global_v1',
  ])
  const isMobilitySession = mobilityOnlyIds.has(id)

  const isEmbaras = id.startsWith('embaras_')
  const isPostpartRehab = id === 'postpart_rehab_conservative_v1'
  const isPostpart = id.startsWith('postpart_')
  const isElder = id.startsWith('gent_gran_')
  const isBeginner = id.startsWith('principianta_') || id.startsWith('zero_')
  const isTrailDescent = tags.has('baixada') || id.includes('descent') || id.includes('baixades')
  const isTrailClimb = tags.has('pujada') || id.includes('vertical') || id.includes('pujada')
  const isBandFocus = id.startsWith('banda_elastica_')
  const isRunner = tags.has('corredor')

  let archetype = 'general_strength'
  if (isMobilitySession) archetype = 'mobility'
  else if (isPostpartRehab) archetype = 'postpart_rehab'
  else if (isEmbaras && id.endsWith('_3r_trimestre_v1')) archetype = 'embaras_late'
  else if (isEmbaras) archetype = 'embaras'
  else if (isElder && tags.has('equilibri')) archetype = 'elder_balance'
  else if (isElder) archetype = 'elder_strength'
  else if (isBeginner && id.startsWith('zero_')) archetype = 'absolute_beginner'
  else if (isBeginner) archetype = 'beginner_strength'
  else if (isRehabAny) archetype = 'rehab'
  else if (isTrailDescent && isRunner) archetype = 'trail_descent'
  else if (isTrailClimb && isRunner) archetype = 'trail_climb'
  else if (isPostpart) archetype = 'postpart_return'
  else if (isBandFocus) archetype = 'band_strength'
  else if (isRunner) archetype = 'runner_strength'

  return { archetype, isRehabKnee, isRehabLumbar, isRehabAnkle, isRehabAny }
}

// Per-archetype "session shapes": ordered list of category/tag preferences for slots.
// Each slot = { cat, tagBias?, mustTag?, requireMuscle? }
const SHAPES = {
  mobility: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'stability' },
      { cat: 'mobility' },
      { cat: 'mobility' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'stability' },
      { cat: 'mobility' },
      { cat: 'stability' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  postpart_rehab: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'stability', tagBias: ['core_estabilitat'] },
      { cat: 'stability', tagBias: ['core_estabilitat'] },
      { cat: 'mobility' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'stability', tagBias: ['core_estabilitat'] },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'mobility' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  embaras_late: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'stability', tagBias: ['core_estabilitat'] },
      { cat: 'stability' },
      { cat: 'mobility' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  embaras: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'stability', tagBias: ['core_estabilitat'] },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'stability' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'stability', tagBias: ['core_estabilitat'] },
      { cat: 'mobility' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  elder_balance: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'stability', tagBias: ['equilibri'] },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'stability' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  elder_strength: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'stability' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'stability', tagBias: ['equilibri'] },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  absolute_beginner: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'stability' },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  beginner_strength: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'stability', tagBias: ['core_estabilitat'] },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  rehab: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'stability' },
      { cat: 'strength', maxLevel: 'intermediate' },
      { cat: 'stability' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  trail_descent: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'strength', tagBias: ['baixada'] },
      { cat: 'strength', tagBias: ['baixada'] },
      { cat: 'plyometrics' },
      { cat: 'stability' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'strength' },
      { cat: 'strength', tagBias: ['baixada'] },
      { cat: 'stability', tagBias: ['core_estabilitat'] },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  trail_climb: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'strength', tagBias: ['pujada'] },
      { cat: 'strength', tagBias: ['pujada'] },
      { cat: 'plyometrics' },
      { cat: 'stability' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'strength' },
      { cat: 'strength', tagBias: ['pujada'] },
      { cat: 'stability', tagBias: ['core_estabilitat'] },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  postpart_return: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'stability', tagBias: ['core_estabilitat'] },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'strength', maxLevel: 'beginner' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'strength', maxLevel: 'intermediate' },
      { cat: 'stability' },
      { cat: 'strength' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  band_strength: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'strength', equipBias: ['banda_elastica'] },
      { cat: 'strength', equipBias: ['banda_elastica'] },
      { cat: 'strength', equipBias: ['banda_elastica'] },
      { cat: 'stability' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  runner_strength: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'strength' },
      { cat: 'strength' },
      { cat: 'stability', tagBias: ['core_estabilitat'] },
      { cat: 'strength' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
  general_strength: [
    [
      { cat: 'mobility', tagBias: ['escalfament'] },
      { cat: 'strength' },
      { cat: 'strength' },
      { cat: 'stability', tagBias: ['core_estabilitat'] },
      { cat: 'strength' },
      { cat: 'mobility', tagBias: ['tornada_calma'] },
    ],
  ],
}

// Build pool of candidate exercises for a preset.
function buildPool(preset, archetypeInfo) {
  const tags = new Set(preset.requiredTags || [])
  const { isRehabKnee, isRehabLumbar, isRehabAnkle } = archetypeInfo

  let pool = exercisesValid.slice()

  // Drop exercises whose contraindications match the preset's rehab tags.
  pool = pool.filter((ex) => {
    const restr = (ex.restrictions || []).map((r) => r.condition || r)
    if (isRehabKnee && (restr.includes('rehab_genoll') || restr.includes('tendinitis_rotuliana')))
      return false
    if (isRehabLumbar && restr.includes('rehab_lumbar')) return false
    if (isRehabAnkle && restr.includes('rehab_turmell')) return false
    return true
  })

  // Conservative archetypes: drop expert level + plyometrics
  const archetype = archetypeInfo.archetype
  const conservative = [
    'mobility',
    'postpart_rehab',
    'embaras_late',
    'embaras',
    'elder_balance',
    'elder_strength',
    'absolute_beginner',
    'rehab',
  ].includes(archetype)
  if (conservative) {
    pool = pool.filter((ex) => ex.level !== 'expert' && ex.category !== 'plyometrics')
  }
  // Beginner strength: drop expert
  if (archetype === 'beginner_strength' || archetype === 'postpart_return') {
    pool = pool.filter((ex) => ex.level !== 'expert')
  }

  return pool
}

function levelRank(l) {
  return l === 'beginner' ? 0 : l === 'intermediate' ? 1 : l === 'expert' ? 2 : 1
}

function pickForSlot(slot, pool, used, preset) {
  const tagsRequired = new Set(preset.requiredTags || [])
  const candidates = pool.filter((ex) => !used.has(ex.id) && ex.category === slot.cat)
  if (candidates.length === 0) return null

  // Apply hard maxLevel
  const filtered = slot.maxLevel
    ? candidates.filter((ex) => levelRank(ex.level) <= levelRank(slot.maxLevel))
    : candidates
  const finalCandidates = filtered.length > 0 ? filtered : candidates

  // Score
  const scored = finalCandidates.map((ex) => {
    let score = 0
    const exTags = new Set(ex.tags || [])
    // overlap with preset requiredTags is highest signal
    for (const t of tagsRequired) if (exTags.has(t)) score += 5
    if (slot.tagBias) for (const t of slot.tagBias) if (exTags.has(t)) score += 3
    if (slot.equipBias)
      for (const e of slot.equipBias) if ((ex.equipment || []).includes(e)) score += 4
    // Prefer beginner level for inclusivity
    if (ex.level === 'beginner') score += 1
    return { ex, score }
  })
  scored.sort((a, b) => b.score - a.score || a.ex.id.localeCompare(b.ex.id))
  return scored[0].ex
}

function buildSession(preset, pool, shape, used) {
  const exercises = []
  for (const slot of shape) {
    const picked = pickForSlot(slot, pool, used, preset)
    if (picked) {
      used.add(picked.id)
      exercises.push(toEntry(picked))
    }
  }
  // Backfill if we couldn't reach 5 entries: pick best remaining strength/stability
  if (exercises.length < 5) {
    const fallbackOrder = ['strength', 'stability', 'mobility']
    for (const cat of fallbackOrder) {
      while (exercises.length < 5) {
        const pick = pickForSlot({ cat }, pool, used, preset)
        if (!pick) break
        used.add(pick.id)
        exercises.push(toEntry(pick))
      }
      if (exercises.length >= 5) break
    }
  }
  return exercises
}

function shapesForArchetype(archetype) {
  const shapes = SHAPES[archetype] || SHAPES.general_strength
  // Cycle to length 4
  const out = []
  for (let i = 0; i < 4; i++) out.push(shapes[i % shapes.length])
  return out
}

// ---------- Generate ----------
const reportLines = []
reportLines.push('# QA-7 Faithful Presets Regeneration Report')
reportLines.push('')
reportLines.push(`Generated: ${new Date().toISOString()}`)
reportLines.push('')
reportLines.push(
  `- Source catalog: \`data/ingestion/presets/catalog.json\` (${catalog.length} presets)`
)
reportLines.push(
  `- Exercise catalog: \`public/exercises/exercises.json\` (${exercisesAll.length} total, ${exercisesValid.length} after dropping \`pilates\`)`
)
reportLines.push(
  `- Dropped \`pilates\`-equipment exercise IDs: ${[...droppedPilatesIds]
    .sort()
    .map((s) => '`' + s + '`')
    .join(', ')}`
)
reportLines.push('')
reportLines.push('## Per-preset summary')
reportLines.push('')
reportLines.push(
  '| # | Preset id | Archetype | Sessions A/B/C/D counts | weeks | Pilates-swapped (legacy ids removed) |'
)
reportLines.push('|---|---|---|---|---|---|')

const warnings = []
const newCatalog = catalog.map((preset, idx) => {
  const archetypeInfo = archetypeFor(preset)
  const pool = buildPool(preset, archetypeInfo)
  if (pool.length < 12) {
    warnings.push(`[${preset.id}] thin pool: only ${pool.length} candidate exercises`)
  }

  // Track legacy pilates-tagged exercises that were referenced by the prior sessions.
  const oldIds = new Set()
  if (Array.isArray(preset.sessions)) {
    for (const s of preset.sessions) for (const e of s.exercises || []) oldIds.add(e.exerciseId)
  }
  const swappedOut = [...oldIds].filter((id) => droppedPilatesIds.has(id))

  const shapes = shapesForArchetype(archetypeInfo.archetype)
  const sessions = []
  for (let i = 0; i < 4; i++) {
    const used = new Set()
    const exercises = buildSession(preset, pool, shapes[i], used)
    if (exercises.length === 0) {
      warnings.push(`[${preset.id}] session ${TEMPLATE_KEYS[i]} ended up empty`)
    }
    // Validate ids
    for (const e of exercises) {
      if (!exById.has(e.exerciseId)) {
        warnings.push(
          `[${preset.id}] session ${TEMPLATE_KEYS[i]}: unknown exercise id ${e.exerciseId}`
        )
      }
    }
    sessions.push({
      templateKey: TEMPLATE_KEYS[i],
      name: TEMPLATE_KEYS[i],
      exercises,
    })
  }

  const weeks = (preset.durationOptions && preset.durationOptions[0]) || 6
  const weeklyProgressionRates = buildWeeklyProgressionRates(weeks)

  // Compose new preset, preserving all existing fields except `sessions`.
  const next = {
    ...preset,
    sessions,
    weeklyProgressionRates,
  }

  const counts = sessions.map((s) => s.exercises.length).join('/')
  reportLines.push(
    `| ${idx} | \`${preset.id}\` | ${archetypeInfo.archetype} | ${counts} | ${weeks} | ${
      swappedOut.length === 0 ? '—' : swappedOut.map((s) => '`' + s + '`').join(', ')
    } |`
  )

  return next
})

// ---------- Write ----------
fs.writeFileSync(CATALOG_PATH, JSON.stringify(newCatalog, null, 2) + '\n', 'utf8')

if (warnings.length > 0) {
  reportLines.push('')
  reportLines.push('## Warnings')
  reportLines.push('')
  for (const w of warnings) reportLines.push(`- ${w}`)
}

reportLines.push('')
reportLines.push('## Totals')
reportLines.push('')
const totalSessions = newCatalog.reduce((s, p) => s + p.sessions.length, 0)
const totalEntries = newCatalog.reduce(
  (s, p) => s + p.sessions.reduce((a, ses) => a + ses.exercises.length, 0),
  0
)
reportLines.push(`- Presets regenerated: ${newCatalog.length}`)
reportLines.push(`- Total sessions: ${totalSessions}`)
reportLines.push(`- Total exercise entries: ${totalEntries}`)
reportLines.push(`- Warnings: ${warnings.length}`)

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true })
fs.writeFileSync(REPORT_PATH, reportLines.join('\n') + '\n', 'utf8')

console.log(
  `Wrote ${newCatalog.length} presets, ${totalSessions} sessions, ${totalEntries} entries.`
)
console.log(`Warnings: ${warnings.length}`)
console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`)
