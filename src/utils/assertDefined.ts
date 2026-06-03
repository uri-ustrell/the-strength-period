/**
 * Narrows `T | null | undefined` to `T`, throwing a clear error when the value is
 * absent. Use for genuine invariants that have no sensible fallback (e.g. a
 * required DOM mount node, or accessing a fixture element a test has just built).
 * Prefer a nullish-coalescing default or an early-return guard when a meaningful
 * fallback exists.
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): T {
  if (value == null) {
    throw new Error(message ?? 'Expected value to be defined')
  }
  return value
}
