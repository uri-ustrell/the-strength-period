import { describe, expect, it } from 'vitest'
import { isValidUserConfig } from '@/stores/userStore'

/**
 * Feature 17 contract test for the optional `audioOptIn` field on
 * `UserConfig`. The `aestheticVariant` field is gone and the validator
 * silently ignores any leftover legacy keys.
 */
const baseConfig = {
  language: 'ca',
  equipment: [],
  trainingDays: [1, 3, 5],
  minutesPerSession: 45,
  availableWeights: { manueles: [], barra: [] },
  onboardingCompleted: true,
}

describe('isValidUserConfig — audioOptIn', () => {
  it('accepts a missing audioOptIn', () => {
    expect(isValidUserConfig(baseConfig)).toBe(true)
  })

  it('accepts a boolean audioOptIn', () => {
    expect(isValidUserConfig({ ...baseConfig, audioOptIn: true })).toBe(true)
    expect(isValidUserConfig({ ...baseConfig, audioOptIn: false })).toBe(true)
  })

  it('rejects a non-boolean audioOptIn', () => {
    expect(isValidUserConfig({ ...baseConfig, audioOptIn: 'yes' })).toBe(false)
    expect(isValidUserConfig({ ...baseConfig, audioOptIn: 1 })).toBe(false)
    expect(isValidUserConfig({ ...baseConfig, audioOptIn: null })).toBe(false)
  })

  it('tolerates a leftover legacy aestheticVariant field', () => {
    expect(
      isValidUserConfig({ ...baseConfig, aestheticVariant: 'retro-platformer' })
    ).toBe(true)
  })

  it('still rejects fundamentally invalid shapes', () => {
    expect(isValidUserConfig(null)).toBe(false)
    expect(isValidUserConfig({})).toBe(false)
    expect(isValidUserConfig({ ...baseConfig, equipment: 'all' })).toBe(false)
  })
})
