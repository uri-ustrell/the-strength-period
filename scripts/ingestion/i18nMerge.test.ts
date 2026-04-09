import assert from 'node:assert/strict'
import test from 'node:test'

import type { MergeWriteResult } from './contracts'
import {
  type ExerciseI18nUpdate,
  mergeExerciseI18nIntoLocales,
  type ParsedIngestionI18n,
  validateLlmExerciseI18nContract,
} from './i18nMerge'

type CapturedWrite = {
  targetPath: string
  value: Record<string, unknown>
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function findWriteValue(writes: CapturedWrite[], suffix: string): Record<string, unknown> {
  const write = writes.find((entry) => entry.targetPath.endsWith(suffix))
  assert.ok(write, `Expected captured write for ${suffix}.`)
  return write.value
}

function createInMemoryFileIO() {
  const writes: CapturedWrite[] = []

  const readJsonFileOrDefault = async <T>(path: string, fallback: T): Promise<T> => {
    const emptyLocale = {} as T

    if (path.endsWith('/src/i18n/locales/ca/exercises.json')) return emptyLocale
    if (path.endsWith('/src/i18n/locales/es/exercises.json')) return emptyLocale
    if (path.endsWith('/src/i18n/locales/en/exercises.json')) return emptyLocale
    if (path.endsWith('/src/i18n/locales/ca/planning.json')) return emptyLocale
    if (path.endsWith('/src/i18n/locales/es/planning.json')) return emptyLocale
    if (path.endsWith('/src/i18n/locales/en/planning.json')) return emptyLocale

    return fallback
  }

  const writeJsonRollbackSafe = async (options: {
    targetPath: string
    value: unknown
    backupDir: string
    dryRun: boolean
    backupPrefix?: string
  }): Promise<MergeWriteResult> => {
    writes.push({
      targetPath: options.targetPath,
      value: cloneValue(options.value) as Record<string, unknown>,
    })

    return {
      targetPath: options.targetPath,
      written: true,
    }
  }

  return {
    fileIO: {
      readJsonFileOrDefault,
      writeJsonRollbackSafe,
    },
    writes,
  }
}

test('mergeExerciseI18nIntoLocales keeps deterministic grouped precedence and sorted tags', async () => {
  const sourceI18nBySourceId = new Map<string, ParsedIngestionI18n>([
    [
      'source-a',
      {
        ca: {
          exercises: {
            'id-z': {
              name: 'Nom A Z',
              instructions: ['Pas A Z'],
            },
          },
          presetTags: {
            balance: 'Equilibri A',
            strength: 'Forca A',
          },
        },
        es: {
          exercises: {
            'id-z': {
              name: 'Nombre A Z',
              instructions: ['Paso A Z'],
            },
          },
          presetTags: {
            balance: 'Balance A',
            strength: 'Fuerza A',
          },
        },
        en: {
          exercises: {
            'id-a': {
              name: 'English A A',
            },
            'id-z': {
              instructions: ['Step A Z'],
            },
          },
          presetTags: {
            balance: 'Balance A',
            strength: 'Strength A',
          },
        },
      },
    ],
    [
      'source-b',
      {
        ca: {
          exercises: {
            'id-b': {
              name: 'Nom B',
              instructions: ['Pas B'],
            },
          },
          presetTags: {
            core: 'Nucli B',
            stability: 'Estabilitat B',
          },
        },
        es: {
          exercises: {
            'id-b': {
              name: 'Nombre B',
              instructions: ['Paso B'],
            },
          },
          presetTags: {
            core: 'Nucleo B',
            stability: 'Estabilidad B',
          },
        },
        en: {
          exercises: {
            'id-b': {
              name: 'English B',
              instructions: ['Step B'],
            },
          },
          presetTags: {
            core: 'Core B',
            stability: 'Stability B',
          },
        },
      },
    ],
  ])

  const updates: ExerciseI18nUpdate[] = [
    {
      sourceId: 'source-b',
      sourceExternalId: 'id-b',
      canonicalExerciseId: 'split_squat_iso_hold',
      tags: ['core', 'stability'],
    },
    {
      sourceId: 'source-a',
      sourceExternalId: 'id-z',
      canonicalExerciseId: 'split_squat_iso_hold',
      tags: ['balance'],
    },
    {
      sourceId: 'source-a',
      sourceExternalId: 'id-a',
      canonicalExerciseId: 'split_squat_iso_hold',
      tags: ['strength', 'core'],
    },
  ]

  const { fileIO, writes } = createInMemoryFileIO()

  await mergeExerciseI18nIntoLocales(
    {
      updates,
      sourceI18nBySourceId,
      runId: 'ingestion-test-run',
      dryRun: false,
    },
    fileIO
  )

  const caExercises = findWriteValue(writes, '/src/i18n/locales/ca/exercises.json')
  assert.equal(caExercises.split_squat_iso_hold, 'Nom A Z')
  assert.deepEqual((caExercises.instructions as Record<string, string[]>).split_squat_iso_hold, [
    'Pas A Z',
  ])

  const enExercises = findWriteValue(writes, '/src/i18n/locales/en/exercises.json')
  assert.equal(enExercises.split_squat_iso_hold, 'English A A')

  const caPlanning = findWriteValue(writes, '/src/i18n/locales/ca/planning.json')
  const caPresetTags = caPlanning.preset_tags as Record<string, string>

  assert.deepEqual(Object.keys(caPresetTags), ['balance', 'core', 'stability', 'strength'])
  assert.equal(caPresetTags.balance, 'Equilibri A')
  assert.equal(caPresetTags.core, 'Nucli B')
  assert.equal(caPresetTags.stability, 'Estabilitat B')
  assert.equal(caPresetTags.strength, 'Forca A')
})

test('validateLlmExerciseI18nContract reports missing locale blocks', () => {
  const reasons = validateLlmExerciseI18nContract({
    sourceI18n: undefined,
    sourceExternalId: 'external-id',
    canonicalExerciseId: 'canonical-id',
    tags: ['core'],
  })

  assert.deepEqual(reasons, [
    'LLM i18n contract missing i18n.ca block.',
    'LLM i18n contract missing i18n.en block.',
    'LLM i18n contract missing i18n.es block.',
  ])
})

test('validateLlmExerciseI18nContract reports missing localized names and preset tag labels', () => {
  const sourceI18n: ParsedIngestionI18n = {
    ca: {
      exercises: {},
      presetTags: {
        core: 'Nucli',
      },
    },
    es: {
      exercises: {
        'canonical-id': {
          name: 'Nombre ES',
        },
      },
      presetTags: {},
    },
    en: {
      exercises: {},
      presetTags: {
        core: 'Core',
      },
    },
  }

  const reasons = validateLlmExerciseI18nContract({
    sourceI18n,
    sourceExternalId: 'external-id',
    canonicalExerciseId: 'canonical-id',
    tags: ['core', 'stability'],
  })

  assert.ok(
    reasons.includes(
      'LLM i18n contract missing i18n.ca.exercises["external-id" or "canonical-id"].name.'
    )
  )
  assert.ok(
    reasons.includes(
      'LLM i18n contract missing i18n.en.exercises["external-id" or "canonical-id"].name.'
    )
  )
  assert.ok(reasons.includes('LLM i18n contract missing i18n.ca.preset_tags.stability.'))
  assert.ok(reasons.includes('LLM i18n contract missing i18n.es.preset_tags.core.'))
  assert.ok(reasons.includes('LLM i18n contract missing i18n.es.preset_tags.stability.'))
  assert.ok(reasons.includes('LLM i18n contract missing i18n.en.preset_tags.stability.'))
})
