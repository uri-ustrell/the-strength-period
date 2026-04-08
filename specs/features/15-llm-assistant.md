# Feature 15 — User-Owned LLM Assistant

## Description

Provide an alternative plan creation path where the user leverages their own LLM (ChatGPT, Claude, Gemini, etc.) to generate a training plan. The app generates a ready-to-use prompt template and a downloadable CSV exercise catalog. The user copies the prompt into their LLM, attaches the CSV, pastes back the LLM's JSON response, and the app validates and imports the plan.

This is the core deliverable of Architecture Decision 3 (see `specs/STATUS_HISTORY.md`).

**Key principle:** The prompt template is always in English (LLMs perform best in English). All surrounding UI chrome (buttons, labels, instructions shown to the user) is i18n'd in ca/es/en.

## Dependencies

- Step 14 ✅ (Deterministic Planning — `Mesocycle` type, `planningEngine.ts`, `PlanCreator` wizard, `mesocycleRepository`)

## Acceptance Criteria

- [ ] New `LLMAssistant` component accessible from PlanCreator `configure` step via "Use LLM Assistant" action
- [ ] Prompt template generated dynamically from user config (preset, weeks, days, minutes, equipment, restrictions, personal notes)
- [ ] Prompt text displayed in a read-only area with "Copy to clipboard" button
- [ ] CSV exercise catalog generated from the user's equipment-filtered exercise pool
- [ ] CSV downloadable via button (filename: `exercise-catalog.csv`)
- [ ] Numbered step-by-step instructions shown to the user (i18n'd)
- [ ] Free-form personal notes textarea (optional, max 500 characters, persisted in config)
- [ ] Personal notes injected into the prompt template when non-empty
- [ ] JSON paste textarea for the LLM's response
- [ ] "Validate" button triggers validation against the defined schema
- [ ] Validation errors shown as a structured list with actionable messages
- [ ] On valid JSON: "Import plan" button appears
- [ ] Import converts the simplified LLM JSON to a full `Mesocycle` and saves via existing infrastructure (`saveMesocycle`)
- [ ] Imported plan appears in the preview step, same as deterministic flow
- [ ] Back navigation returns to `configure` step
- [ ] All i18n keys added in ca/es/en (planning namespace)
- [ ] `npm run build` passes with zero errors
- [ ] All existing PlanCreator deterministic flow continues to work unmodified

---

## Prompt Template

The prompt is always English. Dynamic values are injected at generation time from user config.

~~~
You are an expert personal trainer specializing in periodized strength training.

## Task

Generate a structured training plan (mesocycle) in JSON format based on the user's parameters and the exercise catalog provided in the attached CSV file.

## User Parameters

- Goal: {{presetName}}
- Duration: {{durationWeeks}} weeks
- Training days per week: {{daysPerWeek}} ({{dayNames}})
- Minutes per session: {{minutesPerSession}}
- Equipment available: {{equipmentList}}
- Active restrictions: {{restrictionsList or "None"}}
- Progression intensity: {{weeklyProgression}}/10 (0 = maintenance, 10 = aggressive)

{{#if personalNotes}}
## Personal Notes

{{personalNotes}}
{{/if}}

## Exercise Catalog

See the attached CSV file. Each row is an exercise you may use. Use ONLY exercise IDs from this catalog. The CSV columns are:
- id: unique identifier (use this in exerciseId)
- name: exercise name
- primaryMuscles: main muscles targeted (semicolon-separated)
- secondaryMuscles: supporting muscles (semicolon-separated)
- equipment: required equipment (semicolon-separated)
- level: beginner / intermediate / expert
- category: strength / mobility / stability / plyometrics / cardio
- progressionMetric: weight / reps / seconds
- estimatedSeriesDurationSeconds: approximate time per set
- restrictions: conditions where this exercise should be avoided (semicolon-separated)

## Required JSON Output

Return a JSON object with this EXACT structure:

```json
{
  "name": "string — descriptive plan name",
  "durationWeeks": <number>,
  "sessions": [
    {
      "weekNumber": <number, 1-based>,
      "dayOfWeek": <number, 1=Monday ... 7=Sunday>,
      "durationMinutes": <number>,
      "exercises": [
        {
          "exerciseId": "string — must match an id from the CSV",
          "sets": <number, 1-6>,
          "reps": <number OR [min, max]>,
          "weightKg": <number, optional — only for progressionMetric=weight>,
          "rpe": <number, 5-10, optional>,
          "restSeconds": <number, 30-180>
        }
      ]
    }
  ]
}
```

## Rules

1. Use ONLY exerciseId values from the provided CSV — do not invent IDs.
2. Each session's total time (sum of sets × estimatedSeriesDurationSeconds + restSeconds × (sets-1) for each exercise) must be within ±10% of {{minutesPerSession}} minutes.
3. Apply progressive overload: gradually increase volume or intensity across weeks.
4. Schedule a deload week (60% volume) at every 4th week (weeks 4, 8, 12...).
5. No exercise should appear in two consecutive sessions.
6. Avoid repeating exercises targeting the same primary muscle group within the same session.
7. RPE: start around 6.0 in week 1, increase ~0.25 per week, cap at 9.5. Deload weeks use RPE ≤ 6.
8. restSeconds: between 30 and 180.
9. If the user has active restrictions, do NOT use exercises whose restrictions column includes those conditions.
10. For progressionMetric "weight": use reps as a range [8,12], increase weightKg ~5% per week.
11. For progressionMetric "reps": increase reps each week.
12. For progressionMetric "seconds": increase hold duration each week.
13. Scale weekly progression proportionally to the progression intensity ({{weeklyProgression}}/10).

Return ONLY the JSON object — no explanations, no markdown code fences, no additional text.
~~~

### Template Variable Resolution

| Variable | Source |
|---|---|
| `{{presetName}}` | English label for the selected preset, or `"Custom"` if no preset |
| `{{durationWeeks}}` | `weeks` from configure step |
| `{{daysPerWeek}}` | `config.trainingDays.length` |
| `{{dayNames}}` | Training days mapped to English names: `"Monday, Wednesday, Friday"` |
| `{{minutesPerSession}}` | `config.minutesPerSession` |
| `{{equipmentList}}` | `config.equipment` joined with `, ` using English labels |
| `{{restrictionsList}}` | `config.activeRestrictions` joined with `, ` using English labels, or `"None"` |
| `{{weeklyProgression}}` | `weeklyProgression` slider value (0–10) |
| `{{personalNotes}}` | Free-form text from the user (omit entire section if empty) |

---

## CSV Format

**Filename:** `exercise-catalog.csv`

**Columns:**

| Column | Type | Example |
|---|---|---|
| `id` | string | `Barbell_Squat` |
| `name` | string | `Barbell Squat` |
| `primaryMuscles` | semicolon-separated | `quadriceps;glutis` |
| `secondaryMuscles` | semicolon-separated | `isquiotibials;abdominal` |
| `equipment` | semicolon-separated | `barra` |
| `level` | string | `intermediate` |
| `category` | string | `strength` |
| `progressionMetric` | string | `weight` |
| `estimatedSeriesDurationSeconds` | number | `45` |
| `restrictions` | semicolon-separated | `rehab_genoll:avoid` |

**Content:** All exercises from the user's equipment-filtered pool (same filter as the deterministic wizard: `filterExercises(exercises, { equipment, excludeRestrictions })`).

**Notes:**
- Exercise `name` uses the English translation via `i18next.t('exercises:${id}', { lng: 'en' })`.
- The `restrictions` column uses the format `condition:action` (e.g., `rehab_genoll:avoid`).
- Tags column intentionally omitted — exercise selection is the LLM's responsibility; tags would add noise.
- CSV uses RFC 4180 format: fields containing commas, semicolons, or double quotes are double-quote-escaped.

---

## LLM Response JSON Schema

### Simplified Type (what the LLM returns)

```typescript
export type LLMPlanResponse = {
  name: string
  durationWeeks: number
  sessions: LLMSession[]
}

export type LLMSession = {
  weekNumber: number
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7
  durationMinutes: number
  exercises: LLMExercise[]
}

export type LLMExercise = {
  exerciseId: string
  sets: number
  reps: number | [number, number]
  weightKg?: number
  rpe?: number
  restSeconds: number
}
```

### Conversion to `Mesocycle`

The app converts a validated `LLMPlanResponse` to a full `Mesocycle`:

```typescript
function convertToMesocycle(
  response: LLMPlanResponse,
  presetId: string,
  config: UserConfig,
  exerciseMap: Map<string, Exercise>,
): Mesocycle
```

**Mapping rules:**

| LLM field | Mesocycle field |
|---|---|
| — | `id` → `crypto.randomUUID()` |
| `name` | `name` |
| — | `presetId` → selected preset ID or `'llm_custom'` |
| — | `startDate` → `new Date().toISOString().split('T')[0]` |
| `durationWeeks` | `durationWeeks` |
| `sessions` | `sessions` (converted, see below) |
| — | `createdAt` → `new Date().toISOString()` |
| — | `active` → `true` |

**Session conversion:**

| LLM field | SessionTemplate field |
|---|---|
| — | `id` → `crypto.randomUUID()` |
| — | `mesocycleId` → parent mesocycle ID |
| `weekNumber` | `weekNumber` |
| `dayOfWeek` | `dayOfWeek` |
| `durationMinutes` | `durationMinutes` |
| — | `progressionType` → `'linear'` (default) |
| — | `restrictions` → `config.activeRestrictions` |
| — | `completed` → `false` |
| — | `skipped` → `false` |
| `exercises` | `muscleGroupTargets` + `exerciseAssignments` (derived) |

**Exercise → MuscleGroupTarget + ExerciseAssignment conversion:**

For each `LLMExercise` in a session:

1. Look up the exercise in the catalog by `exerciseId`.
2. Use `exercise.primaryMuscles[0]` as the muscle group.
3. Create a `MuscleGroupTarget`:
   - `muscleGroup`: exercise's first primary muscle
   - `percentageOfSession`: `Math.round(100 / session.exercises.length)` (evenly distributed)
   - `loadTarget`: `{ sets, reps, weightKg, rpe, restSeconds }` from the LLM exercise
4. Create an `ExerciseAssignment`:
   - `muscleGroup`: same as above
   - `exerciseId`: from the LLM exercise
   - `progressionMetric`: from the catalog exercise

---

## Validation Rules

When the user clicks "Validate", the pasted JSON goes through these checks in order. Structural errors block import; warnings are informational.

### Pre-processing

Before parsing, attempt to strip common markdown code fences:
- Remove leading/trailing `` ```json `` and `` ``` ``
- Remove leading/trailing `` ``` `` (no language tag)
- Trim whitespace

### Structural Errors (block import)

| # | Rule | Error message key |
|---|---|---|
| 1 | Must be valid JSON | `llm.error_invalid_json` |
| 2 | Top-level must be an object with `name` (string), `durationWeeks` (number ≥ 1), `sessions` (non-empty array) | `llm.error_missing_fields` |
| 3 | Each session must have `weekNumber` (number ≥ 1), `dayOfWeek` (1–7), `durationMinutes` (number > 0), `exercises` (non-empty array) | `llm.error_invalid_session` with `{{index}}` |
| 4 | Each exercise must have `exerciseId` (string), `sets` (number 1–10), `reps` (positive number OR [min, max] with 0 < min ≤ max), `restSeconds` (number 15–300) | `llm.error_invalid_exercise` with `{{session}}`, `{{index}}` |
| 5 | `exerciseId` must exist in the user's filtered exercise catalog | `llm.error_unknown_exercise` with `{{exerciseId}}` |
| 6 | If `weightKg` present, must be a positive number | `llm.error_invalid_weight` with `{{exerciseId}}` |
| 7 | If `rpe` present, must be a number between 1 and 10 | `llm.error_invalid_rpe` with `{{exerciseId}}` |

### Warnings (shown but do not block import)

| # | Rule | Warning message key |
|---|---|---|
| W1 | Exercise appears in two consecutive sessions | `llm.warn_consecutive_exercise` with `{{exerciseId}}` |
| W2 | Two exercises share same primary muscle group in one session | `llm.warn_duplicate_muscle` with `{{muscle}}`, `{{session}}` |
| W3 | Session estimated duration >110% or <50% of user's `minutesPerSession` | `llm.warn_duration_mismatch` with `{{session}}`, `{{estimated}}`, `{{target}}` |
| W4 | `durationWeeks` doesn't match the highest `weekNumber` in sessions | `llm.warn_weeks_mismatch` |

### Error Display

- **Errors**: Red background, list with ✕ icons and interpolated messages. Shown first.
- **Warnings**: Amber background, list with ⚠ icons. Shown below errors.
- **On zero errors**: Green success message with plan summary (weeks, session count). "Import plan" button appears.
- **On zero errors with warnings**: Green success + amber warnings + "Import plan" button.

---

## UI Design

### Entry Point

From the PlanCreator `configure` step, add a secondary action below the existing "Next" button:

```
[Next →]                           ← primary button (deterministic path → muscles step)

─── llm.or_separator ───

[✨ Use LLM Assistant]             ← secondary outlined button (→ llm-assistant step)
  "Generate the plan with your      ← subtle description text
   own LLM (ChatGPT, Claude...)"
```

This adds a new step value to the existing `Step` union:
```typescript
type Step = 'preset' | 'configure' | 'muscles' | 'exercises' | 'preview' | 'llm-assistant'
```

### LLM Assistant View Layout

```
┌─────────────────────────────────────────────────────┐
│  ← Back                    LLM Assistant             │
│                                                      │
│  ┌─ How to use ───────────────────────────────────┐  │
│  │ 1. (Optional) Add personal notes below         │  │
│  │ 2. Copy the prompt                             │  │
│  │ 3. Download the exercise catalog (CSV)         │  │
│  │ 4. Open your LLM (ChatGPT, Claude, Gemini...) │  │
│  │ 5. Paste the prompt and attach the CSV         │  │
│  │ 6. Copy the LLM's JSON response               │  │
│  │ 7. Paste it below and click Validate           │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Personal notes (optional)                           │
│  ┌────────────────────────────────────────────────┐  │
│  │ e.g. "I have a weak left knee, prefer          │  │
│  │ unilateral exercises for quads"                 │  │
│  └────────────────────────────────────────────────┘  │
│  142/500                                             │
│                                                      │
│  Prompt                                              │
│  ┌────────────────────────────────────────────────┐  │
│  │ You are an expert personal trainer...          │  │
│  │ (read-only, scrollable, max-h-64, monospace)   │  │
│  └────────────────────────────────────────────────┘  │
│  [📋 Copy prompt]                                    │
│                                                      │
│  Exercise catalog                                    │
│  98 exercises matching your equipment                │
│  [📥 Download CSV]                                   │
│                                                      │
│  ─────────────────────────────────                   │
│                                                      │
│  Paste LLM response                                  │
│  ┌────────────────────────────────────────────────┐  │
│  │ (textarea, monospace, min-h-40)                │  │
│  └────────────────────────────────────────────────┘  │
│  [Validate]                                          │
│                                                      │
│  ┌─ Validation Results ──────────────────────────┐   │
│  │ ✅ Valid plan! 8 weeks, 24 sessions            │   │
│  │ ⚠️ 2 warnings:                                │   │
│  │  - "Barbell_Squat" appears in 2 consecutive...│   │
│  │  - Session 3: estimated 72 min vs target 60..│   │
│  └───────────────────────────────────────────────┘   │
│  [Import plan]                                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Component Architecture

**`LLMAssistant`** — single component in `src/components/planning/LLMAssistant.tsx`.

```typescript
interface LLMAssistantProps {
  preset: Preset | null
  config: UserConfig
  weeks: number
  daysPerWeek: number
  minutesPerSession: number
  weeklyProgression: number
  exercises: Exercise[]
  filteredExercises: Exercise[]
  onImport: (mesocycle: Mesocycle) => void
  onBack: () => void
}
```

**Internal state:**
- `personalNotes: string` — loaded from and saved to IndexedDB config
- `jsonInput: string` — the pasted JSON text
- `validationResult: ValidationResult | null` — result of last validation
- `copyFeedback: boolean` — brief "Copied!" flash

**`onImport` callback:** Called with the converted `Mesocycle`. The parent `PlanCreator` sets it as `generatedPreview` via the store and navigates to the `preview` step.

### UX Details

- **Copy prompt**: `navigator.clipboard.writeText()`. On success, show "Copied!" text for 2 seconds. On failure (non-secure context), select the text and show a "Press Ctrl+C / Cmd+C to copy" instruction.
- **CSV download**: Creates a Blob with `text/csv` MIME type, triggers download via temporary `<a>` element (same pattern as `exportData` in `exportImport.ts`).
- **JSON textarea**: Monospace font (`font-mono`), `min-h-40`, auto-grows. Placeholder text from i18n.
- **Validate button**: Disabled when textarea is empty or whitespace-only.
- **Import button**: Only rendered when `validationResult.valid === true`. Triggers conversion + store injection.
- **Character counter**: Shown below personal notes. Text turns amber (`text-amber-500`) at 400+ chars, red (`text-red-500`) at 500.
- **Personal notes persistence**: On blur, save to IndexedDB via `setConfig('llmPersonalNotes', text)`. On mount, load from `getConfig('llmPersonalNotes')`.

---

## Files to Modify/Create

### New Files

```
src/services/planning/llmAssistantService.ts    ← prompt generation, CSV generation, validation, conversion
src/components/planning/LLMAssistant.tsx         ← LLM assistant UI component
```

### Modified Files

```
src/components/planning/PlanCreator.tsx          ← Add 'llm-assistant' step + "Use LLM Assistant" button
src/stores/planningStore.ts                      ← Add setGeneratedPreview() action (if not present)
src/i18n/locales/ca/planning.json                ← New llm.* keys
src/i18n/locales/es/planning.json                ← New llm.* keys
src/i18n/locales/en/planning.json                ← New llm.* keys
```

### Files NOT Modified

```
src/types/planning.ts                            ← Mesocycle type unchanged
src/types/exercise.ts                            ← Exercise type unchanged
src/types/user.ts                                ← UserConfig unchanged (notes in config KV store)
src/services/planning/planningEngine.ts          ← Deterministic engine untouched
src/services/db/mesocycleRepository.ts           ← Reused as-is
src/services/db/configRepository.ts              ← Reused as-is (KV store)
src/services/db/exportImport.ts                  ← Unchanged
src/data/presets.ts                              ← Unchanged
src/pages/Planning.tsx                           ← PlanCreator handles new step internally
```

---

## Service Layer: `llmAssistantService.ts`

### Function Signatures

```typescript
import type { Exercise, Equipment } from '@/types/exercise'
import type { Mesocycle } from '@/types/planning'
import type { UserConfig } from '@/types/user'

// --- Prompt Generation ---

export function generatePromptTemplate(params: {
  presetName: string
  durationWeeks: number
  daysPerWeek: number
  dayNames: string
  minutesPerSession: number
  equipmentList: string
  restrictionsList: string
  weeklyProgression: number
  personalNotes?: string
}): string

// --- CSV Generation ---

export function generateExerciseCsv(
  exercises: Exercise[],
  getEnglishName: (nameKey: string) => string,
): string

// --- Validation ---

export type ValidationError = {
  key: string
  params?: Record<string, string | number>
}

export type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  parsed?: LLMPlanResponse
}

export function validateLLMResponse(
  jsonString: string,
  validExerciseIds: Set<string>,
  minutesPerSession: number,
  exerciseMap: Map<string, Exercise>,
): ValidationResult

// --- Conversion ---

export function convertToMesocycle(
  response: LLMPlanResponse,
  presetId: string,
  config: UserConfig,
  exerciseMap: Map<string, Exercise>,
): Mesocycle
```

### Label Helpers (internal)

```typescript
const EQUIPMENT_LABELS: Record<Equipment, string> = {
  pes_corporal: 'Bodyweight',
  manueles: 'Dumbbells',
  barra: 'Barbell',
  banda_elastica: 'Resistance bands',
  pilates: 'Pilates ball',
  trx: 'TRX / Suspension',
}

const DAY_NAMES: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday',
}
```

---

## Store Changes: `planningStore.ts`

Add one new action to the existing store interface (if not already present):

```typescript
interface PlanningStore {
  // ... existing fields & actions ...
  setGeneratedPreview: (mesocycle: Mesocycle) => void
}

// Implementation:
setGeneratedPreview: (mesocycle) => set({ generatedPreview: mesocycle }),
```

This allows the LLM assistant to inject a converted mesocycle directly into the preview step, bypassing the deterministic engine. The existing `saveGenerated`, `discardGenerated`, and preview rendering logic all work unchanged.

---

## Personal Notes Persistence

The free-form personal notes field is stored in IndexedDB config store using the existing KV pattern:

```typescript
// key: 'llmPersonalNotes', value: string
await setConfig('llmPersonalNotes', notesText)
const notes = await getConfig('llmPersonalNotes') as string | null
```

**Character limit:** 500 characters. Enforced via `maxLength={500}` on the `<textarea>` and a visual character counter.

---

## Edge Cases

1. **Empty exercise pool**: If equipment filter leaves 0 exercises, disable the "Use LLM Assistant" button and show a tooltip explaining that the user must select equipment in settings first.

2. **LLM returns markdown-fenced JSON**: The validator pre-processes the input to strip common code fences (`` ```json ... ``` `` and `` ``` ... ``` ``) before JSON parsing.

3. **LLM returns extra fields**: Validation ignores unknown fields (lenient parsing). Only required fields are checked.

4. **Very large paste**: If pasted text exceeds 500KB, show `llm.error_invalid_json` immediately without attempting to parse.

5. **Clipboard API unavailable**: Fall back to `document.execCommand('copy')` or prompt the user to copy manually.

6. **Multiple validations**: Each "Validate" click replaces previous results. The JSON textarea retains its content.

7. **Re-entering LLM assistant**: Personal notes and JSON textarea values are kept in React state while the PlanCreator component is mounted. Personal notes are additionally persisted on blur.

8. **Duplicate exerciseId in same session**: Flagged as structurally valid but produces a `warn_duplicate_muscle` warning.

---

## i18n Keys (planning namespace)

All keys nested under `llm` in the `planning` namespace.

| Key | CA | ES | EN |
|-----|----|----|-----|
| `llm.title` | `Assistent LLM` | `Asistente LLM` | `LLM Assistant` |
| `llm.use_llm` | `Utilitzar assistent LLM` | `Usar asistente LLM` | `Use LLM Assistant` |
| `llm.use_llm_desc` | `Genera el pla amb el teu propi LLM (ChatGPT, Claude, Gemini...)` | `Genera el plan con tu propio LLM (ChatGPT, Claude, Gemini...)` | `Generate the plan with your own LLM (ChatGPT, Claude, Gemini...)` |
| `llm.how_to_use` | `Com utilitzar-ho` | `Cómo usarlo` | `How to use` |
| `llm.step_1` | `(Opcional) Afegeix notes personals a continuació` | `(Opcional) Añade notas personales a continuación` | `(Optional) Add personal notes below` |
| `llm.step_2` | `Copia el prompt` | `Copia el prompt` | `Copy the prompt` |
| `llm.step_3` | `Descarrega el catàleg d'exercicis (CSV)` | `Descarga el catálogo de ejercicios (CSV)` | `Download the exercise catalog (CSV)` |
| `llm.step_4` | `Obre el teu LLM (ChatGPT, Claude, Gemini...)` | `Abre tu LLM (ChatGPT, Claude, Gemini...)` | `Open your LLM (ChatGPT, Claude, Gemini...)` |
| `llm.step_5` | `Enganxa el prompt i adjunta el CSV` | `Pega el prompt y adjunta el CSV` | `Paste the prompt and attach the CSV` |
| `llm.step_6` | `Copia la resposta JSON del LLM` | `Copia la respuesta JSON del LLM` | `Copy the LLM's JSON response` |
| `llm.step_7` | `Enganxa-la aquí i fes clic a Validar` | `Pégala aquí y haz clic en Validar` | `Paste it below and click Validate` |
| `llm.personal_notes` | `Notes personals (opcional)` | `Notas personales (opcional)` | `Personal notes (optional)` |
| `llm.personal_notes_placeholder` | `p. ex. "Tinc el genoll esquerre feble, prefereixo exercicis unilaterals per a quàdriceps"` | `p. ej. "Tengo la rodilla izquierda débil, prefiero ejercicios unilaterales para cuádriceps"` | `e.g. "I have a weak left knee, prefer unilateral exercises for quads"` |
| `llm.prompt_section` | `Prompt` | `Prompt` | `Prompt` |
| `llm.copy_prompt` | `Copiar prompt` | `Copiar prompt` | `Copy prompt` |
| `llm.copied` | `Copiat!` | `¡Copiado!` | `Copied!` |
| `llm.catalog_section` | `Catàleg d'exercicis` | `Catálogo de ejercicios` | `Exercise catalog` |
| `llm.catalog_count` | `{{count}} exercicis compatibles amb el teu equipament` | `{{count}} ejercicios compatibles con tu equipamiento` | `{{count}} exercises matching your equipment` |
| `llm.download_csv` | `Descarregar CSV` | `Descargar CSV` | `Download CSV` |
| `llm.paste_section` | `Enganxa la resposta del LLM` | `Pega la respuesta del LLM` | `Paste LLM response` |
| `llm.paste_placeholder` | `Enganxa aquí el JSON generat pel LLM...` | `Pega aquí el JSON generado por el LLM...` | `Paste the LLM-generated JSON here...` |
| `llm.validate` | `Validar` | `Validar` | `Validate` |
| `llm.import_plan` | `Importar pla` | `Importar plan` | `Import plan` |
| `llm.valid_plan` | `Pla vàlid! {{weeks}} setmanes, {{sessions}} sessions` | `¡Plan válido! {{weeks}} semanas, {{sessions}} sesiones` | `Valid plan! {{weeks}} weeks, {{sessions}} sessions` |
| `llm.or_separator` | `o bé` | `o bien` | `or` |
| `llm.error_invalid_json` | `JSON no vàlid. Assegura't de copiar exactament la resposta del LLM.` | `JSON no válido. Asegúrate de copiar exactamente la respuesta del LLM.` | `Invalid JSON. Make sure to copy the LLM's response exactly.` |
| `llm.error_missing_fields` | `Falten camps obligatoris: es necessita "name" (text), "durationWeeks" (número) i "sessions" (llista).` | `Faltan campos obligatorios: se necesita "name" (texto), "durationWeeks" (número) y "sessions" (lista).` | `Missing required fields: need "name" (string), "durationWeeks" (number), and "sessions" (array).` |
| `llm.error_invalid_session` | `Sessió {{index}}: camps invàlids o faltants (weekNumber, dayOfWeek, durationMinutes, exercises).` | `Sesión {{index}}: campos inválidos o faltantes (weekNumber, dayOfWeek, durationMinutes, exercises).` | `Session {{index}}: invalid or missing fields (weekNumber, dayOfWeek, durationMinutes, exercises).` |
| `llm.error_invalid_exercise` | `Exercici {{index}} a la sessió {{session}}: camps invàlids (sets, reps, restSeconds).` | `Ejercicio {{index}} en la sesión {{session}}: campos inválidos (sets, reps, restSeconds).` | `Exercise {{index}} in session {{session}}: invalid fields (sets, reps, restSeconds).` |
| `llm.error_unknown_exercise` | `Exercici "{{exerciseId}}" no existeix al catàleg. Utilitza només IDs del CSV.` | `Ejercicio "{{exerciseId}}" no existe en el catálogo. Usa solo IDs del CSV.` | `Exercise "{{exerciseId}}" not found in catalog. Use only IDs from the CSV.` |
| `llm.error_invalid_weight` | `Pes invàlid per a "{{exerciseId}}": ha de ser un número positiu.` | `Peso inválido para "{{exerciseId}}": debe ser un número positivo.` | `Invalid weight for "{{exerciseId}}": must be a positive number.` |
| `llm.error_invalid_rpe` | `RPE invàlid per a "{{exerciseId}}": ha de ser entre 1 i 10.` | `RPE inválido para "{{exerciseId}}": debe estar entre 1 y 10.` | `Invalid RPE for "{{exerciseId}}": must be between 1 and 10.` |
| `llm.warn_consecutive_exercise` | `"{{exerciseId}}" apareix en dues sessions consecutives.` | `"{{exerciseId}}" aparece en dos sesiones consecutivas.` | `"{{exerciseId}}" appears in two consecutive sessions.` |
| `llm.warn_duplicate_muscle` | `Múscul "{{muscle}}" repetit a la sessió {{session}}.` | `Músculo "{{muscle}}" repetido en la sesión {{session}}.` | `Muscle "{{muscle}}" repeated in session {{session}}.` |
| `llm.warn_duration_mismatch` | `Sessió {{session}}: durada estimada {{estimated}} min vs objectiu {{target}} min.` | `Sesión {{session}}: duración estimada {{estimated}} min vs objetivo {{target}} min.` | `Session {{session}}: estimated {{estimated}} min vs target {{target}} min.` |
| `llm.warn_weeks_mismatch` | `"durationWeeks" no coincideix amb el nombre de setmanes a les sessions.` | `"durationWeeks" no coincide con el número de semanas en las sesiones.` | `"durationWeeks" doesn't match the number of weeks in sessions.` |
| `llm.errors_title` | `Errors (cal corregir)` | `Errores (hay que corregir)` | `Errors (must fix)` |
| `llm.warnings_title` | `Avisos` | `Avisos` | `Warnings` |

---

## Implementation Order

1. **Service layer** (`src/services/planning/llmAssistantService.ts`)
   - Define `LLMPlanResponse`, `LLMSession`, `LLMExercise` types
   - Define `ValidationError`, `ValidationResult` types
   - Implement `generatePromptTemplate()`
   - Implement `generateExerciseCsv()`
   - Implement `validateLLMResponse()` with markdown-fence stripping
   - Implement `convertToMesocycle()`

2. **Store update** (`src/stores/planningStore.ts`)
   - Add `setGeneratedPreview` action (if not present)

3. **Component** (`src/components/planning/LLMAssistant.tsx`)
   - Personal notes textarea with config persistence
   - Prompt display (read-only) with copy button
   - CSV download button
   - JSON paste textarea
   - Validate button → call `validateLLMResponse` → display results
   - Import button → call `convertToMesocycle` → call `onImport`

4. **PlanCreator integration** (`src/components/planning/PlanCreator.tsx`)
   - Add `'llm-assistant'` to `Step` union
   - Add "Use LLM Assistant" secondary button on `configure` step
   - Render `<LLMAssistant>` when `step === 'llm-assistant'`
   - Wire `onImport` to `setGeneratedPreview` + navigate to `'preview'`

5. **i18n keys** (`ca/planning.json`, `es/planning.json`, `en/planning.json`)

6. **Build verification** (`npm run build`)
