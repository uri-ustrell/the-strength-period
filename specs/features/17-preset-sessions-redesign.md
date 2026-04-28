# Feature 17 — Preset & Session Template Redesign

## Description

Redesigns the preset creation and editing experience in four targeted areas:

1. **Remove the duplicate "create preset" entry point** — the unnamed "Custom" dashed grid card is removed. Only the full-width "Create from scratch" button remains for new custom presets.
2. **Always-4 session templates (A/B/C/D)** — every custom preset always contains exactly 4 named session templates. Users can rename them, fill them with specific exercises and volumes, and copy any template to any other.
3. **Explicit exercise + initial volume specification** — each session template contains an ordered list of exercises, each with sets, reps, rest seconds, and an optional initial load in kg. These values are the starting point; progression is applied on top.
4. **Per-week progression % table** — the single 0–10 slider in the configure step is replaced by a per-week table where each row carries a signed percentage (e.g., +5%, −40% for deload). The % applies uniformly to all session templates for that week.

This feature formalises the structure of user-created presets and builds directly on the "faithful mode" introduced in Feature 14.

## Source of Truth Rule

Any Step 19 implementation work must start by reading this file end-to-end. If any ticket, TODO, or discussion conflicts with this file, this file wins. Scope changes must be recorded here first, then reflected in `specs/STATUS.md` and `specs/STATUS_HISTORY.md`.

> **Step numbering note:** The spec file is named `17-` because no `specs/features/17-*.md` file existed (Step 17 in STATUS.md tracks internal tooling with no feature spec). This feature is tracked as **Step 19** in STATUS.md to avoid a numbering collision.

## Dependencies

- Step 7 ✅ (Planning Engine — `PresetSessionTemplate`, `PresetExerciseEntry` types, `Preset` interface in `src/data/presets.ts`)
- Step 14 ✅ (Deterministic Planning — faithful mode engine, `FaithfulExercisesStep.tsx`, `planningEngine.ts`)
- Step 18 ✅ (Multi-Source Ingestion — preset catalog consumed via `data/ingestion/presets/catalog.json`; no changes to ingestion pipeline)

---

## Data Model Changes

### `src/types/planning.ts`

#### 1. New exported type: `TemplateKey`

```typescript
export type TemplateKey = 'A' | 'B' | 'C' | 'D'
```

#### 2. New exported type: `WeekProgressionRate`

```typescript
export type WeekProgressionRate = {
  week: number            // 1-indexed week within the mesocycle
  progressionPct: number  // signed integer: +5 = +5%, -40 = -40%
}
```

#### 3. `PresetSessionTemplate` — add `templateKey`, replace `label?` with `name`

**Before (current code):**
```typescript
export type PresetSessionTemplate = {
  label?: string
  exercises: PresetExerciseEntry[]
  isDeload?: boolean
}
```

**After:**
```typescript
export type PresetSessionTemplate = {
  templateKey: TemplateKey  // immutable slot identifier: 'A' | 'B' | 'C' | 'D'
  name: string              // display name; defaults to templateKey value; user can rename
  exercises: PresetExerciseEntry[]
  isDeload?: boolean
}
```

**Removed:** `label?: string` — confirmed no other type or service in the codebase references this field.

**Migration rule for IndexedDB data:** existing `CustomPreset.sessions` entries stored without `templateKey` are normalised on first load in `handleSelectCustomPreset`. Entries at index 0–3 receive `templateKey` 'A'–'D' and `name` equal to the `templateKey`. Entries beyond index 3 are discarded. The `exercises` arrays are preserved without modification.

#### 4. `PresetExerciseEntry` — add `initialLoadKg`

```typescript
export type PresetExerciseEntry = {
  exerciseId: string
  sets: number
  reps: number | [number, number]
  restSeconds: number
  initialLoadKg?: number  // optional starting load; undefined = auto-derive from available weights
  tempo?: string
  rpe?: number
  notes?: string
}
```

---

### `src/data/presets.ts`

#### 5. `CustomPreset` — add `weeklyProgressionRates`, deprecate `weeklyProgression`

```typescript
export interface CustomPreset {
  id: string
  name: string
  durationWeeks: number
  muscleDistribution: Partial<Record<MuscleGroup, number>>
  sessions?: PresetSessionTemplate[]             // when set, always exactly 4 entries
  weeklyProgression?: number                     // DEPRECATED: 0–10 slider; kept for backward compat
  weeklyProgressionRates?: WeekProgressionRate[] // NEW: per-week rates; length === durationWeeks
  progressionType?: ProgressionType
  createdAt: string
}
```

When `weeklyProgressionRates` is present the planning engine uses it and ignores `weeklyProgression`. When absent, the engine falls back to the old slider formula for backward compatibility with presets saved before this feature.

#### 6. `Preset` (built-in) — add optional `weeklyProgressionRates`

```typescript
export interface Preset {
  // ... all existing fields unchanged ...
  weeklyProgressionRates?: WeekProgressionRate[]  // NEW: optional per-week override for built-ins
}
```

---

### `specs/DATA_MODEL.md`

Update the Planning Types section to include:
- `TemplateKey` type definition
- `WeekProgressionRate` type definition
- Updated `PresetSessionTemplate` (with `templateKey: TemplateKey` and `name: string`)
- Updated `PresetExerciseEntry` (with `initialLoadKg?: number`)
- Updated `CustomPreset` interface (with `weeklyProgressionRates`)

---

## UI/UX Changes

### Change 1 — Remove the "Custom" grid card (duplicate button)

**File:** `src/components/planning/PlanCreator.tsx`

**What to remove:** the `<button>` inside the `<div className="grid grid-cols-2 gap-3">` grid that calls `handleSelectPreset(null)` and renders `t('planning:custom')` / `t('planning:custom_desc')`. Identified by class `border-dashed border-gray-300`, it is the last tile appended to the built-in preset grid.

