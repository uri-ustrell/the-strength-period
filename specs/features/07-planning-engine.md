# Feature 07 — Planning Engine

## Dependencies
Step 2 (Exercises) must be complete.

## Acceptance Criteria
- [ ] Vercel Serverless Function for AI inference (api/generate-plan.ts)
- [ ] 5 training presets fully defined with muscle distribution
- [ ] System prompt includes periodization rules, muscle distribution rules, rehab rules
- [ ] Sends filtered exercise catalog (by user equipment) in prompt
- [ ] Parses JSON response into Mesocycle type with validation
- [ ] Handles AI service errors gracefully (network error, rate limit, parse error)
- [ ] Planning adjuster: skip session recalculation, manual load adjustment
- [ ] Model configurable via env var (default: Gemini 2.5 Flash)

## Files to Create

```
src/types/planning.ts                       ← (may exist from DATA_MODEL)
api/generate-plan.ts                        ← Vercel Serverless Function (Gemini 2.5 Flash)
src/data/presets.ts                         ← 5 preset definitions
src/services/planning/planningEngine.ts     ← Build payload, call /api/generate-plan, parse response
src/services/planning/planningAdjuster.ts   ← Skip/adjust logic
src/stores/planningStore.ts
src/i18n/locales/ca/planning.json
src/i18n/locales/es/planning.json
src/i18n/locales/en/planning.json
specs/prompts/planning-system.md            ← Full system prompt
```

## planningEngine.ts API

```typescript
async function generateMesocycle(
  preset: Preset,
  config: UserConfig,
  availableExercises: Exercise[]
): Promise<Mesocycle>
```

Logic:
1. Filter exercises by user's equipment
2. Build payload with preset + config details + filtered exercise catalog
3. Call `/api/generate-plan` endpoint (POST)
4. Parse JSON from response
5. Validate against Mesocycle schema
6. Generate UUIDs for mesocycle and all session templates
7. Return typed Mesocycle

## 5 Presets (src/data/presets.ts)

```typescript
interface Preset {
  id: string
  nameKey: string
  durationOptions: number[]       // weeks
  muscleDistribution: Record<MuscleGroup, number>  // percentage
  requiredTags: ExerciseTag[]
  autoRestrictions: string[]
  progressionType: ProgressionType
  profiles: UserProfile[]         // compatible profiles
  notes?: string
}
```

1. `corredor_general` — 6/8/12 weeks, glutis 30%, quads 25%, isquio 20%, calves 10%, core 15%
2. `pujada` — 6/8 weeks, glutis 35%, quads 30%, psoes 10%, calves 10%, core 15%
3. `rehab_tendinitis_anserina` — 8/12 weeks, isquio 25%, adductors 20%, quads 20%, glutis 20%, mobility 15%
4. `forca_general` — 8/12 weeks, lower 40%, upper 35%, core 15%, mobility 10%
5. `mobilitat_prevencio` — 4/6/8 weeks, hip mob 25%, thoracic 20%, ankle 15%, hip stab 20%, fascia+core 20%
