import { create } from 'zustand'

import type { Mesocycle, LoadTarget } from '@/types/planning'
import type { Exercise } from '@/types/exercise'
import type { UserConfig } from '@/types/user'
import { generateMesocycle } from '@/services/planning/planningEngine'
import { saveMesocycle, getActiveMesocycle, listMesocycles, updateMesocycle } from '@/services/db/mesocycleRepository'
import { skipSession, adjustLoad, unskipSession } from '@/services/planning/planningAdjuster'

interface PlanningStore {
  // State
  activeMesocycle: Mesocycle | null
  allMesocycles: Mesocycle[]
  generatedPreview: Mesocycle | null
  isGenerating: boolean
  isLoading: boolean
  error: string | null

  // Actions
  generate: (presetId: string, config: UserConfig, exercises: Exercise[], options?: { weeks?: number; muscleDistribution?: Record<string, number>; progressionType?: string }) => Promise<void>
  saveGenerated: () => Promise<void>
  discardGenerated: () => void
  loadActive: () => Promise<void>
  loadAll: () => Promise<void>
  skipSessionAction: (templateId: string) => Promise<void>
  unskipSessionAction: (templateId: string) => Promise<void>
  adjustLoadAction: (templateId: string, muscleGroup: string, loadUpdates: Partial<LoadTarget>) => Promise<void>
  deactivate: (id: string) => Promise<void>
  reset: () => void
}

export const usePlanningStore = create<PlanningStore>((set, get) => ({
  activeMesocycle: null,
  allMesocycles: [],
  generatedPreview: null,
  isGenerating: false,
  isLoading: false,
  error: null,

  generate: async (presetId, config, exercises, options) => {
    set({ isGenerating: true, error: null, generatedPreview: null })
    try {
      const mesocycle = await generateMesocycle(presetId, config, exercises, options)
      set({ generatedPreview: mesocycle, isGenerating: false })
    } catch (err) {
      set({ error: (err as Error).message, isGenerating: false })
    }
  },

  saveGenerated: async () => {
    const { generatedPreview } = get()
    if (!generatedPreview) return
    set({ isLoading: true, error: null })
    try {
      const current = await getActiveMesocycle()
      if (current) {
        await updateMesocycle(current.id, { active: false })
      }
      await saveMesocycle(generatedPreview)
      set({ activeMesocycle: generatedPreview, generatedPreview: null, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  discardGenerated: () => set({ generatedPreview: null }),

  loadActive: async () => {
    set({ isLoading: true, error: null })
    try {
      const active = await getActiveMesocycle()
      set({ activeMesocycle: active ?? null, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  loadAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const all = await listMesocycles()
      set({ allMesocycles: all, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  skipSessionAction: async (templateId) => {
    const { activeMesocycle } = get()
    if (!activeMesocycle) return
    set({ isLoading: true, error: null })
    try {
      const updated = skipSession(activeMesocycle, templateId)
      await updateMesocycle(updated.id, updated)
      set({ activeMesocycle: updated, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  unskipSessionAction: async (templateId) => {
    const { activeMesocycle } = get()
    if (!activeMesocycle) return
    set({ isLoading: true, error: null })
    try {
      const updated = unskipSession(activeMesocycle, templateId)
      await updateMesocycle(updated.id, updated)
      set({ activeMesocycle: updated, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  adjustLoadAction: async (templateId, muscleGroup, loadUpdates) => {
    const { activeMesocycle } = get()
    if (!activeMesocycle) return
    set({ isLoading: true, error: null })
    try {
      const updated = adjustLoad(activeMesocycle, templateId, muscleGroup, loadUpdates)
      await updateMesocycle(updated.id, updated)
      set({ activeMesocycle: updated, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  deactivate: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await updateMesocycle(id, { active: false })
      const { activeMesocycle } = get()
      if (activeMesocycle?.id === id) {
        set({ activeMesocycle: null })
      }
      set({ isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  reset: () => set({
    activeMesocycle: null,
    allMesocycles: [],
    generatedPreview: null,
    isGenerating: false,
    isLoading: false,
    error: null,
  }),
}))
