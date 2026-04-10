import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface Restriction {
  condition: string
  action: string
}

interface Exercise {
  id: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string[]
  level: string
  category: string
  progressionMetric: string
  estimatedSeriesDurationSeconds: number
  restrictions: Restriction[]
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes(';') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function humanizeName(id: string): string {
  return id.replace(/_/g, ' ')
}

function generateCsv(exercises: Exercise[]): string {
  const headers = [
    'id',
    'name',
    'primaryMuscles',
    'secondaryMuscles',
    'equipment',
    'level',
    'category',
    'progressionMetric',
    'estimatedSeriesDurationSeconds',
    'restrictions',
  ]

  const rows = exercises.map((ex) => [
    escapeCsvField(ex.id),
    escapeCsvField(humanizeName(ex.id)),
    escapeCsvField(ex.primaryMuscles.join(';')),
    escapeCsvField(ex.secondaryMuscles.join(';')),
    escapeCsvField(ex.equipment.join(';')),
    ex.level,
    ex.category,
    ex.progressionMetric,
    String(ex.estimatedSeriesDurationSeconds),
    escapeCsvField(ex.restrictions.map((r) => `${r.condition}:${r.action}`).join(';')),
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

function main(): void {
  const rootDir = path.resolve(__dirname, '..')
  const inputPath = path.join(rootDir, 'public', 'exercises', 'exercises.json')
  const outputPath = path.join(rootDir, 'data', 'ingestion', 'prompts', 'exercise-catalog.csv')

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: exercises.json not found at ${inputPath}`)
    console.error('Run "npm run build:exercises" first.')
    process.exit(1)
  }

  const raw = fs.readFileSync(inputPath, 'utf-8')
  const exercises: Exercise[] = JSON.parse(raw)

  const csv = generateCsv(exercises)
  fs.writeFileSync(outputPath, csv, 'utf-8')

  console.log(`Written ${exercises.length} exercises to ${path.relative(rootDir, outputPath)}`)
}

main()
