import 'dotenv/config'

import { getArg, hasFlag, parseArgs } from './ingestion/cli'
import { type PhotoGenerationMode, runExercisePhotoPipeline } from './ingestion/photoPipeline'

function printHelp(): void {
  console.log(`
Exercise Photo Generator

Usage:
  npm run photos -- [--all | --missing | --exercise <id> | --from-ingest-report <path>] [options]

Mode flags (pick one):
  --all                         Generate for all exercises
  --missing                     Generate only missing representative images (default)
  --exercise <id>               Generate for a single exercise id
  --from-ingest-report <path>   Generate for acceptedExerciseIds from an ingestion report

Other options:
  --run-id <id>
  --style-ref <path|url>        Style reference image path or URL
  --provider <id>               pollinations | huggingface | nanobanana
  --model <model>
  --allow-paid-providers
  --dry-run
  --help
`)
}

function resolveMode(args: ReturnType<typeof parseArgs>): PhotoGenerationMode {
  if (hasFlag(args, 'all')) return 'all'
  if (hasFlag(args, 'missing')) return 'missing'
  if (getArg(args, 'exercise')) return 'single'
  if (getArg(args, 'from-ingest-report')) return 'from-report'
  return 'missing'
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (hasFlag(args, 'help')) {
    printHelp()
    return
  }

  const mode = resolveMode(args)

  const result = await runExercisePhotoPipeline({
    runId: getArg(args, 'run-id'),
    mode,
    dryRun: hasFlag(args, 'dry-run'),
    styleReferenceInput: getArg(args, 'style-ref'),
    providerId: getArg(args, 'provider') as
      | 'pollinations'
      | 'huggingface'
      | 'nanobanana'
      | undefined,
    model: getArg(args, 'model'),
    singleExerciseId: getArg(args, 'exercise'),
    fromIngestReportPath: getArg(args, 'from-ingest-report'),
    allowPaidProviders: hasFlag(args, 'allow-paid-providers'),
  })

  console.log(`Run: ${result.runId}`)
  console.log(`Mode: ${result.mode}`)
  console.log(`Provider: ${result.providerId}`)
  console.log(`Model: ${result.model}`)
  console.log(`Requested: ${result.requestedExerciseIds.length}`)
  console.log(`Generated: ${result.generatedExerciseIds.length}`)
  console.log(`Failed: ${result.failedExerciseIds.length}`)
  console.log(`Metadata: ${result.metadataPath}`)

  if (result.catalogWrite?.written) {
    console.log(`Catalog updated: ${result.catalogWrite.targetPath}`)
  }

  if (result.failedExerciseIds.length > 0) {
    console.log('Failures:')
    for (const failure of result.failedExerciseIds) {
      console.log(`- ${failure.exerciseId}: ${failure.error}`)
    }
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Photo pipeline failed: ${message}`)
  process.exitCode = 1
})