**What to keep:** the full-width `<button>` after the custom presets list that calls `handleCreateFromScratch()`, renders `t('planning:create_from_scratch')` / `t('planning:create_from_scratch_desc')`, and is identified by class `border-dashed border-indigo-300`.

**Why the gray card is the one to remove:**

| | Gray dashed grid card | Indigo "Create from scratch" button |
|-|----------------------|--------------------------------------|
| Handler | `handleSelectPreset(null)` | `handleCreateFromScratch()` |
| Creates a named `CustomPreset` | No — goes to configure silently | Yes — opens name form immediately |
| Assigns a stable id | No | Yes |
| Compatible with A/B/C/D redesign | No | Yes |

With the redesign, all custom plan creation requires a named `CustomPreset`. The gray card bypasses this requirement, producing an anonymous plan that cannot be saved, edited, or structured with A/B/C/D templates.

**i18n keys to remove** from all three locale files:
- `planning:custom`
- `planning:custom_desc`

---

### Change 2 — A/B/C/D template normalisation on editor load

Wherever a `CustomPreset` or `Preset` is opened for editing, its `sessions` array is normalised to exactly **4** entries before the editor initialises. Normalisation applies to `editablePresetSessions` state only — it does **not** write back to IndexedDB or mutate built-in preset objects.

**`handleCreateFromScratch`** — initialise from blank:
```typescript
sessions: [
  { templateKey: 'A', name: 'A', exercises: [] },
  { templateKey: 'B', name: 'B', exercises: [] },
  { templateKey: 'C', name: 'C', exercises: [] },
  { templateKey: 'D', name: 'D', exercises: [] },
]
```

**Normalisation algorithm** (shared by `handleSelectCustomPreset` and `handleSelectPreset`):
1. For each entry at index 0–3: assign `templateKey` equal to `['A','B','C','D'][index]` if missing; set `name = templateKey` if `name` is missing.
2. If the incoming array has < 4 entries: pad with empty templates `{ templateKey: nextKey, name: nextKey, exercises: [] }` until length is 4.
3. If the incoming array has > 4 entries: take only the first 4 (after step 1 migration).

`HARDCODED_PRESETS` objects are **never** mutated; normalisation applies to the local working copy only.

---

### Change 3 — Template editor with A/B/C/D tabs

The exercise-editing step (rendered when `isFaithfulMode && step === 'exercises'`) is refactored to a tab-based interface inside `FaithfulExercisesStep.tsx`.

**Tab row:** four tabs, each labelled with the template's `name` field (defaults to `templateKey` if not renamed). All 4 tabs are always visible, even if some templates are empty. The active tab is highlighted (indigo accent).

**Active template panel:**

1. **Template name field** — inline text input pre-filled with `name`; placeholder = `templateKey`. Editing updates only the `name` of the active template in `editablePresetSessions`. The corresponding tab label updates live.

2. **Exercise list** — ordered list/table rows. Each row:
   - Exercise picker — combobox filtered by `filteredExercisePool` (user equipment + restrictions, same filter used throughout the wizard)
   - Sets — integer input (min 1, max 20)
   - Reps — single integer or range via two linked inputs (low–high); stored as `number | [number, number]`
   - Initial load (kg) — optional number input; placeholder `t('planning:initial_load_auto')` ("Auto"); left blank = `initialLoadKg` omitted when saving
   - Rest seconds — integer input (min 0)
   - Remove button (×)

3. **"Add exercise" button** — appends a blank `PresetExerciseEntry` to the active template's exercises. Sensible defaults: sets 3, reps 10, restSeconds 90.

4. **Reorder controls** — up/down arrow buttons per row. Drag-and-drop is not required.

**Copy-to action:**

Each active template panel has a "Copy to…" control (button or compact select). Options: the 3 other template keys only (never includes the active tab). On selection:
- Deep-clones the source template's `exercises` array.
- Replaces the target template's `exercises` with the clone.
- Does **not** change the target's `name` or `templateKey`.
- No confirmation dialog; action is reversible by copying back.

---

### Change 4 — Per-week progression table replaces slider

**File:** `src/components/planning/PlanCreator.tsx`, configure step (`step === 'configure'`).

**Replaced element:** the `<input type="range" min={0} max={10}>` slider for `weeklyProgression` and its surrounding label and value display.

**New state in `PlanCreator`:**
```typescript
// Remove:
const [weeklyProgression, setWeeklyProgression] = useState(5)

// Add:
const [weeklyProgressionRates, setWeeklyProgressionRates] = useState<WeekProgressionRate[]>(
  () => buildDefaultProgressionRates(weeks)
)
```

**`buildDefaultProgressionRates(n: number): WeekProgressionRate[]`** — pure helper:
```typescript
function buildDefaultProgressionRates(n: number): WeekProgressionRate[] {
  return Array.from({ length: n }, (_, i) => {
    const week = i + 1
    return { week, progressionPct: week % 4 === 0 ? -40 : 5 }
  })
}
```

**When `weeks` changes:** if rates are still at their initial default values, rebuild from `buildDefaultProgressionRates`. If the user has manually edited any rate, truncate (if new count is smaller) or pad with new-week defaults (if larger), preserving existing edited rows.

**On preset selection:** if the preset provides `weeklyProgressionRates`, initialise state from those values; otherwise rebuild from `buildDefaultProgressionRates(preset.durationOptions[0])`.

**`WeekProgressionTable` component** — new file `src/components/planning/WeekProgressionTable.tsx`:

```typescript
interface WeekProgressionTableProps {
  weeks: number
  rates: WeekProgressionRate[]
  onChange: (rates: WeekProgressionRate[]) => void
}
```

