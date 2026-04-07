export type SnapDirection = 'up' | 'down' | 'nearest'

export function snapToAvailableWeight(
  targetKg: number,
  availableWeights: number[],
  direction: SnapDirection = 'nearest',
): number {
  if (availableWeights.length === 0) return targetKg

  const sorted = [...availableWeights].sort((a, b) => a - b)

  if (direction === 'up') {
    const higher = sorted.find((w) => w >= targetKg)
    return higher ?? sorted[sorted.length - 1]!
  }

  if (direction === 'down') {
    const lower = [...sorted].reverse().find((w) => w <= targetKg)
    return lower ?? sorted[0]!
  }

  // nearest
  let closest = sorted[0]!
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

export function getAdjacentWeights(
  currentKg: number,
  availableWeights: number[],
): { lower: number | null; higher: number | null } {
  if (availableWeights.length === 0) return { lower: null, higher: null }

  const sorted = [...availableWeights].sort((a, b) => a - b)
  const currentIndex = sorted.indexOf(currentKg)

  if (currentIndex === -1) {
    const lower = [...sorted].reverse().find((w) => w < currentKg) ?? null
    const higher = sorted.find((w) => w > currentKg) ?? null
    return { lower, higher }
  }

  return {
    lower: currentIndex > 0 ? sorted[currentIndex - 1]! : null,
    higher: currentIndex < sorted.length - 1 ? sorted[currentIndex + 1]! : null,
  }
}
