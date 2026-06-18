import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { WeekProgressionTable } from '@/components/planning/WeekProgressionTable'
import { MAX_CYCLE_WEEKS, MIN_CYCLE_WEEKS } from '@/services/planning/presetTemplates'
import type { PresetSessionTemplate, WeekProgressionRate } from '@/types/planning'

interface Props {
  presetName: string
  weeks: number
  daysPerWeek: number
  minutesPerSession: number
  weeklyProgressionRates: WeekProgressionRate[]
  editablePresetSessions: PresetSessionTemplate[]
  editingPresetId: string | null
  /** Disables the deterministic "generate" CTA (no exercises in catalog). */
  generateDisabled: boolean
  /** Disables the LLM CTA (no exercises match the user's equipment). */
  llmDisabled: boolean
  onBack: () => void
  onPresetNameChange: (name: string) => void
  onWeeksChange: (weeks: number) => void
  onDaysChange: (days: number) => void
  onMinutesChange: (minutes: number) => void
  onRatesChange: (rates: WeekProgressionRate[]) => void
  onSaveAsPreset: () => void
  onGenerate: () => void
  onUseLLM: () => void
}

export const ConfigureStep = ({
  presetName,
  weeks,
  daysPerWeek,
  minutesPerSession,
  weeklyProgressionRates,
  editablePresetSessions,
  editingPresetId,
  generateDisabled,
  llmDisabled,
  onBack,
  onPresetNameChange,
  onWeeksChange,
  onDaysChange,
  onMinutesChange,
  onRatesChange,
  onSaveAsPreset,
  onGenerate,
  onUseLLM,
}: Props) => {
  const { t } = useTranslation(['planning', 'common'])

  // Cycle length is now constrained to 1..4 weeks regardless of legacy preset.durationOptions.
  const cycleWeekOptions = Array.from(
    { length: MAX_CYCLE_WEEKS - MIN_CYCLE_WEEKS + 1 },
    (_, i) => MIN_CYCLE_WEEKS + i
  )

  // In faithful mode, only the exact number of templates is selectable. Built-in
  // & custom presets are always length-4 today, so users see a single 4-day chip.
  const sessionsPerWeek = editablePresetSessions.length
  const dayOptions =
    sessionsPerWeek > 0 ? [2, 3, 4, 5, 6].filter((d) => d === sessionsPerWeek) : [2, 3, 4, 5, 6]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-text-muted/70 hover:text-text-primary"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold text-text-primary">
          {editingPresetId
            ? t('planning:editing_preset', { name: presetName || '…' })
            : t('planning:configure')}
        </h2>
      </div>

      {/* Inline preset name (working copy) */}
      <div>
        <label htmlFor="preset-name-input" className="block text-sm font-medium text-text-primary">
          {t('planning:preset_name_label')}
        </label>
        <input
          id="preset-name-input"
          type="text"
          value={presetName}
          onChange={(e) => onPresetNameChange(e.target.value)}
          placeholder={t('planning:preset_name_placeholder')}
          className="mt-1 w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        {!presetName.trim() && (
          <p className="mt-1 text-xs text-text-muted/70">{t('planning:preset_name_required')}</p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="block text-sm font-medium text-text-primary">
            {t('planning:weeks_per_cycle_label')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {cycleWeekOptions.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onWeeksChange(w)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  weeks === w
                    ? 'bg-accent text-white'
                    : 'bg-surface-elevated text-text-primary hover:bg-surface-elevated'
                }`}
              >
                {w} {t('planning:weeks')}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-text-muted/70">
            {weeks === 1
              ? t('planning:weeks_per_cycle_only_deload')
              : t('planning:weeks_per_cycle_hint')}
          </p>
        </div>

        <div>
          <p className="block text-sm font-medium text-text-primary">
            {t('planning:days_per_week')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {dayOptions.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDaysChange(d)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  daysPerWeek === d
                    ? 'bg-accent text-white'
                    : 'bg-surface-elevated text-text-primary hover:bg-surface-elevated'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          {editablePresetSessions.length > 0 && (
            <p className="mt-1 text-xs text-text-muted/70">
              {t('planning:days_per_week_locked', { count: editablePresetSessions.length })}
            </p>
          )}
        </div>

        <div>
          <p className="block text-sm font-medium text-text-primary">
            {t('planning:minutes_per_session')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[30, 45, 60, 75, 90].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onMinutesChange(m)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  minutesPerSession === m
                    ? 'bg-accent text-white'
                    : 'bg-surface-elevated text-text-primary hover:bg-surface-elevated'
                }`}
              >
                {m} {t('common:dashboard.minutes')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <WeekProgressionTable
          weeks={weeks}
          rates={weeklyProgressionRates}
          onChange={onRatesChange}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onSaveAsPreset}
          disabled={!presetName.trim()}
          className="rounded-lg bg-accent/20 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          {t('planning:save_as_preset')}
        </button>
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={generateDisabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-white font-medium hover:brightness-110 transition-colors disabled:opacity-50"
      >
        {t('planning:generate_instant')}
      </button>

      <div className="flex items-center gap-3">
        <hr className="flex-1 border-border-subtle" />
        <span className="text-xs text-text-muted/70">{t('planning:llm.or_separator')}</span>
        <hr className="flex-1 border-border-subtle" />
      </div>

      <button
        type="button"
        onClick={onUseLLM}
        disabled={llmDisabled}
        className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-indigo-200 py-3 text-accent font-medium hover:bg-accent/10 transition-colors disabled:opacity-50"
      >
        <span>✨ {t('planning:llm.use_llm')}</span>
        <span className="text-xs font-normal text-text-muted">
          {t('planning:llm.use_llm_desc')}
        </span>
      </button>
    </div>
  )
}
