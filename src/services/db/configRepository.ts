import { getDB } from '@/services/db/database'

export async function getConfig(key: string): Promise<unknown | null> {
  const db = await getDB()
  const entry = await db.get('config', key)
  return entry?.value ?? null
}

export async function setConfig(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put('config', {
    key,
    value,
    updatedAt: new Date().toISOString(),
  })
}

export async function getAllConfig(): Promise<Record<string, unknown>> {
  const db = await getDB()
  const entries = await db.getAll('config')
  const result: Record<string, unknown> = {}
  for (const entry of entries) {
    result[entry.key] = entry.value
  }
  return result
}
