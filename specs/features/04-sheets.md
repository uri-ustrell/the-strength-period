# Feature 04 — IndexedDB Local Persistence

## Dependencies
Step 1 (Scaffold) must be complete.

## Acceptance Criteria
- [ ] IndexedDB database `the-strength-period` created with `idb` wrapper
- [ ] 4 object stores: `config`, `mesocycles`, `sessions`, `executedSets`
- [ ] Typed CRUD functions per store
- [ ] Config store: get/set key-value pairs
- [ ] Mesocycles store: create, read, update, list active
- [ ] Sessions store: create, read, list by date range
- [ ] ExecutedSets store: create batch, read by sessionId, read by exerciseId
- [ ] All operations are async and handle errors gracefully
- [ ] Database versioning for future schema migrations

## Files to Create

```
src/services/db/database.ts           ← DB init, schema, version upgrades
src/services/db/configRepository.ts   ← Config CRUD
src/services/db/mesocycleRepository.ts ← Mesocycle CRUD
src/services/db/sessionRepository.ts  ← Session + ExecutedSet CRUD
src/hooks/useDB.ts                    ← React hook for DB access
```

## database.ts — DB Initialization

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface TSPDatabase extends DBSchema {
  config: {
    key: string
    value: { key: string; value: unknown; updatedAt: string }
  }
  mesocycles: {
    key: string
    value: Mesocycle
    indexes: { 'by-active': 'active'; 'by-createdAt': 'createdAt' }
  }
  sessions: {
    key: string
    value: ExecutedSession
    indexes: { 'by-date': 'date'; 'by-templateId': 'sessionTemplateId' }
  }
  executedSets: {
    key: string
    value: ExecutedSet
    indexes: { 'by-sessionId': 'sessionId'; 'by-date': 'date'; 'by-exerciseId': 'exerciseId' }
  }
}

let dbInstance: IDBPDatabase<TSPDatabase> | null = null

async function getDB(): Promise<IDBPDatabase<TSPDatabase>> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB<TSPDatabase>('the-strength-period', 1, {
    upgrade(db) {
      db.createObjectStore('config', { keyPath: 'key' })

      const mesocycles = db.createObjectStore('mesocycles', { keyPath: 'id' })
      mesocycles.createIndex('by-active', 'active')
      mesocycles.createIndex('by-createdAt', 'createdAt')

      const sessions = db.createObjectStore('sessions', { keyPath: 'id' })
      sessions.createIndex('by-date', 'date')
      sessions.createIndex('by-templateId', 'sessionTemplateId')

      const executedSets = db.createObjectStore('executedSets', { keyPath: 'id' })
      executedSets.createIndex('by-sessionId', 'sessionId')
      executedSets.createIndex('by-date', 'date')
      executedSets.createIndex('by-exerciseId', 'exerciseId')
    }
  })
  return dbInstance
}
```

## configRepository.ts API

```typescript
async function getConfig(key: string): Promise<unknown | null>
async function setConfig(key: string, value: unknown): Promise<void>
async function getAllConfig(): Promise<Record<string, unknown>>
```

## mesocycleRepository.ts API

```typescript
async function saveMesocycle(mesocycle: Mesocycle): Promise<void>
async function getMesocycle(id: string): Promise<Mesocycle | undefined>
async function getActiveMesocycle(): Promise<Mesocycle | undefined>
async function listMesocycles(): Promise<Mesocycle[]>
async function updateMesocycle(id: string, updates: Partial<Mesocycle>): Promise<void>
```

## sessionRepository.ts API

```typescript
async function saveSession(session: ExecutedSession, sets: ExecutedSet[]): Promise<void>
// Saves session header + all sets in a single transaction

async function getSession(id: string): Promise<ExecutedSession | undefined>
async function listSessionsByDateRange(from: string, to: string): Promise<ExecutedSession[]>
async function getSetsBySession(sessionId: string): Promise<ExecutedSet[]>
async function getSetsByExercise(exerciseId: string): Promise<ExecutedSet[]>
async function markTemplateCompleted(mesocycleId: string, templateId: string): Promise<void>
```

## Write Patterns

- **Config writes:** Direct put by key
- **Plan writes:** Put mesocycle (contains embedded session templates)
- **Execution writes:** Transaction with session + all sets written atomically on session end
- **Never write per-set during session** — buffer in memory, write all on session end
