import { beforeEach, describe, expect, it, vi } from 'vitest'

const getConfig = vi.fn()
const setConfig = vi.fn()

vi.mock('@/services/db/configRepository', () => ({
  getConfig: (...args: unknown[]) => getConfig(...args),
  setConfig: (...args: unknown[]) => setConfig(...args),
}))

// Imported after the mock is registered so the store module picks it up.
import { useUserStore } from '@/stores/userStore'
import { DEFAULT_AESTHETIC_VARIANT } from '@/types/user'

/**
 * Migration contract: a legacy persisted `UserConfig` that predates the
 * `aestheticVariant` field must hydrate the store with
 * {@link DEFAULT_AESTHETIC_VARIANT} (`'classic-boring'`) — no schema bump,
 * no error, no overwrite of any other field.
 */
describe('userStore.loadUserConfig — aestheticVariant migration', () => {
  beforeEach(() => {
    getConfig.mockReset()
    setConfig.mockReset()
    useUserStore.getState().reset()
  })

  it('hydrates aestheticVariant to the default when the field is absent', async () => {
    const legacyConfig = {
      language: 'ca',
      equipment: ['pes_corporal'],
      trainingDays: [2, 4, 6],
      minutesPerSession: 30,
      availableWeights: { manueles: [10], barra: [] },
      onboardingCompleted: true,
      // aestheticVariant intentionally omitted
    }
    getConfig.mockResolvedValueOnce(legacyConfig)

    await useUserStore.getState().loadUserConfig()

    const state = useUserStore.getState()
    expect(state.aestheticVariant).toBe(DEFAULT_AESTHETIC_VARIANT)
    expect(state.aestheticVariant).toBe('classic-boring')
    expect(state.equipment).toEqual(['pes_corporal'])
    expect(state.trainingDays).toEqual([2, 4, 6])
    expect(state.minutesPerSession).toBe(30)
    expect(state.error).toBeNull()
  })
})
