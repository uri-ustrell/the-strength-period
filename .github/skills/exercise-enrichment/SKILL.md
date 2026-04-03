---
name: exercise-enrichment
description: "Enrich exercise data from free-exercise-db with tags, restrictions, muscle group mappings, and i18n translations. Use when: adding exercises, translating exercise names, mapping muscles, tagging exercises for presets."
---

# Exercise Enrichment Workflow

## When to Use
- Adding new exercises to the enrichment map
- Translating exercise names to ca/es/en
- Mapping free-exercise-db exercises to our muscle taxonomy
- Expanding coverage for training presets

## Procedure

### 1. Load Context
1. Read `specs/DATA_MODEL.md` — valid MuscleGroup, Equipment, ExerciseTag values
2. Read `specs/features/02-exercises.md` — enrichment requirements
3. Read `src/data/exerciseEnrichment.ts` — current enrichment state
4. Scan `public/exercises/exercises.json` — available source exercises

### 2. Identify Gaps
Check which muscle groups have fewer than 5 enriched exercises:
- Priority: lower body → core → mobility → upper body → rehab

### 3. Enrich
For each new exercise:
1. Map `primaryMuscles` and `secondaryMuscles` to our `MuscleGroup` values
2. Map `equipment` to our `Equipment` enum
3. Assign `tags` based on exercise utility (corredor, rehab_genoll, etc.)
4. Add `restrictions` where applicable
5. Set `level` (beginner/intermediate/expert) and `category`
6. Create `nameKey` as `exercises:exercise_id`
7. Set `estimatedSeriesDurationSeconds` (typically 30-90s)

### 4. Translate
Add translations to:
- `src/i18n/locales/ca/exercises.json`
- `src/i18n/locales/es/exercises.json`
- `src/i18n/locales/en/exercises.json`

### 5. Verify
- All MuscleGroup values are valid (from DATA_MODEL.md)
- All Equipment values are valid
- All ExerciseTag values are valid
- No duplicate exercise IDs
- All nameKeys have translations in all 3 languages
