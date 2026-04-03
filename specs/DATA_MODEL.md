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

```typescript
type ProgressionType = 'linear' | 'undulating' | 'block'

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
type UserProfile = 'athlete' | 'rehab' | 'general'

type UserConfig = {
  profile: UserProfile
  language: 'ca' | 'es' | 'en'
  equipment: Equipment[]
  availableDaysPerWeek: number
  minutesPerSession: number
  activeRestrictions: string[]
  onboardingCompleted: boolean
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
