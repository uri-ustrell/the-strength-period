import { type DBSchema, type IDBPDatabase, openDB } from 'idb'

import type { Mesocycle } from '@/types/planning'
import type { ExecutedSession, ExecutedSet } from '@/types/session'

export interface TSPDatabase extends DBSchema {
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

export async function getDB(): Promise<IDBPDatabase<TSPDatabase>> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB<TSPDatabase>('the-strength-period', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
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
      if (oldVersion < 2) {
        /* E4a: ExecutedSet.isWarmup is additive optional; no schema change.
           E4f: SessionTemplate.isPlannedRestDay is also additive optional on
           the embedded JSON record inside Mesocycle.sessions[]; no schema
           change either (DB stays at v2). */
      }
    },
  })
  return dbInstance
}
