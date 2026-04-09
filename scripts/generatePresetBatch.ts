import { getArg, getNumberArg, hasFlag, parseArgs } from './ingestion/cli'
import { runPresetBatchGenerator } from './ingestion/presetGenerator'

function printHelp(): void {
  console.log(`
Preset Batch Generator (Claude)

Usage:
  npm run presets -- --prompt-file <path> [options]
  npm run presets -- --response-file <path> [options]

Prompt options:
  --prompt <text>               Prompt text inline
  --prompt-file <path>          Prompt text file
  --response-file <path>        Skip API call and validate an existing JSON response file

Other options:
  --run-id <id>
  --model <id>                  Claude model (default: claude-3-5-haiku-latest)
  --max-presets <n>             Max presets to process (default: 20)
  --output <path>               Preset catalog output path (default: data/ingestion/presets/catalog.json)
  --allow-paid
  --dry-run
  --help
`)
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (hasFlag(args, 'help')) {
    printHelp()
    return
  }

  const hasPrompt = Boolean(getArg(args, 'prompt') || getArg(args, 'prompt-file'))
  const hasResponseFile = Boolean(getArg(args, 'response-file'))

  if (!hasPrompt && !hasResponseFile) {
    throw new Error('Provide --prompt/--prompt-file or --response-file.')
  }

  const result = await runPresetBatchGenerator({
    runId: getArg(args, 'run-id'),
    dryRun: hasFlag(args, 'dry-run'),
    allowPaid: hasFlag(args, 'allow-paid'),
    model: getArg(args, 'model') ?? 'claude-3-5-haiku-latest',
    maxPresets: getNumberArg(args, 'max-presets', 20, { min: 1, max: 200 }),
    outputPath: getArg(args, 'output'),
    promptText: getArg(args, 'prompt'),
    promptFilePath: getArg(args, 'prompt-file'),
    responseFilePath: getArg(args, 'response-file'),
  })

  console.log(`Report: ${result.reportPath}`)
  console.log(`Accepted presets: ${result.acceptedPresetIds.length}`)
  console.log(`Rejected presets: ${result.rejectedCount}`)

  if (result.catalogWritePath) {
    console.log(`Catalog updated: ${result.catalogWritePath}`)
  }

  if (result.backupPath) {
    console.log(`Backup: ${result.backupPath}`)
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Preset batch generation failed: ${message}`)
  process.exitCode = 1
})
