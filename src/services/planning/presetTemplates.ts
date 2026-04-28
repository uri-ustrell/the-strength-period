import type {
  PresetExerciseEntry,
  PresetSessionTemplate,
  TemplateKey,
  WeekProgressionRate,
} from '@/types/planning'

export const TEMPLATE_KEYS: TemplateKey[] = ['A', 'B', 'C', 'D']

/** Maximum number of session templates per preset cycle. */
export const MAX_TEMPLATES = 4
/** Minimum number of session templates per preset cycle. */
export const MIN_TEMPLATES = 1
/** Maximum number of weeks in a single mesocycle (last week is always deload). */
export const MAX_CYCLE_WEEKS = 4
/** Minimum number of weeks in a single mesocycle. */
export const MIN_CYCLE_WEEKS = 1
/** Default cycle length when nothing else is specified. */
export const DEFAULT_CYCLE_WEEKS = 4

/**
 * Sanitize a preset's `sessions` array, preserving its existing length (1..4).
 * - Backfills missing `templateKey` and `name` for legacy entries.
 * - Truncates to MAX_TEMPLATES.
 * - When called with no sessions, returns 4 blank A/B/C/D templates (default UX).
 *
 * Does NOT mutate input arrays/objects (deep-copies entries' `exercises`).
 */
export function normalizeTemplates(
  sessions: PresetSessionTemplate[] | undefined
): PresetSessionTemplate[] {
  const source = sessions ?? []
  if (source.length === 0) {
    return TEMPLATE_KEYS.map((key) => ({ templateKey: key, name: key, exercises: [] }))
  }
  const out: PresetSessionTemplate[] = []
  const limit = Math.min(source.length, MAX_TEMPLATES)
  for (let i = 0; i < limit; i++) {
    const existing = source[i]
    if (!existing) continue
    const fallbackKey = TEMPLATE_KEYS[i] as TemplateKey
    const templateKey = existing.templateKey ?? fallbackKey
    const name = existing.name && existing.name.trim().length > 0 ? existing.name : templateKey
    const session: PresetSessionTemplate = {
      templateKey,
      name,
      exercises: existing.exercises.map((e) => ({ ...e })),
    }
    if (existing.isDeload) session.isDeload = true
    out.push(session)
  }
  return out
}

/**
 * Default per-week rate generator: +5% non-deload weeks, -40% on the LAST week
 * (the deload week, by convention).
 */
export function buildDefaultProgressionRates(n: number): WeekProgressionRate[] {
  const total = Math.max(1, n)
  return Array.from({ length: total }, (_, i) => {
    const week = i + 1
    return { week, progressionPct: week === total ? -40 : 5 }
  })
}

/**
 * Pad/truncate `rates` to `n` weeks, preserving any user-edited entries.
 * New entries appended on growth use the default formula (last week = deload).
 */
export function resizeProgressionRates(
  rates: WeekProgressionRate[],
  n: number
): WeekProgressionRate[] {
  const total = Math.max(1, n)
  const out: WeekProgressionRate[] = []
  for (let i = 0; i < total; i++) {
    const week = i + 1
    const existing = rates[i]
    if (existing) {
      out.push({ week, progressionPct: existing.progressionPct })
    } else {
      out.push({ week, progressionPct: week === total ? -40 : 5 })
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
 * Last week always deloads at -40%.
 */
export function migrateSliderToRates(
  weeklyProgression: number,
  durationWeeks: number
): WeekProgressionRate[] {
  const total = Math.max(1, durationWeeks)
  return Array.from({ length: total }, (_, i) => {
    const week = i + 1
    return { week, progressionPct: week === total ? -40 : weeklyProgression }
  })
}

/**
 * Build a new blank session template for the given key (A/B/C/D).
 */
export function blankSessionTemplate(templateKey: TemplateKey): PresetSessionTemplate {
  return { templateKey, name: templateKey, exercises: [] }
}

/**
 * Return the next available template key not yet present in `sessions`,
 * preferring A → B → C → D order. Returns null when all 4 keys are taken.
 */
export function nextAvailableTemplateKey(sessions: PresetSessionTemplate[]): TemplateKey | null {
  const used = new Set(sessions.map((s) => s.templateKey))
  for (const key of TEMPLATE_KEYS) {
    if (!used.has(key)) return key
  }
  return null
}
