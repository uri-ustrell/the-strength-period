import { describe, expect, it } from 'vitest'
import { isValidUserConfig } from '@/stores/userStore'

/**
 * `isValidUserConfig` contract test for the optional `aestheticVariant` field.
 *
 * Spec: `specs/features/16-ethical-gamification.md` — the persisted variant
 * is an optional free-form string. The validator must reject any non-string
 * value (number, object, array, boolean) while still accepting `undefined`
 * (legacy configs).
 */

const baseConfig = {
  language: 'ca',
  equipment: ['pes_corporal'],
  trainingDays: [1, 3, 5],
  minutesPerSession: 45,
  availableWeights: { manueles: [], barra: [] },
  onboardingCompleted: true,
}

describe('isValidUserConfig — aestheticVariant', () => {
  it('accepts the field when it is a string', () => {
    expect(isValidUserConfig({ ...baseConfig, aestheticVariant: 'classic-boring' })).toBe(true)
  })

  it('accepts the field when it is undefined (legacy config)', () => {
    expect(isValidUserConfig({ ...baseConfig })).toBe(true)
  })

  it('rejects a numeric aestheticVariant', () => {
    expect(isValidUserConfig({ ...baseConfig, aestheticVariant: 42 })).toBe(false)
  })

  it('rejects an object aestheticVariant', () => {
    expect(isValidUserConfig({ ...baseConfig, aestheticVariant: { name: 'x' } })).toBe(false)
  })

  it('rejects a null aestheticVariant', () => {
    // `typeof null === 'object'`, not `'string'` — must be rejected.
    expect(isValidUserConfig({ ...baseConfig, aestheticVariant: null })).toBe(false)
  })

  it('rejects a boolean aestheticVariant', () => {
    expect(isValidUserConfig({ ...baseConfig, aestheticVariant: true })).toBe(false)
  })
})