Renders one compact row per week:

| Week   |  %   |        |
|--------|------|--------|
| Week 1 |  5   |        |
| Week 2 |  5   |        |
| Week 3 |  5   |        |
| Week 4 | -40  | Deload |

- The week label column is read-only.
- The `%` column is a number input (integers, negative values allowed). The `%` suffix is a static inline label rendered outside the input.
- When `progressionPct < 0`, show a soft hint label `t('planning:deload_week_hint')` inline with the row.
- On every change the component calls `onChange` with the full updated array.

**State propagation:** both `handleGenerate` and `handleSaveAsPreset` in `PlanCreator` are updated to pass/save `weeklyProgressionRates` instead of `weeklyProgression`.

---

## Planning Engine Changes

### `src/services/planning/planningEngine.ts`

#### Extended options type

```typescript
options?: {
  weeks?: number
  muscleDistribution?: Record<string, number>
  progressionType?: ProgressionType
  weeklyProgression?: number                      // kept for backward compat
  weeklyProgressionRates?: WeekProgressionRate[]  // NEW: takes precedence when present
  exerciseSelections?: Record<string, string[]>
  presetSessions?: PresetSessionTemplate[]
}
```

#### New internal helper: `resolveWeekMultiplier`

```typescript
function resolveWeekMultiplier(
  week: number,
  isDeload: boolean,
  rule: ProgressionRule,
  weeklyProgressionRates: WeekProgressionRate[] | undefined,
  weeklyProgression: number
): number {
  if (isDeload) return rule.deloadPercentage

  if (weeklyProgressionRates && weeklyProgressionRates.length >= week) {
    const rate = weeklyProgressionRates[week - 1] // 1-indexed → 0-indexed
    if (rate) return 1 + rate.progressionPct / 100
  }

  // Backward compat: cumulative slider formula (unchanged behaviour for old presets)
  const scaledIncrease = rule.weeklyVolumeIncrease * (weeklyProgression / 10)
  return 1 + scaledIncrease * (week - 1)
}
```

**Semantic difference from old formula:** when `weeklyProgressionRates` is used, each week's multiplier is absolute (`1 + pct/100`) — not cumulative from prior weeks. Week 3 at +7% → multiplier exactly `1.07`. This is intentional: explicit per-week control means the user defines the target for each week directly.

Replace the inline `weekMultiplier` computation in both `generateFaithfulMesocycle` and `generateGeneratorMesocycle` with calls to `resolveWeekMultiplier`.

#### `initialLoadKg` in faithful mode (`generateFaithfulMesocycle`)

In the `weight`-metric branch, prefer `entry.initialLoadKg` when defined and `> 0`:

```typescript
let baseWeight = 0
if (entry.initialLoadKg && entry.initialLoadKg > 0) {
  baseWeight = entry.initialLoadKg
} else {
  const exerciseWeights = resolveExerciseWeights(exercise, config)
  if (exerciseWeights && exerciseWeights.length > 0) {
    const sorted = [...exerciseWeights].sort((a, b) => a - b)
    baseWeight = sorted[Math.floor(sorted.length * 0.3)] ?? sorted[0] ?? 0
  }
}
// week multiplier and snapToAvailableWeight applied as before
```

---

## Acceptance Criteria

- [ ] The gray dashed "Custom" grid card (`handleSelectPreset(null)`) is removed from the preset step
- [ ] `planning:custom` and `planning:custom_desc` i18n keys are removed from all three locale files
- [ ] `TemplateKey` and `WeekProgressionRate` are exported from `src/types/planning.ts`
- [ ] `PresetSessionTemplate` has required `templateKey: TemplateKey` and `name: string`; `label?: string` is removed
- [ ] `PresetExerciseEntry` has optional `initialLoadKg?: number`
- [ ] `CustomPreset` and `Preset` interfaces have `weeklyProgressionRates?: WeekProgressionRate[]`
- [ ] A custom preset created from scratch initialises with exactly 4 A/B/C/D templates with blank exercise lists
- [ ] An existing `CustomPreset` in IndexedDB without `templateKey` loads without crash; sessions normalised to 4 slots
- [ ] A built-in preset with fewer than 4 sessions is padded to 4 in the editor; source objects not mutated
- [ ] The template editor shows 4 tabs; labels reflect the `name` field
- [ ] Renaming a template updates `name` and the tab label live
- [ ] "Copy X to Y" replaces the target template's `exercises` with a deep clone; target `name` and `templateKey` unchanged
- [ ] The copy-to control lists only the 3 other keys (never the active tab)
- [ ] Per-exercise fields (exerciseId, sets, reps, initialLoadKg, restSeconds) are persisted in `PresetSessionTemplate.exercises`
- [ ] Exercise picker is filtered by `filteredExercisePool`
- [ ] The configure step renders `WeekProgressionTable` instead of the 0–10 range slider
- [ ] Default rates: +5% per week; weeks where `week % 4 === 0` default to −40%
- [ ] Changing `durationWeeks` adjusts table row count; existing edited row values are preserved
- [ ] `handleSaveAsPreset` persists `weeklyProgressionRates` on `CustomPreset`, not `weeklyProgression`
- [ ] Planning engine reads `weeklyProgressionRates` when present; falls back to slider formula when absent
- [ ] `initialLoadKg` used as base weight in faithful mode when defined and > 0
- [ ] All new i18n keys present in `ca`, `es`, `en` under the `planning` namespace
- [ ] `specs/DATA_MODEL.md` reflects all new and changed types
- [ ] `npm run build` passes with zero errors

---

## Files to Create

```
src/components/planning/WeekProgressionTable.tsx
```

## Files to Modify

