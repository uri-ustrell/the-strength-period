import { beforeEach, describe, expect, it } from 'vitest'
import type { CustomPreset, Preset } from '@/data/presets'
import { MAX_CYCLE_WEEKS } from '@/services/planning/presetTemplates'
import type { PresetSessionTemplate, WeekProgressionRate } from '@/types/planning'
import { deriveCustomSetup, derivePresetSetup, usePlanCreatorStore } from './planCreatorStore'

const rates = (n: number): WeekProgressionRate[] =>
  Array.from({ length: n }, (_, i) => ({ week: i + 1, progressionPct: 5 }))

const session = (key: 'A' | 'B' | 'C' | 'D'): PresetSessionTemplate => ({
  templateKey: key,
  name: key,
  exercises: [{ exerciseId: `ex_${key}`, sets: 3, reps: 8, restSeconds: 90 }],
})

const makePreset = (over: Partial<Preset> = {}): Preset => ({
  id: 'forca_general',
  nameKey: 'planning:presets.forca_general.name',
  descriptionKey: 'planning:presets.forca_general.desc',
  durationOptions: [4],
  requiredTags: [],
  progressionType: 'linear',
  sessions: [session('A'), session('B'), session('C'), session('D')],
  weeklyProgressionRates: rates(4),
  ...over,
})

