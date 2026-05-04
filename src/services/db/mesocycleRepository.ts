import { getDB } from '@/services/db/database'
import type { Mesocycle } from '@/types/planning'

export async function saveMesocycle(mesocycle: Mesocycle): Promise<void> {
  const db = await getDB()
  await db.put('mesocycles', mesocycle)
}

/**
 * Atomically save a mesocycle as the active one, deactivating any other
 * mesocycle currently flagged as active. Runs inside a single transaction
 * so we can never end up with zero or multiple active plans.
 */
export async function saveActiveMesocycle(mesocycle: Mesocycle): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('mesocycles', 'readwrite')
  const store = tx.objectStore('mesocycles')
  const all = await store.getAll()
  const writes: Promise<unknown>[] = []
  for (const m of all) {
    if (m.id !== mesocycle.id && m.active) {
      writes.push(store.put({ ...m, active: false }))
    }
  }
  writes.push(store.put({ ...mesocycle, active: true }))
  await Promise.all(writes)
  await tx.done
}

export async function getMesocycle(id: string): Promise<Mesocycle | undefined> {
  const db = await getDB()
  return db.get('mesocycles', id)
}

export async function getActiveMesocycle(): Promise<Mesocycle | undefined> {
  const db = await getDB()
  const all = await db.getAll('mesocycles')
  return all.find((m) => m.active)
}

export async function listMesocycles(): Promise<Mesocycle[]> {
  const db = await getDB()
  return db.getAll('mesocycles')
}

export async function updateMesocycle(id: string, updates: Partial<Mesocycle>): Promise<void> {
  const db = await getDB()
  const existing = await db.get('mesocycles', id)
  if (!existing) {
    throw new Error(`Mesocycle ${id} not found`)
  }
  await db.put('mesocycles', { ...existing, ...updates, id })
}