```
src/types/planning.ts
src/data/presets.ts
src/services/planning/planningEngine.ts
src/components/planning/PlanCreator.tsx
src/components/planning/FaithfulExercisesStep.tsx
src/i18n/locales/ca/planning.json
src/i18n/locales/es/planning.json
src/i18n/locales/en/planning.json
specs/DATA_MODEL.md
```

## Files NOT Modified

```
src/types/exercise.ts
src/types/user.ts
src/services/planning/planningAdjuster.ts
src/services/exercises/sessionGenerator.ts
src/services/exercises/exerciseFilter.ts
src/stores/sessionStore.ts
src/hooks/useSession.ts
src/pages/Session.tsx
src/data/progressionRules.ts
data/ingestion/presets/catalog.json
api/generate-plan.ts
```

---

## i18n Keys (planning namespace)

### Keys to add

| Key | CA | ES | EN |
|-----|----|----|-----|
| `week_progression_table` | `Progressió setmanal` | `Progresión semanal` | `Weekly progression` |
| `week_progression_table_desc` | `Defineix el % de volum per a cada setmana. Valors negatius = descàrrega.` | `Define el % de volumen para cada semana. Valores negativos = descarga.` | `Set the volume % for each week. Negative values = deload.` |
| `week_label` | `Setmana {{n}}` | `Semana {{n}}` | `Week {{n}}` |
| `deload_week_hint` | `Descàrrega` | `Descarga` | `Deload` |
| `session_templates` | `Plantilles de sessió` | `Plantillas de sesión` | `Session templates` |
| `session_templates_desc` | `4 plantilles reutilitzables (A–D). Copia entre elles per estalviar temps.` | `4 plantillas reutilizables (A–D). Copia entre ellas para ahorrar tiempo.` | `4 reusable templates (A–D). Copy between them to save time.` |
| `template_name_label` | `Nom de la plantilla` | `Nombre de la plantilla` | `Template name` |
| `copy_to` | `Copia a…` | `Copiar a…` | `Copy to…` |
| `copy_template_to` | `Copia {{src}} → {{dst}}` | `Copiar {{src}} → {{dst}}` | `Copy {{src}} → {{dst}}` |
| `add_exercise` | `Afegeix exercici` | `Añadir ejercicio` | `Add exercise` |
| `initial_load_kg` | `Càrrega inicial (kg)` | `Carga inicial (kg)` | `Initial load (kg)` |
| `initial_load_auto` | `Auto` | `Auto` | `Auto` |
| `template_tab_label` | `Plantilla {{key}}` | `Plantilla {{key}}` | `Template {{key}}` |

### Keys to remove

| Key | Reason |
|-----|--------|
| `planning:custom` | Used only by the removed "Custom" grid card |
| `planning:custom_desc` | Used only by the removed "Custom" grid card |

---

## Edge Cases & Error Scenarios

| Scenario | Handling |
|----------|----------|
| Old `CustomPreset` in IndexedDB has `sessions` without `templateKey` | Normalise on read: index 0–3 → A/B/C/D; `name = templateKey`; no crash, no data loss |
| `CustomPreset.sessions` has >4 entries | Take first 4; discard the rest on next save |
| `sessions` count < 4 | Pad with empty templates using next unused `TemplateKey` values |
| Built-in `Preset` sessions < 4 | Pad to 4 on editing load only; source objects not mutated |
| `progressionPct = 0` for all weeks | Valid — flat (maintenance) mesocycle; multiplier = 1.0 |
| `initialLoadKg = 0` | Treated as undefined (auto); only applied when `> 0` |
| Copy A→B when B already has exercises | Overwrite silently; reversible |
| `WeekProgressionTable` with `weeks = 0` | Render empty table; no crash |
| `weeklyProgressionRates.length < durationWeeks` | Fall back to slider formula for out-of-bounds weeks |

---

## Implementation Order

1. **Type changes** (`src/types/planning.ts`) — `TemplateKey`, `WeekProgressionRate`; update `PresetSessionTemplate`; add `initialLoadKg` to `PresetExerciseEntry`
2. **Preset interface changes** (`src/data/presets.ts`) — `weeklyProgressionRates` on `CustomPreset` and `Preset`; add `WeekProgressionRate` import
3. **Planning engine** (`src/services/planning/planningEngine.ts`) — `resolveWeekMultiplier`; thread `weeklyProgressionRates`; `initialLoadKg` base weight in faithful mode
4. **`WeekProgressionTable` component** (`src/components/planning/WeekProgressionTable.tsx`) — compact table, N rows, signed integer input, deload hint
5. **`PlanCreator` changes** (`src/components/planning/PlanCreator.tsx`) — remove Custom grid card; A/B/C/D normalisation; replace slider with `WeekProgressionTable`; update `handleGenerate` and `handleSaveAsPreset`
6. **`FaithfulExercisesStep` changes** (`src/components/planning/FaithfulExercisesStep.tsx`) — A/B/C/D tabs; template rename; copy-to; `initialLoadKg` input
7. **i18n** — add new keys; remove `planning:custom` and `planning:custom_desc` from ca/es/en
8. **`DATA_MODEL.md` update** — `TemplateKey`, `WeekProgressionRate`, updated `PresetSessionTemplate`, `PresetExerciseEntry`
9. **Build verification** — `npm run build` zero errors

---

## QA Pass / UX Refinements (Round 2)

This section captures user-confirmed refinements to Feature 17 after a first QA pass. All decisions here override prior choices in the same file when they conflict.

### Guiding Principle
The Strength Period prioritises **minimum time and money cost** for the user to start training, with **maximum ethical engagement**. Every flow added here is judged against: "does this let a user start training in fewer clicks while still being honest about what she'll do?"

---

### QA-1 — Progression UX: numbers + explanation + sparkline

