import { create } from 'zustand'
import type { CustomPreset, Preset } from '@/data/presets'
import {
  buildDefaultProgressionRates,
  DEFAULT_CYCLE_WEEKS,
  MAX_CYCLE_WEEKS,
  migrateSliderToRates,
  MIN_CYCLE_WEEKS,
  normalizeTemplates,
  resizeProgressionRates,
} from '@/services/planning/presetTemplates'
import type { PresetSessionTemplate, WeekProgressionRate } from '@/types/planning'

/** The five screens of the plan-creation wizard. */
export type WizardStep = 'preset' | 'exercises' | 'configure' | 'preview' | 'llm-assistant'

/** Clamp any duration (incl. legacy custom presets) into the supported 1..4 range. */
const clampWeeks = (weeks: number): number =>
  Math.max(MIN_CYCLE_WEEKS, Math.min(MAX_CYCLE_WEEKS, weeks))

interface PresetSetup {
  weeks: number
  rates: WeekProgressionRate[]
  sessions: PresetSessionTemplate[]
}

/**
 * Derive the wizard's editable working copy from a built-in preset: clamp the
 * cycle length, pick the best available progression-rate source (explicit rates
 * → legacy slider → default ramp), and normalize the session templates.
 */
export const derivePresetSetup = (preset: Preset): PresetSetup => {
  const weeks = clampWeeks(preset.durationOptions[0] ?? DEFAULT_CYCLE_WEEKS)
  const ratesSource =
    preset.weeklyProgressionRates && preset.weeklyProgressionRates.length > 0
      ? preset.weeklyProgressionRates
      : preset.weeklyProgression !== undefined
        ? migrateSliderToRates(preset.weeklyProgression, weeks)
        : buildDefaultProgressionRates(weeks)
  return {
    weeks,
    rates: resizeProgressionRates(ratesSource, weeks),
    sessions: normalizeTemplates(preset.sessions),
  }
}

/** Same as {@link derivePresetSetup} for a stored CustomPreset. */
export const deriveCustomSetup = (cp: CustomPreset): PresetSetup => {
  const weeks = clampWeeks(cp.durationWeeks)
  const rates =
    cp.weeklyProgressionRates && cp.weeklyProgressionRates.length > 0
      ? resizeProgressionRates(cp.weeklyProgressionRates, weeks)
      : cp.weeklyProgression !== undefined
        ? migrateSliderToRates(cp.weeklyProgression, weeks)
        : buildDefaultProgressionRates(weeks)
  return { weeks, rates, sessions: normalizeTemplates(cp.sessions) }
}

/** Defaults seeded from the user's profile when the wizard mounts. */
export interface WizardDefaults {
  daysPerWeek: number
  minutesPerSession: number
}

interface PlanCreatorStore {
  // --- Wizard machine state ---
  step: WizardStep
  selectedPreset: Preset | null
  weeks: number
  daysPerWeek: number
  minutesPerSession: number
  weeklyProgressionRates: WeekProgressionRate[]
  presetName: string
  editingPresetId: string | null
  sourceIsBuiltIn: boolean
  dirty: boolean
  editablePresetSessions: PresetSessionTemplate[]
  missingExerciseIds: string[]

  // --- Lifecycle ---
  /** Seed defaults and return to a fresh `preset` step. Call on mount. */
  initWizard: (defaults: WizardDefaults) => void

  // --- Navigation ---
  setStep: (step: WizardStep) => void

  // --- User edits (flag dirty unless on preset/preview) ---
  setWeeks: (weeks: number) => void
  setDaysPerWeek: (days: number) => void
  setMinutes: (minutes: number) => void
  setRates: (rates: WeekProgressionRate[]) => void
  setPresetName: (name: string) => void
  editSessions: (sessions: PresetSessionTemplate[]) => void

  // --- Programmatic transitions (never flag dirty) ---
  setMissingExerciseIds: (ids: string[]) => void
  loadPreset: (preset: Preset) => void
  loadCustomPreset: (cp: CustomPreset) => void
  createFromScratch: () => void
  startNowPreview: (preset: Preset) => void
  presetSaved: (newId: string) => void
  presetUpdated: () => void
  discard: () => void
  clearDirty: () => void
}

const baseState = (defaults: WizardDefaults) => ({
  step: 'preset' as WizardStep,
  selectedPreset: null,
  weeks: DEFAULT_CYCLE_WEEKS,
  daysPerWeek: defaults.daysPerWeek,
  minutesPerSession: defaults.minutesPerSession,
  weeklyProgressionRates: buildDefaultProgressionRates(DEFAULT_CYCLE_WEEKS),
  presetName: '',
  editingPresetId: null,
  sourceIsBuiltIn: false,
  dirty: false,
  editablePresetSessions: [],
  missingExerciseIds: [],
})

