import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const ROOT_DIR = resolve(__dirname, '..', '..')

export const INGESTION_ROOT_DIR = resolve(ROOT_DIR, 'data/ingestion')
export const INGESTION_REPORTS_DIR = resolve(INGESTION_ROOT_DIR, 'reports')
export const INGESTION_QUEUES_DIR = resolve(INGESTION_ROOT_DIR, 'queues')
export const INGESTION_BACKUPS_DIR = resolve(INGESTION_ROOT_DIR, 'backups')
export const INGESTION_RUNS_DIR = resolve(INGESTION_ROOT_DIR, 'runs')

export const EXERCISE_CATALOG_PATH = resolve(ROOT_DIR, 'public/exercises/exercises.json')
export const EXERCISE_IMAGES_DIR = resolve(ROOT_DIR, 'public/exercises/images')

export const PRESET_CATALOG_PATH = resolve(ROOT_DIR, 'data/ingestion/presets/catalog.json')
export const SOURCE_REGISTRY_PATH = resolve(INGESTION_ROOT_DIR, 'source-registry.json')
export const ALIAS_MAP_PATH = resolve(INGESTION_ROOT_DIR, 'alias-map.json')