**Problem:** signed `%` values (+5, −40) shown standalone are not understood by end users.

**Decision:** keep the numeric column (signed integers) but surround it with explanatory copy and a visual support.

**Changes to `WeekProgressionTable.tsx`:**

1. **Header copy** (above the table) — replace short title with two-line block:
   - Title: `t('planning:week_progression_table')`
   - Long description (new key `planning:week_progression_table_long_desc`): "Progressió de càrrega: augment percentual de volum/intensitat respecte la setmana anterior. Valors negatius = setmana de descàrrega per recuperar."
2. **Sparkline** — render an inline SVG line chart above (or to the right of) the table, plotting `progressionPct` per week. Uses native SVG, no chart library. Negative values dip below the baseline; the deload week is visually distinct (dashed segment or amber colour). Width is responsive; height ≈ 60px.
3. **Per-row hint** — keep the `t('planning:deload_week_hint')` chip on negative weeks.
4. **Inline `%` suffix** — keep, plus a tooltip (title attr) on the `%` cell explaining "respecte la setmana anterior".

**i18n keys to add (planning namespace):**

| Key | CA | ES | EN |
|-----|----|----|-----|
| `week_progression_table_long_desc` | `Progressió de càrrega: augment percentual de volum/intensitat respecte la setmana anterior. Valors negatius = setmana de descàrrega per recuperar.` | `Progresión de carga: aumento porcentual de volumen/intensidad respecto a la semana anterior. Valores negativos = semana de descarga para recuperar.` | `Load progression: percentage increase of volume/intensity vs. previous week. Negative values = deload week for recovery.` |
| `week_progression_pct_aria` | `Percentatge de progressió respecte la setmana anterior` | `Porcentaje de progresión respecto a la semana anterior` | `Progression percentage vs previous week` |

**Engine implication (revision of `resolveWeekMultiplier`):**
The semantics change to **vs-previous-week** (not absolute). Each week's effective multiplier is computed cumulatively against the prior week's multiplier when `weeklyProgressionRates` is used:

```typescript
function resolveWeekMultiplier(
  week: number,
  isDeload: boolean,
  rule: ProgressionRule,
  weeklyProgressionRates: WeekProgressionRate[] | undefined,
  weeklyProgression: number
): number {
  if (isDeload) return rule.deloadPercentage
  if (weeklyProgressionRates && weeklyProgressionRates.length > 0) {
    let mult = 1
    for (let i = 0; i < week && i < weeklyProgressionRates.length; i++) {
      mult *= 1 + (weeklyProgressionRates[i]?.progressionPct ?? 0) / 100
    }
    return mult
  }
  // Backward compat: cumulative slider formula
  const scaledIncrease = rule.weeklyVolumeIncrease * (weeklyProgression / 10)
  return 1 + scaledIncrease * (week - 1)
}
```

This **supersedes** the absolute-multiplier definition in section "Planning Engine Changes" above.

---

### QA-2 — Translated, blocking save errors

**Problem:** "exercise not found" surfaces an untranslated raw error string when saving.

**Decision:** show a translated error and **block** save until user resolves it.

**Changes:**

1. **`planningStore` / `presetRepository` save paths** — wrap `exerciseId` lookups in `validatePresetExercises(sessions, allExercises)` returning `{ ok: true } | { ok: false, missingIds: string[] }`.
2. **`PlanCreator` and any preset save callsite** — on `{ ok: false }`, show toast/banner with key `planning:error_missing_exercises` interpolated with `{{count}}` and `{{ids}}`. Save button stays disabled until resolved (UI marks affected rows red and the offending tab in the A/B/C/D bar with a red dot).

**i18n keys to add:**

| Key | CA | ES | EN |
|-----|----|----|-----|
| `error_missing_exercises` | `No es pot guardar: {{count}} exercici(s) ja no existeixen al catàleg ({{ids}}). Elimina'ls o substitueix-los.` | `No se puede guardar: {{count}} ejercicio(s) ya no existen en el catálogo ({{ids}}). Elimínalos o sustitúyelos.` | `Cannot save: {{count}} exercise(s) no longer exist in the catalog ({{ids}}). Remove or replace them.` |
| `error_missing_exercises_row` | `Aquest exercici ja no existeix` | `Este ejercicio ya no existe` | `This exercise no longer exists` |

---

### QA-3 — Wizard step order: exercises before configure

**Problem:** user can save a plan before picking exercises; meaningless.

**Decision:** new wizard order:

```
preset → exercises → configure → preview/generate
```

The `Step` union becomes:
```typescript
type Step = 'preset' | 'exercises' | 'configure' | 'preview' | 'llm-assistant'
```

The legacy `'muscles'` step is removed (muscle distribution now lives inside the preset definition itself, since presets are always faithful — see QA-7).

**`PlanCreator` flow:**
- After picking a preset (or "Create from scratch"), advance directly to `'exercises'`.
- The `'exercises'` step always renders the A/B/C/D template editor (`FaithfulExercisesStep`) — no auto/manual toggle for presets (only for create-from-scratch; see QA-7).
- "Next" from `'exercises'` is **disabled** until each of the 4 templates has at least 1 valid exercise (`A`, `B`, `C`, `D` all non-empty).
- `'configure'` collects: weeks, days/week, minutes/session, weekly progression rates table.
- "Generate" is **only** available in `'configure'` (and `'preview'` re-confirms before save).

**Acceptance:**
- Save / Generate buttons no longer reachable from a state with empty templates.
- Step indicator (breadcrumb) reflects the new order.

---

### QA-4 — Preset preview with two CTAs

**Problem:** selecting a built-in preset drops the user into the wizard, requiring 4–6 steps before training.

**Decision:** introduce a **Preset Preview** screen between picking a preset and entering the wizard.

