import { create } from 'zustand'
import {
  getActiveMesocycle,
  listMesocycles,
  saveActiveMesocycle,
  updateMesocycle,
} from '@/services/db/mesocycleRepository'
import { adjustLoad, skipSession, unskipSession } from '@/services/planning/planningAdjuster'
import { generateMesocycle } from '@/services/planning/planningEngine'
import type { Exercise } from '@/types/exercise'
import type {
  LoadTarget,
  Mesocycle,
  PresetSessionTemplate,
  ProgressionType,
  SessionTemplate,
  WeekProgressionRate,
} from '@/types/planning'
import type { UserConfig } from '@/types/user'

interface PlanningStore {
  // State
  activeMesocycle: Mesocycle | null
  allMesocycles: Mesocycle[]
  generatedPreview: Mesocycle | null
  isGenerating: boolean
  isLoading: boolean
  error: string | null
  missingExerciseIds: string[]

  // Actions
  generate: (
    presetId: string,
    config: UserConfig,
    exercises: Exercise[],
    options?: {
      weeks?: number
      progressionType?: ProgressionType
      weeklyProgression?: number
      weeklyProgressionRates?: WeekProgressionRate[]
      exerciseSelections?: Record<string, string[]>
      presetSessions?: PresetSessionTemplate[]
    }
  ) => void
  saveGenerated: (exercises: Exercise[]) => Promise<void>
  discardGenerated: () => void
  loadActive: () => Promise<void>
  loadAll: () => Promise<void>
  skipSessionAction: (templateId: string) => Promise<void>
  unskipSessionAction: (templateId: string) => Promise<void>
  markRestDay: (weekNumber: number, dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7) => Promise<void>
  unmarkRestDay: (templateId: string) => Promise<void>
  adjustLoadAction: (
    templateId: string,
    muscleGroup: string,
    loadUpdates: Partial<LoadTarget>
  ) => Promise<void>
  setGeneratedPreview: (mesocycle: Mesocycle) => void
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
  missingExerciseIds: [],

  generate: (presetId, config, exercises, options) => {
    set({ isGenerating: true, error: null, generatedPreview: null })
    try {
      const mesocycle = generateMesocycle(presetId, config, exercises, options)
      set({ generatedPreview: mesocycle, isGenerating: false })
    } catch (err) {
      set({ error: (err as Error).message, isGenerating: false })
    }
  },

  saveGenerated: async (exercises) => {
    const { generatedPreview } = get()
    if (!generatedPreview) return
    // Validate every exerciseId referenced is still in the catalog
    const known = new Set(exercises.map((e) => e.id))
    const missing: string[] = []
    for (const session of generatedPreview.sessions) {
      for (const assignment of session.exerciseAssignments ?? []) {
        if (!known.has(assignment.exerciseId) && !missing.includes(assignment.exerciseId)) {
          missing.push(assignment.exerciseId)
        }
      }
    }
    if (missing.length > 0) {
      set({ error: 'PRESET_EXERCISES_MISSING', missingExerciseIds: missing })
      return
    }
    set({ isLoading: true, error: null, missingExerciseIds: [] })
    try {
      // Atomic swap: deactivate any current active + persist new active mesocycle
      // in a single IDB transaction so we never end up with zero or two active plans.
      await saveActiveMesocycle({ ...generatedPreview, active: true })
      set({
        activeMesocycle: { ...generatedPreview, active: true },
        generatedPreview: null,
        isLoading: false,
      })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  discardGenerated: () => set({ generatedPreview: null, missingExerciseIds: [] }),

  setGeneratedPreview: (mesocycle) => set({ generatedPreview: mesocycle }),

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

  /**
   * Materialise a minimal rest-day SessionTemplate into the active
   * mesocycle for the given (weekNumber, dayOfWeek) slot. No-op when a session
   * already exists in that slot (rest-day capture is for empty slots only).
   */
  markRestDay: async (weekNumber, dayOfWeek) => {
    const { activeMesocycle } = get()
    if (!activeMesocycle) return
    const occupied = activeMesocycle.sessions.some(
      (s) => s.weekNumber === weekNumber && s.dayOfWeek === dayOfWeek
    )
    if (occupied) return
    const restDay: SessionTemplate = {
      id: crypto.randomUUID(),
      mesocycleId: activeMesocycle.id,
      weekNumber,
      dayOfWeek,
      durationMinutes: 0,
      muscleGroupTargets: [],
      progressionType: 'linear',
      restrictions: [],
      exerciseAssignments: [],
      completed: false,
      skipped: false,
      isPlannedRestDay: true,
    }
    const updated: Mesocycle = {
      ...activeMesocycle,
      sessions: [...activeMesocycle.sessions, restDay],
    }
    set({ isLoading: true, error: null })
    try {
      await updateMesocycle(updated.id, updated)
      set({ activeMesocycle: updated, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  /**
   * Remove a previously-materialised rest-day SessionTemplate from
   * the active mesocycle. Only operates on rest-day templates; ignores other
   * sessions defensively so a stray call never deletes real training data.
   */
  unmarkRestDay: async (templateId) => {
    const { activeMesocycle } = get()
    if (!activeMesocycle) return
    const target = activeMesocycle.sessions.find((s) => s.id === templateId)
    if (!target || target.isPlannedRestDay !== true) return
    const updated: Mesocycle = {
      ...activeMesocycle,
      sessions: activeMesocycle.sessions.filter((s) => s.id !== templateId),
    }
    set({ isLoading: true, error: null })
    try {
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

  reset: () =>
    set({
      activeMesocycle: null,
      allMesocycles: [],
      generatedPreview: null,
      isGenerating: false,
      isLoading: false,
      error: null,
      missingExerciseIds: [],
    }),
}))