const makeCustom = (over: Partial<CustomPreset> = {}): CustomPreset => ({
  id: 'custom_1',
  name: 'My plan',
  durationWeeks: 3,
  sessions: [session('A'), session('B'), session('C'), session('D')],
  weeklyProgressionRates: rates(3),
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

const reset = () =>
  usePlanCreatorStore.getState().initWizard({ daysPerWeek: 3, minutesPerSession: 60 })

describe('planCreatorStore', () => {
  beforeEach(reset)

  it('initWizard seeds defaults on a fresh preset step', () => {
    const s = usePlanCreatorStore.getState()
    expect(s.step).toBe('preset')
    expect(s.daysPerWeek).toBe(3)
    expect(s.minutesPerSession).toBe(60)
    expect(s.selectedPreset).toBeNull()
    expect(s.editingPresetId).toBeNull()
    expect(s.dirty).toBe(false)
    expect(s.editablePresetSessions).toEqual([])
  })

  it('setWeeks resizes the progression rates to match', () => {
    usePlanCreatorStore.getState().setStep('configure')
    usePlanCreatorStore.getState().setWeeks(2)
    const s = usePlanCreatorStore.getState()
    expect(s.weeks).toBe(2)
    expect(s.weeklyProgressionRates).toHaveLength(2)
  })

  it('edits flag dirty on editing steps but not on preset/preview', () => {
    // preset step: no dirty
    usePlanCreatorStore.getState().setMinutes(45)
    expect(usePlanCreatorStore.getState().dirty).toBe(false)

    usePlanCreatorStore.getState().setStep('configure')
    usePlanCreatorStore.getState().setMinutes(75)
    expect(usePlanCreatorStore.getState().dirty).toBe(true)

    // preview step: no dirty
    reset()
    usePlanCreatorStore.getState().setStep('preview')
    usePlanCreatorStore.getState().setPresetName('x')
    expect(usePlanCreatorStore.getState().dirty).toBe(false)
  })

  it('editSessions snaps daysPerWeek to the template count', () => {
    usePlanCreatorStore.getState().setStep('exercises')
    usePlanCreatorStore.getState().editSessions([session('A'), session('B')])
    const s = usePlanCreatorStore.getState()
    expect(s.daysPerWeek).toBe(2)
    expect(s.dirty).toBe(true)
  })

  it('loadPreset enters the wizard from a built-in preset', () => {
    usePlanCreatorStore.getState().setMissingExerciseIds(['ghost'])
    usePlanCreatorStore.getState().loadPreset(makePreset())
    const s = usePlanCreatorStore.getState()
    expect(s.step).toBe('exercises')
    expect(s.sourceIsBuiltIn).toBe(true)
    expect(s.editingPresetId).toBeNull()
    expect(s.daysPerWeek).toBe(4) // snapped to the 4 templates
    expect(s.missingExerciseIds).toEqual([])
    expect(s.dirty).toBe(false)
    expect(s.selectedPreset?.id).toBe('forca_general')
  })

  it('loadCustomPreset enters in edit mode with the stored name', () => {
    usePlanCreatorStore.getState().loadCustomPreset(makeCustom())
    const s = usePlanCreatorStore.getState()
    expect(s.step).toBe('exercises')
    expect(s.sourceIsBuiltIn).toBe(false)
    expect(s.editingPresetId).toBe('custom_1')
    expect(s.presetName).toBe('My plan')
    expect(s.selectedPreset).toBeNull()
    expect(s.weeks).toBe(3)
  })

  it('createFromScratch starts a blank, unpersisted plan', () => {
    usePlanCreatorStore.getState().createFromScratch()
    const s = usePlanCreatorStore.getState()
    expect(s.step).toBe('exercises')
    expect(s.editingPresetId).toBeNull()
    expect(s.sourceIsBuiltIn).toBe(false)
    expect(s.editablePresetSessions).toHaveLength(4) // blank A/B/C/D
    expect(s.editablePresetSessions.every((t) => t.exercises.length === 0)).toBe(true)
    expect(s.daysPerWeek).toBe(4)
  })

  it('startNowPreview jumps straight to the preview step', () => {
    usePlanCreatorStore.getState().startNowPreview(makePreset())
    const s = usePlanCreatorStore.getState()
    expect(s.step).toBe('preview')
    expect(s.sourceIsBuiltIn).toBe(true)
    expect(s.selectedPreset?.id).toBe('forca_general')
  })

  it('presetSaved and presetUpdated clear the dirty flag', () => {
    usePlanCreatorStore.getState().setStep('configure')
    usePlanCreatorStore.getState().setPresetName('edited')
    expect(usePlanCreatorStore.getState().dirty).toBe(true)
    usePlanCreatorStore.getState().presetSaved('custom_new')
    expect(usePlanCreatorStore.getState().dirty).toBe(false)
    expect(usePlanCreatorStore.getState().editingPresetId).toBe('custom_new')
    expect(usePlanCreatorStore.getState().sourceIsBuiltIn).toBe(false)

    usePlanCreatorStore.getState().setStep('configure')
    usePlanCreatorStore.getState().setPresetName('again')
    usePlanCreatorStore.getState().presetUpdated()
    expect(usePlanCreatorStore.getState().dirty).toBe(false)
  })

  it('discard returns to the preset step', () => {
    usePlanCreatorStore.getState().startNowPreview(makePreset())
    usePlanCreatorStore.getState().discard()
    const s = usePlanCreatorStore.getState()
    expect(s.step).toBe('preset')
    expect(s.selectedPreset).toBeNull()
  })
})

describe('derivePresetSetup / deriveCustomSetup', () => {
  it('clamps legacy durations into the supported range', () => {
    expect(deriveCustomSetup(makeCustom({ durationWeeks: 12 })).weeks).toBe(MAX_CYCLE_WEEKS)
    expect(deriveCustomSetup(makeCustom({ durationWeeks: 0 })).weeks).toBe(1)
  })

  it('sizes rates to the resolved week count', () => {
    const setup = derivePresetSetup(makePreset({ durationOptions: [2] }))
    expect(setup.weeks).toBe(2)
    expect(setup.rates).toHaveLength(2)
    expect(setup.sessions).toHaveLength(4)
  })

  it('falls back to a default ramp when no rates are present', () => {
    const setup = deriveCustomSetup(
      makeCustom({ weeklyProgressionRates: undefined, weeklyProgression: undefined })
    )
    expect(setup.rates).toHaveLength(3)
  })
})