**New file:** `src/components/planning/PresetPreviewModal.tsx` (or full-page route — implementer decides based on existing patterns).

**Preview content (all derived from the preset definition; nothing is invented):**

1. Name, description, duration in weeks, sessions per week (derived from non-empty templates A/B/C/D), estimated minutes per session.
2. Muscle distribution chart/list (existing `MuscleDistributionView` component if available, otherwise simple bar list).
3. **Each session template (A/B/C/D)** with the **exact** ordered exercise list, sets × reps, rest, initial load. No generation, no inference: exactly what is declared in the preset's `sessions[].exercises`.
4. Per-week progression sparkline (reuse the same SVG component from QA-1) with the preset's `weeklyProgressionRates`.
5. Estimated equipment required (set union of `exercise.equipment` across all listed exercises).

**Two CTAs:**

- **Primary — "Comença ara"** (`planning:start_now`)
  - Generates and activates the plan immediately with **zero** further steps.
  - Parameters source: **`UserConfig` existing values** (`trainingDays`, `minutesPerSession`); preset's `weeklyProgressionRates` and `sessions` used as-is; `weeks = preset.durationOptions[0]` (or first valid duration).
  - The generated plan is **not** saved as a `CustomPreset` — only as the active plan in `planningStore`.
  - Routes user directly to dashboard / today's session.
- **Secondary — "Personalitza"** (`planning:customize`)
  - Opens the wizard with **everything precarregat** from the preset (sessions A/B/C/D, weekly rates, weeks).
  - Requires the user to set a `CustomPreset.name` before generating (existing name form is reached at `'configure'` step).
  - On save: persists as a new `CustomPreset` and as the active plan.

**Layout:** modal on desktop, full-page on mobile. Sticky bottom action bar with the two CTAs (primary right, secondary left).

**i18n keys to add:**

| Key | CA | ES | EN |
|-----|----|----|-----|
| `preview_title` | `Previsualització del pla` | `Vista previa del plan` | `Plan preview` |
| `preview_sessions_per_week` | `{{count}} sessió/setmana` (with `_other`) | `{{count}} sesión/semana` (with `_other`) | `{{count}} session/week` (with `_other`) |
| `preview_estimated_duration` | `~{{min}} min/sessió` | `~{{min}} min/sesión` | `~{{min}} min/session` |
| `preview_required_equipment` | `Material necessari` | `Material necesario` | `Required equipment` |
| `start_now` | `Comença ara` | `Empieza ahora` | `Start now` |
| `customize` | `Personalitza` | `Personalizar` | `Customize` |
| `start_now_help` | `Comença a entrenar amb la configuració recomanada del pla.` | `Empieza a entrenar con la configuración recomendada del plan.` | `Start training with the plan's recommended configuration.` |

---

### QA-5 — Equipment catalog overhaul

**Problem:** `'pilates'` is in the `Equipment` enum but is a modality, not material. The catalog also lacks variety relevant to home training.

**Decisions:**

1. **Remove `'pilates'`** from `Equipment` union in `src/types/exercise.ts`.
2. **Migrate exercises** currently tagged `equipment: ['pilates']` → `equipment: ['mat']` (or `['pes_corporal']` if no mat needed). Performed via the ingestion pipeline; existing `exercises.json` needs regeneration.
3. **Expand the `Equipment` union** to a curated catalog grouped by category. Final values:

```typescript
export type Equipment =
  // Bodyweight
  | 'pes_corporal'
  // Free weights
  | 'manueles' | 'kettlebell' | 'barra' | 'discos' | 'weight_vest'
  // Bands & elastics
  | 'banda_elastica' | 'mini_band' | 'banda_tubular'
  // Suspension & bars
  | 'trx' | 'barra_dominades' | 'anelles'
  // Cardio
  | 'corda' | 'comba' | 'step' | 'bicicleta' | 'cinta'
  // Mobility & recovery
  | 'foam_roller' | 'pilota_massatge' | 'mat'
  // Stability
  | 'fitball' | 'bosu' | 'plataforma_inestable'
  // Calisthenics / other
  | 'paralettes' | 'plyo_box' | 'sandbag'
```

4. **Update `freeExerciseDbEquipmentMap`** in `src/data/muscleGroups.ts` to map ingestion-source strings to the new enum. The ingestion pipeline (Step 18) is **not** modified beyond this map update.

5. **UI in onboarding/settings** (new component `EquipmentChipSelector`): chips/toggles grouped by category, identical interaction to the current implementation. Initially shows the **first ~6–8 chips** plus a **"Mostra'n més"** toggle that expands the full catalog inline (no modal, accept page scroll). Persists `'mostra'n més'` open state per session only.

**i18n:**

| Key | CA | ES | EN |
|-----|----|----|-----|
| `equipment_show_more` | `Mostra'n més` | `Mostrar más` | `Show more` |
| `equipment_show_less` | `Mostra'n menys` | `Mostrar menos` | `Show less` |
| `equipment_category_bodyweight` | `Pes corporal` | `Peso corporal` | `Bodyweight` |
| `equipment_category_free_weights` | `Pesos lliures` | `Pesos libres` | `Free weights` |
| `equipment_category_bands` | `Bandes i goma` | `Bandas y goma` | `Bands & elastics` |
| `equipment_category_suspension` | `Suspensió i barres` | `Suspensión y barras` | `Suspension & bars` |
| `equipment_category_cardio` | `Cardio` | `Cardio` | `Cardio` |
| `equipment_category_mobility` | `Mobilitat i recuperació` | `Movilidad y recuperación` | `Mobility & recovery` |
| `equipment_category_stability` | `Estabilitat` | `Estabilidad` | `Stability` |
| `equipment_category_calisthenics` | `Cal·listènia / altres` | `Calistenia / otros` | `Calisthenics / other` |

