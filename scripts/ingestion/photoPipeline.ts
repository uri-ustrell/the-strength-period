import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

import type { ExerciseCatalogEntry, IngestionReport, MergeWriteResult } from './contracts'
import {
  EXERCISE_CATALOG_PATH,
  EXERCISE_IMAGES_DIR,
  INGESTION_BACKUPS_DIR,
  INGESTION_RUNS_DIR,
  ROOT_DIR,
} from './paths'
import {
  ensureDir,
  fileExists,
  isHttpUrl,
  readJsonFile,
  readJsonFileOrDefault,
  toIsoTimestamp,
  toRunId,
  writeJsonFile,
  writeJsonRollbackSafe,
} from './utils'

export type PhotoGenerationMode =
  | 'all'
  | 'missing'
  | 'single'
  | 'from-report'
  | 'ingestion-accepted'

export type PhotoPipelineOptions = {
  runId?: string
  mode: PhotoGenerationMode
  dryRun: boolean
  styleReferenceInput?: string
  providerId?: 'pollinations' | 'huggingface' | 'nanobanana'
  model?: string
  singleExerciseId?: string
  fromIngestReportPath?: string
  ingestionExerciseIds?: string[]
  allowPaidProviders?: boolean
}

export type PhotoPipelineResult = {
  runId: string
  mode: PhotoGenerationMode
  providerId: string
  model: string
  requestedExerciseIds: string[]
  generatedExerciseIds: string[]
  failedExerciseIds: Array<{ exerciseId: string; error: string }>
  metadataPath: string
  catalogWrite?: MergeWriteResult
}

type StyleReferencePayload = {
  input: string
  mimeType: string
  dataUrl: string
  descriptor: string
  digest: string
}

type ProviderContext = {
  model: string
  prompt: string
  styleReference: StyleReferencePayload
  seed: number
}

type PhotoProvider = {
  id: 'pollinations' | 'huggingface' | 'nanobanana'
  defaultModel: string
  freeTierAvailable: () => boolean
  available: () => boolean
  generate: (context: ProviderContext) => Promise<Uint8Array>
}

const POLLINATIONS_MODEL = 'flux'
const HUGGINGFACE_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0'
const NANOBANANA_MODEL = 'nanobanana-lite'

