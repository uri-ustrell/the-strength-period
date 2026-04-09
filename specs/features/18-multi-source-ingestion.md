# Feature 18 — Multi-Source Content Ingestion Pipeline

## Description

Implement a deterministic Node pipeline that ingests exercises and presets from multiple source adapters (external APIs and LLM JSON outputs), validates them into canonical contracts, deduplicates before merge, gates low-confidence items through a review queue, and emits auditable ingestion reports.

The pipeline must stay local-first for app runtime: all ingestion happens offline/CLI at development time, then merges into static datasets.

## Dependencies

- Step 2 ✅ (Exercise data model + static catalog)
- Step 7 ✅ (Preset model + planning flow)
- Step 15 ✅ (LLM JSON contract experience)

## Acceptance Criteria

- [x] Canonical contracts exist for exercise candidates, preset candidates, and ingestion report outputs
- [x] Source-adapter architecture supports multiple providers (external API payloads + LLM JSON payloads)
- [x] Normalization + validation maps source payloads into canonical app structures with readable errors
- [x] Dedup includes source ID registry, slug collision, title/muscle similarity, and alias-map matching
- [x] Low-confidence candidates are gated into an accept/reject review queue before merge
- [x] Exercise photo pipeline supports provider abstraction (free-tier-first), style reference input, and one-model-per-run metadata lock
- [x] Photo pipeline supports modes: all, missing, single exercise, from ingestion report
- [x] Ingestion success path can trigger photo generation for newly accepted exercises
- [x] Preset batch generator uses Claude API flow (free-tier-first) and validates output against available exercise IDs
- [x] Ingestion reports include accepted/skipped/duplicate/rejected counts with reasons
- [x] Dry-run and rollback-safe merge are available
- [x] Legal/licensing metadata is validated per source before merge
- [x] `npm run build` passes

## Implementation Scope

### New Scripts

- `scripts/ingestion/contracts.ts`
- `scripts/ingestion/paths.ts`
- `scripts/ingestion/utils.ts`
- `scripts/ingestion/adapters/*.ts`
- `scripts/ingestion/normalizers.ts`
- `scripts/ingestion/validators.ts`
- `scripts/ingestion/dedup.ts`
- `scripts/ingestion/reviewQueue.ts`
- `scripts/ingestion/reports.ts`
- `scripts/ingestion/merge.ts`
- `scripts/ingestion/photoPipeline.ts`
- `scripts/ingestion/presetGenerator.ts`
- `scripts/runIngestion.ts`
- `scripts/generateExercisePhotos.ts`
- `scripts/generatePresetBatch.ts`

### New Artifacts

- `data/ingestion/reports/*`
- `data/ingestion/queues/*`
- `data/ingestion/runs/*`
- `data/ingestion/backups/*`
- `data/ingestion/source-registry.json`
- `data/ingestion/alias-map.json`
- `data/ingestion/presets/catalog.json`

## Operational Rules

- Source-level license metadata is mandatory and must explicitly allow redistribution.
- Dedup decisions are deterministic and reproducible for equal input.
- Merge writes are rollback-safe with timestamped backup artifacts.
- Dry-run performs full fetch/normalize/validate/dedup/review/report but does not mutate source catalogs.
- Photo generation run metadata persists provider/model lock and generated exercise IDs.
