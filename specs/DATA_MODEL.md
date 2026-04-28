# Data Model — The Strength Period

## Exercise Types (`src/types/exercise.ts`)

```typescript
type MuscleGroup =
  | 'quadriceps' | 'isquiotibials' | 'glutis' | 'bessons'
  | 'tibial_anterior' | 'adductors' | 'abductors' | 'psoes'
  | 'pectoral' | 'dorsal' | 'trapezi' | 'deltoides'
  | 'biceps' | 'triceps' | 'avantbras'
  | 'abdominal' | 'oblics' | 'lumbar' | 'estabilitzadors_cadera'
  | 'mobilitat_cadera' | 'mobilitat_turmell' | 'mobilitat_toracica' | 'fascies'

type Equipment =
  | 'pes_corporal' | 'manueles' | 'barra' | 'banda_elastica'
  | 'pilates' | 'trx'

type ExerciseTag =
  | 'corredor' | 'pujada' | 'baixada' | 'velocitat'
  | 'rehab_genoll' | 'rehab_turmell' | 'rehab_lumbar'
  | 'tendinitis_rotuliana' | 'tendinitis_anserina'
  | 'core_estabilitat' | 'equilibri' | 'pliometria'
  | 'mobilitat' | 'escalfament' | 'tornada_calma'

type Restriction = {
  condition: string
  action: 'avoid' | 'modify'
  note?: string
}

type Exercise = {
  id: string
  nameKey: string
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  equipment: Equipment[]
  level: 'beginner' | 'intermediate' | 'expert'
  category: 'strength' | 'mobility' | 'stability' | 'plyometrics' | 'cardio'
  estimatedSeriesDurationSeconds: number
  tags: ExerciseTag[]
  restrictions: Restriction[]
  rehabNotesKey?: string
  instructions: string[]
}
```

## Planning Types (`src/types/planning.ts`)

> **Note (Feature 17 / Step 19):** Updated by the Preset & Session Template Redesign.
> New types `TemplateKey`, `WeekProgressionRate`; `PresetSessionTemplate` now has
> required `templateKey` + `name` (replaces `label?`); `PresetExerciseEntry` has
> optional `initialLoadKg`; `CustomPreset` and `Preset` carry
> `weeklyProgressionRates`. Legacy `weeklyProgression` is migrated to per-week
> rates on first IndexedDB load.

```typescript
type ProgressionType = 'linear' | 'undulating' | 'block'

type TemplateKey = 'A' | 'B' | 'C' | 'D'

type WeekProgressionRate = {
  week: number            // 1-indexed week within the mesocycle
  progressionPct: number  // signed integer: +5 = +5%, -40 = -40%
}

type PresetExerciseEntry = {
  exerciseId: string
  sets: number
  reps: number | [number, number]
  restSeconds: number
  initialLoadKg?: number  // optional starting load; undefined = auto-derive
  tempo?: string
  rpe?: number
  notes?: string
}

type PresetSessionTemplate = {
  templateKey: TemplateKey  // immutable slot identifier
  name: string              // display name; defaults to templateKey value
  exercises: PresetExerciseEntry[]
  isDeload?: boolean
}

type LoadTarget = {
  sets: number
  reps: number | [number, number]
  weightKg?: number
  rpe?: number
  restSeconds: number
}

type MuscleGroupTarget = {
  muscleGroup: MuscleGroup
  percentageOfSession: number
  loadTarget: LoadTarget
}

type SessionTemplate = {
  id: string
  mesocycleId: string
  weekNumber: number
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7
  durationMinutes: number
  muscleGroupTargets: MuscleGroupTarget[]
  progressionType: ProgressionType
  restrictions: string[]
  completed: boolean
  skipped: boolean
}

type Mesocycle = {
  id: string
  name: string
  presetId: string
  startDate: string
  durationWeeks: number
  sessions: SessionTemplate[]
  createdAt: string
  active: boolean
}
```

### `CustomPreset` (`src/data/presets.ts`)

```typescript
interface CustomPreset {
  id: string
  name: string
  durationWeeks: number
  muscleDistribution: Partial<Record<MuscleGroup, number>>
  sessions?: PresetSessionTemplate[]              // when set, always exactly 4 entries (A/B/C/D)
  weeklyProgression?: number                      // DEPRECATED — migrated on load
  weeklyProgressionRates?: WeekProgressionRate[]  // length === durationWeeks
  progressionType?: ProgressionType
  createdAt: string
}
```

### `Preset` (built-in, `src/data/presets.ts`)

```typescript
interface Preset {
  id: string
  nameKey: string
  descriptionKey: string
  // …existing built-in fields…
  weeklyProgressionRates?: WeekProgressionRate[]  // optional per-week override
}
```

## Session Types (`src/types/session.ts`)

```typescript
type ExecutedSet = {
  id: string
  sessionId: string
  sessionTemplateId: string
  date: string
  exerciseId: string
  setNumber: number
  repsPlanned: number
  repsActual: number
  weightKgPlanned?: number
  weightKgActual?: number
  rpe?: number
  completedAt: string
}

type ExecutedSession = {
  id: string
  sessionTemplateId: string
  date: string
  startedAt: string
  completedAt?: string
  sets: ExecutedSet[]
  globalRpe?: number
  notes?: string
  skipped: boolean
}
```

## User Types (`src/types/user.ts`)

```typescript
type WeightEquipment = 'manueles' | 'barra'

type AvailableWeights = Record<WeightEquipment, number[]>

type UserConfig = {
  language: 'ca' | 'es' | 'en'
  equipment: Equipment[]
  trainingDays: DayOfWeek[]
  minutesPerSession: number
  activeRestrictions: RestrictionCondition[]
  onboardingCompleted: boolean
  availableWeights: AvailableWeights
}
```

## IndexedDB Schema

Database: `the-strength-period`, version 1

### Object Store: `config`
Key-value store for user settings.
- keyPath: `key`
- No indexes needed

```typescript
type ConfigEntry = {
  key: string       // e.g., 'profile', 'language', 'equipment'
  value: unknown
  updatedAt: string  // ISO datetime
}
```

### Object Store: `mesocycles`
Stores mesocycle definitions with embedded session templates.
- keyPath: `id`
- Indexes: `active`, `createdAt`

### Object Store: `sessions`
Stores executed session headers.
- keyPath: `id`
- Indexes: `date`, `sessionTemplateId`

### Object Store: `executedSets`
Stores individual executed sets.
- keyPath: `id`
- Indexes: `sessionId`, `date`, `exerciseId`

## Export / Import Format

All user data can be exported as a single JSON file:

```typescript
type ExportData = {
  version: 1
  exportedAt: string  // ISO datetime
  config: ConfigEntry[]
  mesocycles: Mesocycle[]
  sessions: ExecutedSession[]
  executedSets: ExecutedSet[]
}
```

## 5 Training Presets

1. **corredor_general** — Runner: glutis 30%, quads 25%, isquio 20%, calves 10%, core 15%
2. **pujada** — Uphill: glutis 35%, quads 30%, psoes 10%, calves 10%, core 15%
3. **rehab_tendinitis_anserina** — Rehab: isquio 25% (eccentric), adductors 20%, quads 20%, glutis 20%, mobility 15%
4. **forca_general** — General strength: lower 40%, upper 35%, core 15%, mobility 10%
5. **mobilitat_prevencio** — Mobility: hip 25%, thoracic 20%, ankle 15%, hip stabilizers 20%, fascia+core 20%