export const usePlanCreatorStore = create<PlanCreatorStore>((set, get) => ({
  ...baseState({ daysPerWeek: 3, minutesPerSession: 60 }),

  initWizard: (defaults) => set(baseState(defaults)),

  setStep: (step) => set({ step }),

  // Edits flag the working copy as dirty, but only on the editing steps; the
  // guard mirrors the original component, which ignored changes on preset/preview.
  setWeeks: (weeks) =>
    set((s) => ({
      weeks,
      // Preserve edited per-week values when the cycle length changes.
      weeklyProgressionRates:
        s.weeklyProgressionRates.length === weeks
          ? s.weeklyProgressionRates
          : resizeProgressionRates(s.weeklyProgressionRates, weeks),
      dirty: s.step === 'preset' || s.step === 'preview' ? s.dirty : true,
    })),
  setDaysPerWeek: (days) =>
    set((s) => ({ daysPerWeek: days, dirty: isEditStep(s.step) ? true : s.dirty })),
  setMinutes: (minutes) =>
    set((s) => ({ minutesPerSession: minutes, dirty: isEditStep(s.step) ? true : s.dirty })),
  setRates: (rates) =>
    set((s) => ({ weeklyProgressionRates: rates, dirty: isEditStep(s.step) ? true : s.dirty })),
  setPresetName: (name) =>
    set((s) => ({ presetName: name, dirty: isEditStep(s.step) ? true : s.dirty })),
  editSessions: (sessions) =>
    set((s) => ({
      editablePresetSessions: sessions,
      // Faithful presets define exactly N templates and the engine generates one
      // session per template per week, so any other day count is silently ignored.
      daysPerWeek: sessions.length > 0 ? sessions.length : s.daysPerWeek,
      dirty: isEditStep(s.step) ? true : s.dirty,
    })),

  setMissingExerciseIds: (ids) => set({ missingExerciseIds: ids }),

  loadPreset: (preset) => {
    const { weeks, rates, sessions } = derivePresetSetup(preset)
    set({
      selectedPreset: preset,
      weeks,
      weeklyProgressionRates: rates,
      editablePresetSessions: sessions,
      daysPerWeek: sessions.length > 0 ? sessions.length : get().daysPerWeek,
      editingPresetId: null,
      sourceIsBuiltIn: true,
      presetName: '',
      missingExerciseIds: [],
      dirty: false,
      step: 'exercises',
    })
  },

  loadCustomPreset: (cp) => {
    const { weeks, rates, sessions } = deriveCustomSetup(cp)
    set({
      selectedPreset: null,
      weeks,
      weeklyProgressionRates: rates,
      editablePresetSessions: sessions,
      daysPerWeek: sessions.length > 0 ? sessions.length : get().daysPerWeek,
      sourceIsBuiltIn: false,
      editingPresetId: cp.id,
      presetName: cp.name,
      missingExerciseIds: [],
      dirty: false,
      step: 'exercises',
    })
  },

  createFromScratch: () => {
    const sessions = normalizeTemplates(undefined)
    set({
      selectedPreset: null,
      weeks: DEFAULT_CYCLE_WEEKS,
      weeklyProgressionRates: buildDefaultProgressionRates(DEFAULT_CYCLE_WEEKS),
      editablePresetSessions: sessions,
      daysPerWeek: sessions.length,
      sourceIsBuiltIn: false,
      editingPresetId: null, // not yet persisted
      presetName: '',
      missingExerciseIds: [],
      dirty: false,
      step: 'exercises',
    })
  },

  startNowPreview: (preset) => {
    const { weeks, rates, sessions } = derivePresetSetup(preset)
    set({
      selectedPreset: preset,
      weeks,
      weeklyProgressionRates: rates,
      editablePresetSessions: sessions,
      daysPerWeek: sessions.length > 0 ? sessions.length : get().daysPerWeek,
      sourceIsBuiltIn: true,
      step: 'preview',
    })
  },

  presetSaved: (newId) =>
    set({ editingPresetId: newId, sourceIsBuiltIn: false, selectedPreset: null, dirty: false }),
  presetUpdated: () => set({ dirty: false }),

  discard: () => set({ step: 'preset', selectedPreset: null }),
  clearDirty: () => set({ dirty: false }),
}))

/** Steps on which a value change should mark the working copy dirty. */
const isEditStep = (step: WizardStep): boolean => step !== 'preset' && step !== 'preview'
