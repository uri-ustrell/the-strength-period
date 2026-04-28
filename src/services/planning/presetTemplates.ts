import type {
  PresetExerciseEntry,
  PresetSessionTemplate,
  TemplateKey,
  WeekProgressionRate,
} from '@/types/planning'

export const TEMPLATE_KEYS: TemplateKey[] = ['A', 'B', 'C', 'D']

/**
 * Ensures the working copy of a preset's `sessions` always has exactly 4 A/B/C/D entries.
 * - Pads missing slots with empty templates.
 * - Truncates extras (after key/name backfill).
 * - Backfills missing `templateKey` and `name` for legacy entries.
 *
 * Does NOT mutate input arrays/objects (deep-copies entries' `exercises`).
 */
export function normalizeFourTemplates(
  sessions: PresetSessionTemplate[] | undefined
): PresetSessionTemplate[] {
  const out: PresetSessionTemplate[] = []
  const source = sessions ?? []
  for (let i = 0; i < TEMPLATE_KEYS.length; i++) {
    const key = TEMPLATE_KEYS[i] as TemplateKey
    const existing = source[i]
    if (existing) {
      const templateKey = existing.templateKey ?? key
      const name = existing.name && existing.name.trim().length > 0 ? existing.name : templateKey
      const session: PresetSessionTemplate = {
        templateKey,
        name,
        exercises: existing.exercises.map((e) => ({ ...e })),
      }
      if (existing.isDeload) session.isDeload = true
      out.push(session)
    } else {
      out.push({ templateKey: key, name: key, exercises: [] })
    }
  }
  return out
}

/**
 * Default per-week rate generator: +5% non-deload, -40% on `week % 4 === 0`.
 */
export function buildDefaultProgressionRates(n: number): WeekProgressionRate[] {
  return Array.from({ length: n }, (_, i) => {
    const week = i + 1
    return { week, progressionPct: week % 4 === 0 ? -40 : 5 }
  })
}

/**
 * Pad/truncate `rates` to `n` weeks, preserving any user-edited entries.
 * New entries appended on growth use the default formula.
 */
export function resizeProgressionRates(
  rates: WeekProgressionRate[],
  n: number
): WeekProgressionRate[] {
  const out: WeekProgressionRate[] = []
  for (let i = 0; i < n; i++) {
    const week = i + 1
    const existing = rates[i]
    if (existing) {
      out.push({ week, progressionPct: existing.progressionPct })
    } else {
      out.push({ week, progressionPct: week % 4 === 0 ? -40 : 5 })
    }
  }
  return out
}

/**
 * Convenience: blank exercise entry with sensible defaults.
 */
export function blankExerciseEntry(exerciseId = ''): PresetExerciseEntry {
  return { exerciseId, sets: 3, reps: 10, restSeconds: 90 }
}

/**
 * Migrate a legacy `weeklyProgression` slider value (0–10) to a per-week rates array.
 * Non-deload weeks use the slider value (treated as a percentage).
 * Weeks where `week % 4 === 0` deload at -40%.
 */
export function migrateSliderToRates(
  weeklyProgression: number,
  durationWeeks: number
): WeekProgressionRate[] {
  return Array.from({ length: durationWeeks }, (_, i) => {
    const week = i + 1
    return { week, progressionPct: week % 4 === 0 ? -40 : weeklyProgression }
  })
}