Plus one i18n key per new equipment value (under `onboarding:equipment_*` namespace, mirroring current convention).

**Files to modify:**
- `src/types/exercise.ts` — extend `Equipment` union, remove `'pilates'`.
- `src/data/muscleGroups.ts` — extend `freeExerciseDbEquipmentMap`.
- `src/components/planning/PlanCreator.tsx` — replace `ALL_EQUIPMENT` literal with import from a shared `EQUIPMENT_CATALOG` constant.
- New file `src/data/equipmentCatalog.ts` — exports `EQUIPMENT_CATALOG: { category: EquipmentCategory; items: Equipment[] }[]` and `DEFAULT_VISIBLE_COUNT = 8`.
- New file `src/components/onboarding/EquipmentChipSelector.tsx` (or update existing equipment selector to consume the catalog and show "Mostra'n més").
- `src/i18n/locales/{ca,es,en}/onboarding.json` and `planning.json` — new keys.
- `data/raw/free-exercise-db.json` ingestion mapping (consumed by `scripts/buildExercises.ts`) — re-run to regenerate `public/exercises/exercises.json`.

---

### QA-6 — Remove user-level restrictions entirely

**Problem:** the onboarding and settings flows ask the user about `restrictions` (knee pain, etc.). This belongs to the plan/preset, not the user profile.

**Decision:** remove the concept from `UserConfig`, the store, and the UI. Restrictions remain at the **plan level**: each preset already declares which conditions it accommodates via `Preset.restrictions: RestrictionCondition[]` (used for filtering presets, not exercises).

**Removals:**

- `src/types/user.ts` — remove `activeRestrictions: RestrictionCondition[]` from `UserConfig`.
- `src/stores/userStore.ts` — remove `activeRestrictions` state, `setActiveRestrictions` action, and the `partialize` entry.
- Onboarding page — remove the restrictions step entirely; reduce step count.
- Settings page — remove the restrictions section.
- `src/services/exercises/exerciseFilter.ts` — remove the `activeRestrictions` parameter and any `restriction.condition` filtering. Exercises are no longer filtered by user restrictions.
- `src/components/planning/PlanCreator.tsx` — remove `activeRestrictions` from `useUserStore` selector and from any filter call.
- Remove `RestrictionCondition` and `Restriction` from `src/types/exercise.ts` **only if no other code uses them**. The `Preset.restrictions: RestrictionCondition[]` (in `src/data/presets.ts`) is used to **describe** which conditions the preset is suitable for / contraindicated for; it stays.

**Migration of existing IndexedDB data:**

- `userStore.persist.partialize` no longer includes `activeRestrictions`, so the next save drops it silently.
- Hydration: any persisted `activeRestrictions` field is ignored (no migration script needed; Zustand `persist` only loads fields declared in the new state shape).

**i18n keys to remove:**

| Key | Reason |
|-----|--------|
| `onboarding:restrictions_title` | Step removed |
| `onboarding:restrictions_desc` | Step removed |
| `onboarding:restriction_*` (all RestrictionCondition labels) | No longer rendered to user |
| `settings:restrictions_section` | Section removed |

(Implementer audits both locale files and `tsx` references to find the exact key list.)

---

### QA-7 — Faithful mode is the only mode for presets

**Problem (architectural):** the codebase still supports a "generator" mode where a preset declares only muscle distribution and the engine picks exercises. With the redesign, **all presets must declare exact exercises**. Generation is reserved for "Create from scratch" plans.

**Decisions:**

1. **All built-in `Preset` and all `CustomPreset` always have `sessions: PresetSessionTemplate[]` of length 4 with non-empty `exercises` arrays.**
2. The `hasExerciseRichSessions` check still exists but is replaced at usage sites by an unconditional faithful path for presets. The check stays only as a safety guard for migration.
3. **`Preset` typing change** — `sessions` becomes required and length-4. Update `src/data/presets.ts`:

```typescript
export interface Preset {
  // ... existing fields except: ...
  sessions: PresetSessionTemplate[]  // REQUIRED, length === 4
  weeklyProgressionRates: WeekProgressionRate[]  // REQUIRED, length === durationOptions[0]
}
```

4. **`PlanCreator` simplification** — when a preset is selected (built-in or custom), the wizard always uses `editablePresetSessions` initialised from `preset.sessions` (no fallback path that auto-generates).
5. **"Create from scratch"** keeps both options (manual A/B/C/D editing **and** asking the engine to fill templates from muscle distribution + equipment), surfaced as a sub-CTA inside the empty templates view: `t('planning:autofill_from_distribution')`.
6. **Existing built-in presets without exercises must be regenerated.** A `content-factory` agent run produces faithful versions of every entry in `data/ingestion/presets/catalog.json`. The ingestion pipeline (Step 18) is unchanged; the **input catalog** is enriched with explicit `sessions[]` blocks.

**Acceptance for QA-7:**
- `Preset.sessions` typed as required, length-4, non-empty `exercises[]` enforced via TypeScript + a runtime validator in the preset loader (throws in dev, logs + skips in prod).
- `PlanCreator` no longer routes presets through the muscle-distribution-only generator path.
- Every preset shipped in `data/ingestion/presets/catalog.json` validates against the new schema. CI build fails if not.
- "Create from scratch" exposes both manual and autofill flows.

---

### QA-8 — Updated step order in `PlanCreator` (consolidated)

