import type { SourceAdapter } from '../contracts'
import { freeExerciseDbAdapter } from './freeExerciseDbAdapter'
import { llmJsonAdapter } from './llmJsonAdapter'

const ADAPTERS: SourceAdapter[] = [freeExerciseDbAdapter, llmJsonAdapter]

export function listAdapters(): SourceAdapter[] {
  return ADAPTERS
}

export function getAdapterById(adapterId: string): SourceAdapter {
  const adapter = ADAPTERS.find((candidate) => candidate.id === adapterId)
  if (!adapter) {
    const validIds = ADAPTERS.map((item) => item.id).join(', ')
    throw new Error(`Unknown adapter "${adapterId}". Supported adapters: ${validIds}`)
  }
  return adapter
}