function inferMimeType(pathLike: string): string {
  const extension = extname(pathLike).toLowerCase()
  switch (extension) {
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

function hashContent(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function hashSeed(value: string): number {
  const digest = createHash('md5').update(value).digest('hex').slice(0, 8)
  return parseInt(digest, 16)
}

async function loadStyleReference(input: string | undefined): Promise<StyleReferencePayload> {
  const fallback = resolve(ROOT_DIR, 'public/exercises/placeholder.svg')
  const resolvedInput = input ?? fallback

  let bytes: Uint8Array
  let descriptor: string

  if (isHttpUrl(resolvedInput)) {
    const response = await fetch(resolvedInput)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch style reference ${resolvedInput}: ${response.status} ${response.statusText}`
      )
    }

    bytes = new Uint8Array(await response.arrayBuffer())
    descriptor = resolvedInput
  } else {
    const filePath = resolvedInput.startsWith('/')
      ? resolvedInput
      : resolve(ROOT_DIR, resolvedInput)
    bytes = await readFile(filePath)
    descriptor = filePath
  }

  const mimeType = inferMimeType(resolvedInput)
  const base64 = Buffer.from(bytes).toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`

  return {
    input: resolvedInput,
    mimeType,
    dataUrl,
    descriptor,
    digest: hashContent(dataUrl),
  }
}

function buildPrompt(
  exercise: ExerciseCatalogEntry,
  styleReference: StyleReferencePayload
): string {
  const primaryMuscles = exercise.primaryMuscles.join(', ')
  const secondaryMuscles = exercise.secondaryMuscles.join(', ')
  const equipment = exercise.equipment.join(', ')

  return [
    'Create a clean instructional fitness exercise image.',
    `Exercise ID: ${exercise.id}`,
    `Primary muscles: ${primaryMuscles}`,
    `Secondary muscles: ${secondaryMuscles || 'none'}`,
    `Equipment: ${equipment}`,
    'Visual style: realistic anatomy, neutral gym background, no logos, no text overlays.',
    `Style reference image payload digest: ${styleReference.digest}`,
    `Style reference source: ${styleReference.descriptor}`,
  ].join('\n')
}

const pollinationsProvider: PhotoProvider = {
  id: 'pollinations',
  defaultModel: POLLINATIONS_MODEL,
  freeTierAvailable: () => true,
  available: () => true,
  generate: async (context) => {
    const promptWithStyle =
      `${context.prompt}\n` +
      `Style reference mime type: ${context.styleReference.mimeType}\n` +
      `Style reference digest: ${context.styleReference.digest}`
    const endpoint = new URL(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(promptWithStyle)}`
    )
    endpoint.searchParams.set('model', context.model)
    endpoint.searchParams.set('seed', String(context.seed))
    endpoint.searchParams.set('width', '1024')
    endpoint.searchParams.set('height', '1024')
    endpoint.searchParams.set('nologo', 'true')

    const response = await fetch(endpoint.toString())
    if (!response.ok) {
      throw new Error(`Pollinations request failed: ${response.status} ${response.statusText}`)
    }

    return new Uint8Array(await response.arrayBuffer())
  },
}

const huggingFaceProvider: PhotoProvider = {
  id: 'huggingface',
  defaultModel: HUGGINGFACE_MODEL,
  freeTierAvailable: () => Boolean(process.env.HUGGINGFACE_API_TOKEN),
  available: () => Boolean(process.env.HUGGINGFACE_API_TOKEN),
  generate: async (context) => {
    const token = process.env.HUGGINGFACE_API_TOKEN
    if (!token) {
      throw new Error('HUGGINGFACE_API_TOKEN is not set.')
    }

    const endpoint = `https://api-inference.huggingface.co/models/${context.model}`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: context.prompt,
        parameters: {
          seed: context.seed,
          style_reference: context.styleReference.dataUrl,
        },
      }),
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(
        `Hugging Face request failed: ${response.status} ${response.statusText} ${message}`
      )
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as { error?: string }
      throw new Error(`Hugging Face returned JSON error: ${payload.error ?? 'unknown error'}`)
    }

    return new Uint8Array(await response.arrayBuffer())
  },
}

const nanobananaProvider: PhotoProvider = {
  id: 'nanobanana',
  defaultModel: NANOBANANA_MODEL,
  freeTierAvailable: () => {
    const flag = process.env.NANOBANANA_FREE_TIER_AVAILABLE
    return flag === 'true' && Boolean(process.env.NANOBANANA_API_KEY)
  },
  available: () => Boolean(process.env.NANOBANANA_API_KEY),
  generate: async (context) => {
    const apiKey = process.env.NANOBANANA_API_KEY
    if (!apiKey) {
      throw new Error('NANOBANANA_API_KEY is not set.')
    }

    const endpoint = process.env.NANOBANANA_ENDPOINT ?? 'https://api.nanobanana.ai/v1/images'
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: context.model,
        prompt: context.prompt,
        seed: context.seed,
        styleReference: {
          mimeType: context.styleReference.mimeType,
          dataUrl: context.styleReference.dataUrl,
        },
      }),
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(
        `Nanobanana request failed: ${response.status} ${response.statusText} ${message}`
      )
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as {
        imageBase64?: string
        imageUrl?: string
        error?: string
      }

      if (payload.error) {
        throw new Error(`Nanobanana error: ${payload.error}`)
      }

      if (payload.imageBase64) {
        return Buffer.from(payload.imageBase64, 'base64')
      }

      if (payload.imageUrl) {
        const imageResponse = await fetch(payload.imageUrl)
        if (!imageResponse.ok) {
          throw new Error('Nanobanana returned imageUrl but download failed.')
        }
        return new Uint8Array(await imageResponse.arrayBuffer())
      }

      throw new Error('Nanobanana JSON response did not contain image data.')
    }

    return new Uint8Array(await response.arrayBuffer())
  },
}

const ALL_PROVIDERS: PhotoProvider[] = [
  pollinationsProvider,
  huggingFaceProvider,
  nanobananaProvider,
]

function pickProvider(options: {
  providerId?: string
  model?: string
  allowPaidProviders: boolean
}): { provider: PhotoProvider; model: string } {
  const { providerId, model, allowPaidProviders } = options

  if (providerId) {
    const provider = ALL_PROVIDERS.find((item) => item.id === providerId)
    if (!provider) {
      throw new Error(`Unknown photo provider "${providerId}".`)
    }

    if (!provider.available()) {
      throw new Error(`Photo provider "${provider.id}" is not available in this environment.`)
    }

    if (!allowPaidProviders && !provider.freeTierAvailable()) {
      throw new Error(
        `Photo provider "${provider.id}" does not expose a free tier in this environment. ` +
          'Use --allow-paid-providers to override.'
      )
    }

    return {
      provider,
      model: model ?? provider.defaultModel,
    }
  }

  for (const provider of ALL_PROVIDERS) {
    if (!provider.available()) {
      continue
    }

    if (provider.freeTierAvailable()) {
      return {
        provider,
        model: model ?? provider.defaultModel,
      }
    }
  }

  if (allowPaidProviders) {
    const available = ALL_PROVIDERS.find((provider) => provider.available())
    if (available) {
      return {
        provider: available,
        model: model ?? available.defaultModel,
      }
    }
  }

  throw new Error(
    'No image provider available in free-tier mode. Configure Pollinations/Hugging Face or set --allow-paid-providers.'
  )
}

function representativeImageUrl(exercise: ExerciseCatalogEntry): string | undefined {
  return exercise.images.find((image) => image.isRepresentative)?.url
}

