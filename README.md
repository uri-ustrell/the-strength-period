# The Strength Period

Train with intelligence. Your data stays on your device.
A local-first fitness web app that generates personalized plans with AI, tracks sessions in real time, and stores user data in IndexedDB.

## Architecture

```text
Browser
  ├── IndexedDB ──────────────→ Local persistence (plans, executions, config)
  ├── Exercises ──────────────→ /public/exercises/exercises.json (pre-built, enriched)
  └── Export / Import ────────→ JSON file (data portability)

Exercise data pipeline (dev-time):
  data/raw/free-exercise-db.json + enrichment + mappings
    → scripts/buildExercises.ts
    → public/exercises/exercises.json (our source of truth)
```

User data remains local. Exercise data is pre-built at development time.

## Prerequisites

- Node.js 18+
- npm 9+
- Vercel CLI installed (`npm i -g vercel`) for full-stack local dev
- Gemini API key (Google AI Studio)

## Environment Variables

Create `.env.local` from `.env.example`.

Required:
- `GEMINI_API_KEY`: key used by `api/generate-plan.ts`

Optional:
- `GEMINI_MODEL`: overrides server default model (`gemini-2.5-flash`)
- `VITE_MOCK_API`: frontend MSW flag (`true` enables mock response for `/api/generate-plan`)
- `CLAUDE_API_KEY`: required for live `npm run presets` Claude generation (optional if validating from `--response-file`)
- `CLAUDE_FREE_TIER_AVAILABLE`: set to `true` to keep preset generation in free-tier mode by default
- `HUGGINGFACE_API_TOKEN`: optional free-tier provider token for `npm run photos`
- `NANOBANANA_API_KEY`: optional fallback provider key for `npm run photos`
- `NANOBANANA_FREE_TIER_AVAILABLE`: set to `true` only when Nanobanana free tier is confirmed
- `NANOBANANA_ENDPOINT`: optional Nanobanana endpoint override

Example:

```env
GEMINI_API_KEY=your-gemini-api-key-here
# GEMINI_MODEL=gemini-2.5-flash
VITE_MOCK_API=false
# CLAUDE_API_KEY=your-claude-api-key
# CLAUDE_FREE_TIER_AVAILABLE=false
# HUGGINGFACE_API_TOKEN=hf_xxx
# NANOBANANA_API_KEY=your-nanobanana-key
# NANOBANANA_FREE_TIER_AVAILABLE=false
# NANOBANANA_ENDPOINT=https://api.nanobanana.ai/v1/images
```

## Quick Start

```bash
git clone https://github.com/YOUR_USER/the-strength-period.git
cd the-strength-period
npm install
cp .env.example .env.local
npm run dev
```

## Development Commands

- `npm run dev`: frontend Vite dev mode (use `VITE_MOCK_API=true` for browser mocked API requests)
- `npm run dev:api`: full-stack local mode via `vercel dev` (frontend + `/api/*` functions)
- `npm run dev:frontend`: frontend-only Vite mode with mock API disabled (`VITE_MOCK_API=false`)
- `npm run build`: TypeScript check + Vite production build
- `npm run preview`: serve production build locally
- `npm run lint`: TypeScript check only
- `npm run ingest`: run Step 18 multi-source ingestion (`scripts/runIngestion.ts`)
- `npm run photos`: run Step 18 exercise photo pipeline (`scripts/generateExercisePhotos.ts`)
- `npm run presets`: run Step 18 preset batch pipeline (`scripts/generatePresetBatch.ts`)

## Step 18 Ingestion Workflows

Example dry-run ingestion:

```bash
npm run ingest -- --config data/ingestion/sources.example.json --dry-run
```

Example missing-photo generation with style reference:

```bash
npm run photos -- --missing --style-ref public/exercises/placeholder.svg --dry-run
```

Example preset validation from saved Claude response:

```bash
npm run presets -- --response-file data/ingestion/claude-response.json --dry-run
```

## Build

```bash
npm run build
```

## Tech Stack

- React 18 + TypeScript 5 + Vite 5
- Tailwind CSS v3
- Zustand v4
- i18next (ca/es/en)
- IndexedDB via `idb`
- Gemini API via Vercel Serverless Function

## License

ISC
