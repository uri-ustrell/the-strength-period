export type SnapDirection = 'up' | 'down' | 'nearest'

export function snapToAvailableWeight(
  targetKg: number,
  availableWeights: number[],
  direction: SnapDirection = 'nearest'
): number {
  if (availableWeights.length === 0) return targetKg

  const sorted = [...availableWeights].sort((a, b) => a - b)

  if (direction === 'up') {
    const higher = sorted.find((w) => w >= targetKg)
    return higher ?? sorted[sorted.length - 1] ?? targetKg
  }

  if (direction === 'down') {
    const lower = [...sorted].reverse().find((w) => w <= targetKg)
    // If no candidate is <= target, fall back to the smallest available weight
    // (which is still > target). The previous code returned the smallest too
    // but its semantics were unclear; we keep the behaviour and document it.
    return lower ?? sorted[0] ?? targetKg
  }

  // nearest
  let closest = sorted[0] ?? targetKg
  let minDiff = Math.abs(targetKg - closest)

  for (const w of sorted) {
    const diff = Math.abs(targetKg - w)
    if (diff < minDiff) {
      minDiff = diff
      closest = w
    }
  }

  return closest
}

const WEIGHT_EPSILON = 1e-6

export function getAdjacentWeights(
  currentKg: number,
  availableWeights: number[]
): { lower: number | null; higher: number | null } {
  if (availableWeights.length === 0) return { lower: null, higher: null }

  const sorted = [...availableWeights].sort((a, b) => a - b)
  // Use float tolerance instead of strict indexOf so we don't fall through the
  // "not found" branch on values like 22.499999... vs 22.5.
  const currentIndex = sorted.findIndex((w) => Math.abs(w - currentKg) < WEIGHT_EPSILON)

  if (currentIndex === -1) {
    const lower = [...sorted].reverse().find((w) => w < currentKg) ?? null
    const higher = sorted.find((w) => w > currentKg) ?? null
    return { lower, higher }
  }

  return {
    lower: currentIndex > 0 ? (sorted[currentIndex - 1] ?? null) : null,
    higher: currentIndex < sorted.length - 1 ? (sorted[currentIndex + 1] ?? null) : null,
  }
}
