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
