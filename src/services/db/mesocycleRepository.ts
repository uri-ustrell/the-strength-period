import { getDB } from '@/services/db/database'
import type { Mesocycle } from '@/types/planning'

export async function saveMesocycle(mesocycle: Mesocycle): Promise<void> {
  const db = await getDB()
  await db.put('mesocycles', mesocycle)
}

export async function getMesocycle(id: string): Promise<Mesocycle | undefined> {
  const db = await getDB()
  return db.get('mesocycles', id)
}

export async function getActiveMesocycle(): Promise<Mesocycle | undefined> {
  const db = await getDB()
  const all = await db.getAll('mesocycles')
  return all.find(m => m.active)
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
