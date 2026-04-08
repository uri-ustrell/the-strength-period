/**
 * Build-time script: generates the enriched exercises JSON from:
 *   1. Raw free-exercise-db data (data/raw/free-exercise-db.json)
 *   2. Enrichment map (src/data/exerciseEnrichment.ts)
 *   3. Muscle/equipment mappings (src/data/muscleGroups.ts)
 *
 * Output: public/exercises/exercises.json — our source of truth.
 *
 * Run: npx tsx scripts/buildExercises.ts
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { exerciseEnrichment } from '../src/data/exerciseEnrichment'
import { freeExerciseDbMuscleMap, freeExerciseDbEquipmentMap } from '../src/data/muscleGroups'

// --- Types (mirrored from src/types/exercise.ts to avoid @/ alias) ---

type MuscleGroup = string
type Equipment = string

type RawExercise = {
  id: string
  name: string
  force: string | null
  level: string
  mechanic: string | null
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string
  images: string[]
}

// --- Mapping helpers (same logic as the old runtime exerciseLoader) ---

function mapMuscles(rawMuscles: string[]): MuscleGroup[] {
  const mapped: MuscleGroup[] = []
  for (const raw of rawMuscles) {
    const m = freeExerciseDbMuscleMap[raw]
    if (m && !mapped.includes(m)) {
      mapped.push(m)
    }
  }
  return mapped
}

function mapEquipment(rawEquipment: string | null): Equipment[] {
  if (!rawEquipment) return ['pes_corporal']
  const mapped = freeExerciseDbEquipmentMap[rawEquipment]
  return mapped ? [mapped] : ['pes_corporal']
}

function mapLevel(rawLevel: string): 'beginner' | 'intermediate' | 'expert' {
  if (rawLevel === 'beginner' || rawLevel === 'intermediate' || rawLevel === 'expert') {
    return rawLevel
  }
  return 'intermediate'
}

function unique<T>(arr: T[]): T[] {
  return arr.filter((v, i, a) => a.indexOf(v) === i)
}

// --- Main ---

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const rawPath = resolve(ROOT, 'data/raw/free-exercise-db.json')
const outPath = resolve(ROOT, 'public/exercises/exercises.json')

const rawExercises: RawExercise[] = JSON.parse(readFileSync(rawPath, 'utf-8'))

const enriched: Record<string, unknown>[] = []

for (const raw of rawExercises) {
  const enrichment = exerciseEnrichment[raw.id]
  if (!enrichment) continue

  enriched.push({
    id: raw.id,
    nameKey: enrichment.nameKey,
    primaryMuscles: unique([
      ...mapMuscles(raw.primaryMuscles),
      ...(enrichment.primaryMusclesExtra ?? []),
    ]),
    secondaryMuscles: unique([
      ...mapMuscles(raw.secondaryMuscles),
      ...(enrichment.secondaryMusclesExtra ?? []),
    ]),
    equipment: mapEquipment(raw.equipment),
    level: mapLevel(raw.level),
    category: enrichment.category,
    estimatedSeriesDurationSeconds: enrichment.estimatedSeriesDurationSeconds,
    progressionMetric: enrichment.progressionMetric,
    tags: enrichment.tags,
    restrictions: enrichment.restrictions,
    instructions: raw.instructions,
    images: [
      {
        url: '/exercises/placeholder.svg',
        alt: raw.name,
        isRepresentative: true,
      },
    ],
  })
}

writeFileSync(outPath, JSON.stringify(enriched, null, 2), 'utf-8')

console.log(`✅ Built ${enriched.length} enriched exercises → ${outPath}`)
