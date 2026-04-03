import { getDB } from '@/services/db/database'
import type { Mesocycle } from '@/types/planning'
import type { ExecutedSession, ExecutedSet } from '@/types/session'

interface ExportData {
  version: 1
  exportedAt: string
  config: Array<{ key: string; value: unknown; updatedAt: string }>
  mesocycles: Mesocycle[]
  sessions: ExecutedSession[]
  executedSets: ExecutedSet[]
}

export async function exportData(): Promise<void> {
  const db = await getDB()

  const [config, mesocycles, sessions, executedSets] = await Promise.all([
    db.getAll('config'),
    db.getAll('mesocycles'),
    db.getAll('sessions'),
    db.getAll('executedSets'),
  ])

  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    config,
    mesocycles,
    sessions,
    executedSets,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)

  const a = document.createElement('a')
  a.href = url
  a.download = `the-strength-period-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function isValidExportData(data: unknown): data is ExportData {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    d.version === 1 &&
    typeof d.exportedAt === 'string' &&
    Array.isArray(d.config) &&
    Array.isArray(d.mesocycles) &&
    Array.isArray(d.sessions) &&
    Array.isArray(d.executedSets)
  )
}

export async function importData(file: File): Promise<{ success: boolean; error?: string }> {
  try {
    const text = await file.text()
    const parsed: unknown = JSON.parse(text)

    if (!isValidExportData(parsed)) {
      return { success: false, error: 'invalid_format' }
    }

    const db = await getDB()

    const tx = db.transaction(
      ['config', 'mesocycles', 'sessions', 'executedSets'],
      'readwrite',
    )

    await Promise.all([
      tx.objectStore('config').clear(),
      tx.objectStore('mesocycles').clear(),
      tx.objectStore('sessions').clear(),
      tx.objectStore('executedSets').clear(),
    ])

    await Promise.all([
      ...parsed.config.map((item) => tx.objectStore('config').put(item)),
      ...parsed.mesocycles.map((item) => tx.objectStore('mesocycles').put(item)),
      ...parsed.sessions.map((item) => tx.objectStore('sessions').put(item)),
      ...parsed.executedSets.map((item) => tx.objectStore('executedSets').put(item)),
    ])

    await tx.done

    return { success: true }
  } catch {
    return { success: false, error: 'parse_error' }
  }
}
