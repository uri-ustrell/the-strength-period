import { beforeEach, describe, expect, it, vi } from 'vitest'

const getConfig = vi.fn()
const setConfig = vi.fn()

vi.mock('@/services/db/configRepository', () => ({
  getConfig: (...args: unknown[]) => getConfig(...args),
  setConfig: (...args: unknown[]) => setConfig(...args),
}))

import { useUserStore } from '@/stores/userStore'
import { DEFAULT_AUDIO_OPT_IN } from '@/types/user'

/**
 * Feature 17 migration contract: a legacy persisted `UserConfig` that
 *   1. predates the `audioOptIn` field, OR
 *   2. still carries the deprecated `aestheticVariant` field,
 * must hydrate cleanly with `audioOptIn = false`, drop the deprecated field
 * silently, and not crash.
 */
describe('userStore.loadUserConfig — Feature 17 migration', () => {
  beforeEach(() => {
    getConfig.mockReset()
    setConfig.mockReset()
    useUserStore.getState().reset()
  })

  it('hydrates audioOptIn to the default when the field is absent', async () => {
    const legacyConfig = {
      language: 'ca',
      equipment: ['pes_corporal'],
      trainingDays: [2, 4, 6],
      minutesPerSession: 30,
      availableWeights: { manueles: [10], barra: [] },
      onboardingCompleted: true,
    }
    getConfig.mockResolvedValueOnce(legacyConfig)

    await useUserStore.getState().loadUserConfig()

    const state = useUserStore.getState()
    expect(state.audioOptIn).toBe(DEFAULT_AUDIO_OPT_IN)
    expect(state.audioOptIn).toBe(false)
    expect(state.equipment).toEqual(['pes_corporal'])
    expect(state.trainingDays).toEqual([2, 4, 6])
    expect(state.minutesPerSession).toBe(30)
    expect(state.error).toBeNull()
  })

  it('drops the deprecated aestheticVariant field cleanly without crashing', async () => {
    const legacyConfig = {
      language: 'ca',
      equipment: ['manueles'],
      trainingDays: [1, 3, 5],
      minutesPerSession: 45,
      availableWeights: { manueles: [5, 10], barra: [] },
      onboardingCompleted: true,
      // Field deleted in Feature 17 — must be ignored.
      aestheticVariant: 'retro-platformer',
    }
    getConfig.mockResolvedValueOnce(legacyConfig)

    await useUserStore.getState().loadUserConfig()

    const state = useUserStore.getState()
    expect(state.error).toBeNull()
    expect(state.audioOptIn).toBe(false)
    expect(state.equipment).toEqual(['manueles'])
    expect((state as unknown as Record<string, unknown>).aestheticVariant).toBeUndefined()
  })

  it('respects an explicit audioOptIn=true persisted value', async () => {
    const config = {
      language: 'ca',
      equipment: [],
      trainingDays: [1, 3, 5],
      minutesPerSession: 45,
      availableWeights: { manueles: [], barra: [] },
      onboardingCompleted: true,
      audioOptIn: true,
    }
    getConfig.mockResolvedValueOnce(config)

    await useUserStore.getState().loadUserConfig()

    expect(useUserStore.getState().audioOptIn).toBe(true)
  })
})
