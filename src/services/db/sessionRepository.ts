import { getDB } from '@/services/db/database'
import type { ExecutedSession, ExecutedSet } from '@/types/session'

export async function saveSession(session: ExecutedSession, sets: ExecutedSet[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['sessions', 'executedSets'], 'readwrite')
  await tx.objectStore('sessions').put(session)
  const setStore = tx.objectStore('executedSets')
  for (const set of sets) {
    await setStore.put(set)
  }
  await tx.done
}

export async function getSession(id: string): Promise<ExecutedSession | undefined> {
  const db = await getDB()
  return db.get('sessions', id)
}

export async function listSessionsByDateRange(
  from: string,
  to: string
): Promise<ExecutedSession[]> {
  const db = await getDB()
  return db.getAllFromIndex('sessions', 'by-date', IDBKeyRange.bound(from, to))
}

export async function getSetsBySession(sessionId: string): Promise<ExecutedSet[]> {
  const db = await getDB()
  return db.getAllFromIndex('executedSets', 'by-sessionId', IDBKeyRange.only(sessionId))
}

export async function getSetsByExercise(exerciseId: string): Promise<ExecutedSet[]> {
  const db = await getDB()
  return db.getAllFromIndex('executedSets', 'by-exerciseId', IDBKeyRange.only(exerciseId))
}

export async function markTemplateCompleted(
  mesocycleId: string,
  templateId: string
): Promise<void> {
  const db = await getDB()
  const mesocycle = await db.get('mesocycles', mesocycleId)
  if (!mesocycle) {
    throw new Error(`Mesocycle ${mesocycleId} not found`)
  }
  const session = mesocycle.sessions.find((s) => s.id === templateId)
  if (session) {
    session.completed = true
  }
  await db.put('mesocycles', mesocycle)
}

export async function listSetsByDateRange(from: string, to: string): Promise<ExecutedSet[]> {
  const db = await getDB()
  return db.getAllFromIndex('executedSets', 'by-date', IDBKeyRange.bound(from, to))
}

export async function listAllSessions(): Promise<ExecutedSession[]> {
  const db = await getDB()
  return db.getAll('sessions')
}

export async function listAllSets(): Promise<ExecutedSet[]> {
  const db = await getDB()
  return db.getAll('executedSets')
}