```
[Preset list / Create from scratch]
   ↓ select built-in preset
[Preset Preview]
   ├─ "Comença ara" → generate + go to Dashboard
   └─ "Personalitza"
        ↓
[Exercises (A/B/C/D editor)]    ← also entry point for "Create from scratch"
   ↓ all 4 templates non-empty
[Configure]
   - Weeks
   - Days/week (default from UserConfig)
   - Minutes/session (default from UserConfig)
   - WeekProgressionTable + sparkline
   - CustomPreset.name (required when reached via "Personalitza" or "Create from scratch")
   ↓
[Preview / Confirm]
   - Final summary (same widget as Preset Preview, but with user's edits)
   - "Generate" → save preset + activate plan
```

---

### QA Pass — Files Added / Modified

**New files:**
- `src/components/planning/PresetPreviewModal.tsx`
- `src/components/planning/ProgressionSparkline.tsx`
- `src/components/onboarding/EquipmentChipSelector.tsx`
- `src/data/equipmentCatalog.ts`
- `src/services/planning/presetValidation.ts` (exports `validatePresetExercises`)

**Modified files:**
- `src/types/user.ts` — remove `activeRestrictions`
- `src/types/exercise.ts` — extend `Equipment` enum, remove `'pilates'`
- `src/data/presets.ts` — `Preset.sessions` required length-4; `Preset.weeklyProgressionRates` required
- `src/data/muscleGroups.ts` — extend `freeExerciseDbEquipmentMap`
- `src/services/planning/planningEngine.ts` — `resolveWeekMultiplier` semantics → cumulative-vs-previous-week
- `src/services/exercises/exerciseFilter.ts` — drop `activeRestrictions` parameter
- `src/stores/userStore.ts` — drop `activeRestrictions`
- `src/stores/planningStore.ts` — call `validatePresetExercises` before save
- `src/components/planning/PlanCreator.tsx` — new step order, preview integration, equipment catalog, no restrictions
- `src/components/planning/WeekProgressionTable.tsx` — sparkline, long description, tooltip
- `src/components/planning/FaithfulExercisesStep.tsx` — disable "Next" until all 4 templates non-empty; row error states
- `src/pages/Onboarding*.tsx` and `src/pages/Settings*.tsx` — remove restrictions step/section, swap equipment selector
- `src/i18n/locales/{ca,es,en}/{planning,onboarding,settings}.json`
- `data/ingestion/presets/catalog.json` — regenerated faithful presets (via content-factory)
- `specs/DATA_MODEL.md` — reflect required `sessions` length-4 on `Preset`, removal of `activeRestrictions`, expanded `Equipment` enum
- `specs/STATUS.md` and `specs/STATUS_HISTORY.md` — track QA pass as Step 19 sub-tasks

---

### QA Pass — Acceptance Criteria

- [ ] Sparkline renders next to the week progression table; deload weeks visually distinct
- [ ] Week progression header shows long description (vs-previous-week semantics)
- [ ] `resolveWeekMultiplier` uses cumulative-from-previous-week formula when rates present
- [ ] Save with missing exercise IDs blocks and shows translated error in 3 locales
- [ ] Wizard order is: preset → exercises → configure → preview
- [ ] Save/Next disabled until all 4 templates have at least 1 exercise
- [ ] Selecting a built-in preset opens Preset Preview (not the wizard directly)
- [ ] "Comença ara" generates plan with zero extra clicks using UserConfig defaults
- [ ] "Comença ara" does NOT save a CustomPreset
- [ ] "Personalitza" opens wizard precarregat with preset data and requires a name
- [ ] `Equipment` enum no longer contains `'pilates'`
- [ ] `Equipment` enum extended to cover all categories listed in QA-5
- [ ] `EquipmentChipSelector` shows ~8 chips initially with "Mostra'n més" expand toggle
- [ ] `UserConfig.activeRestrictions` removed; onboarding restrictions step removed; settings section removed
- [ ] `exerciseFilter` no longer accepts/uses `activeRestrictions`
- [ ] `Preset.sessions` typed as required length-4; runtime validator catches violations
- [ ] All built-in presets in `data/ingestion/presets/catalog.json` declare 4 faithful sessions with explicit exercises
- [ ] "Create from scratch" exposes both manual editing and an autofill-from-distribution CTA
- [ ] All new i18n keys present in `ca`, `es`, `en`
- [ ] Removed i18n keys deleted from all 3 locale files
- [ ] `npm run build` passes with zero errors
- [ ] `specs/DATA_MODEL.md`, `specs/STATUS.md`, `specs/STATUS_HISTORY.md` updated

---

### QA Pass — Implementation Order

1. **Type changes**: extend `Equipment`, remove `'pilates'`, drop `RestrictionCondition` from `UserConfig`, make `Preset.sessions` required length-4, make `Preset.weeklyProgressionRates` required.
2. **Equipment catalog** (`src/data/equipmentCatalog.ts`) + `EquipmentChipSelector`.
3. **Engine** (`resolveWeekMultiplier` cumulative formula) + `validatePresetExercises`.
4. **Faithful preset regeneration** via `content-factory` agent — produces `data/ingestion/presets/catalog.json` with explicit sessions per preset. Re-run ingestion, verify validator passes.
5. **`ProgressionSparkline`** + `WeekProgressionTable` updates.
6. **Onboarding/Settings**: remove restrictions step/section; swap equipment selector.
7. **`PresetPreviewModal`** + integration in `PlanCreator`.
8. **`PlanCreator` rewrite**: new step order; gate "Next" on full templates; precarrega path from preview "Personalitza"; "Comença ara" path that bypasses wizard.
9. **Save error handling**: integrate `validatePresetExercises` + translated banner.
10. **i18n**: add new keys; remove obsolete keys (`planning:custom`, `planning:custom_desc`, all restriction labels).
11. **Specs update**: `DATA_MODEL.md`, `STATUS.md`, `STATUS_HISTORY.md`.
12. **Build verification** + manual smoke test of both "Comença ara" and "Personalitza" paths.