async function selectExerciseIdsByMode(
  exercises: ExerciseCatalogEntry[],
  options: PhotoPipelineOptions
): Promise<string[]> {
  if (options.mode === 'all') {
    return exercises.map((exercise) => exercise.id)
  }

  if (options.mode === 'single') {
    if (!options.singleExerciseId) {
      throw new Error('--exercise is required when mode=single.')
    }
    return [options.singleExerciseId]
  }

  if (options.mode === 'ingestion-accepted') {
    return options.ingestionExerciseIds ?? []
  }

  if (options.mode === 'from-report') {
    if (!options.fromIngestReportPath) {
      throw new Error('--from-ingest-report is required when mode=from-report.')
    }

    const reportPath = options.fromIngestReportPath.startsWith('/')
      ? options.fromIngestReportPath
      : resolve(ROOT_DIR, options.fromIngestReportPath)
    const report = await readJsonFile<IngestionReport>(reportPath)
    return report.acceptedExerciseIds
  }

  const missingExerciseIds: string[] = []

  for (const exercise of exercises) {
    const representative = representativeImageUrl(exercise)
    if (!representative || !representative.startsWith('/exercises/images/')) {
      missingExerciseIds.push(exercise.id)
      continue
    }

    const imagePath = resolve(ROOT_DIR, 'public', representative.slice(1))
    if (!(await fileExists(imagePath))) {
      missingExerciseIds.push(exercise.id)
    }
  }

  return missingExerciseIds
}

function upsertRepresentativeImage(
  exercise: ExerciseCatalogEntry,
  url: string
): ExerciseCatalogEntry {
  const retained = exercise.images.filter((image) => !image.isRepresentative)

  return {
    ...exercise,
    images: [
      {
        url,
        alt: exercise.id.replace(/_/g, ' '),
        isRepresentative: true,
      },
      ...retained,
    ],
  }
}

export async function runExercisePhotoPipeline(
  options: PhotoPipelineOptions
): Promise<PhotoPipelineResult> {
  const runId = options.runId ?? toRunId('photo')
  const dryRun = options.dryRun

  const [exercises, styleReference] = await Promise.all([
    readJsonFileOrDefault<ExerciseCatalogEntry[]>(EXERCISE_CATALOG_PATH, []),
    loadStyleReference(options.styleReferenceInput),
  ])

  const requestedExerciseIds = await selectExerciseIdsByMode(exercises, options)
  const targetSet = new Set(requestedExerciseIds)
  const targetExercises = exercises.filter((exercise) => targetSet.has(exercise.id))

  const selection = pickProvider({
    providerId: options.providerId,
    model: options.model,
    allowPaidProviders: options.allowPaidProviders ?? false,
  })

  await ensureDir(EXERCISE_IMAGES_DIR)
  await ensureDir(INGESTION_RUNS_DIR)

  const generatedExerciseIds: string[] = []
  const failedExerciseIds: Array<{ exerciseId: string; error: string }> = []

  const updatedCatalog = [...exercises]

  for (const exercise of targetExercises) {
    const prompt = buildPrompt(exercise, styleReference)
    const seed = hashSeed(exercise.id)

    try {
      const bytes = await selection.provider.generate({
        model: selection.model,
        prompt,
        styleReference,
        seed,
      })

      const relativeUrl = `/exercises/images/${exercise.id}.png`
      const outputPath = resolve(EXERCISE_IMAGES_DIR, `${exercise.id}.png`)

      if (!dryRun) {
        await writeFile(outputPath, Buffer.from(bytes))
      }

      const index = updatedCatalog.findIndex((item) => item.id === exercise.id)
      if (index >= 0) {
        updatedCatalog[index] = upsertRepresentativeImage(updatedCatalog[index], relativeUrl)
      }

      generatedExerciseIds.push(exercise.id)
    } catch (error) {
      failedExerciseIds.push({
        exerciseId: exercise.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  let catalogWrite: MergeWriteResult | undefined

  if (generatedExerciseIds.length > 0) {
    catalogWrite = await writeJsonRollbackSafe({
      targetPath: EXERCISE_CATALOG_PATH,
      value: updatedCatalog,
      backupDir: INGESTION_BACKUPS_DIR,
      dryRun,
      backupPrefix: `${runId}-photo-catalog`,
    })
  }

  const metadataPath = resolve(INGESTION_RUNS_DIR, `${runId}.photo-run.json`)
  await writeJsonFile(metadataPath, {
    runId,
    createdAt: toIsoTimestamp(),
    mode: options.mode,
    dryRun,
    providerId: selection.provider.id,
    model: selection.model,
    styleReference: {
      input: styleReference.input,
      digest: styleReference.digest,
      mimeType: styleReference.mimeType,
    },
    requestedExerciseIds,
    generatedExerciseIds,
    failedExerciseIds,
  })

  return {
    runId,
    mode: options.mode,
    providerId: selection.provider.id,
    model: selection.model,
    requestedExerciseIds,
    generatedExerciseIds,
    failedExerciseIds,
    metadataPath,
    catalogWrite,
  }
}
