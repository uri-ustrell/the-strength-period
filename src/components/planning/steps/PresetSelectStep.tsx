import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ALL_EQUIPMENT } from '@/data/equipmentCatalog'
import type { CustomPreset, Preset } from '@/data/presets'
import { PRESETS } from '@/data/presets'
import type { DayOfWeek, Equipment, Exercise, ExerciseTag } from '@/types/exercise'

interface Props {
  exercises: Exercise[]
  userEquipment: Equipment[]
  userTrainingDays: DayOfWeek[]
  customPresets: CustomPreset[]
  onSelectPreset: (preset: Preset) => void
  onSelectCustomPreset: (cp: CustomPreset, editing?: boolean) => void
  onDeleteCustomPreset: (id: string) => void
  onCreateFromScratch: () => void
}

export const PresetSelectStep = ({
  exercises,
  userEquipment,
  userTrainingDays,
  customPresets,
  onSelectPreset,
  onSelectCustomPreset,
  onDeleteCustomPreset,
  onCreateFromScratch,
}: Props) => {
  const { t } = useTranslation(['planning', 'onboarding'])

  const [presetSearch, setPresetSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<ExerciseTag[]>([])
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment[]>(() => [...userEquipment])

  // Collect all unique tags from presets for the tag filter
  const allPresetTags = useMemo(() => {
    const tags = new Set<ExerciseTag>()
    for (const p of PRESETS) {
      for (const tag of p.requiredTags) tags.add(tag)
    }
    return Array.from(tags)
  }, [])

  const filteredPresets = useMemo(() => {
    const eqSet = new Set(equipmentFilter)
    return PRESETS.filter((p) => {
      if (presetSearch.trim()) {
        const name = t(p.nameKey).toLowerCase()
        const desc = t(p.descriptionKey).toLowerCase()
        const q = presetSearch.toLowerCase()
        if (!name.includes(q) && !desc.includes(q)) return false
      }
      if (selectedTags.length > 0) {
        if (!selectedTags.some((tag) => p.requiredTags.includes(tag))) return false
      }
      // Equipment filter: check if preset exercises use only equipment in the filter
      if (eqSet.size > 0 && p.sessions && p.sessions.length > 0) {
        const presetExerciseIds = new Set<string>()
        for (const s of p.sessions) {
          for (const e of s.exercises) presetExerciseIds.add(e.exerciseId)
        }
        const presetExercises = exercises.filter((ex) => presetExerciseIds.has(ex.id))
        if (presetExercises.length > 0) {
          const usesUnavailableEquipment = presetExercises.some((ex) =>
            ex.equipment.some((eq) => eq !== 'pes_corporal' && !eqSet.has(eq))
          )
          if (usesUnavailableEquipment) return false
        }
      }
      return true
    })
  }, [presetSearch, selectedTags, equipmentFilter, exercises, t])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">{t('planning:selectPreset')}</h2>

      {/* Search filter */}
      <input
        type="text"
        value={presetSearch}
        onChange={(e) => setPresetSearch(e.target.value)}
        placeholder={t('planning:search_presets')}
        className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />

      {/* Tag filter */}
      {allPresetTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allPresetTags.map((tag) => {
            const active = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setSelectedTags((prev) =>
                    active ? prev.filter((x) => x !== tag) : [...prev, tag]
                  )
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  active
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border-subtle text-text-muted hover:border-accent/40'
                }`}
              >
                {t(`planning:preset_tags.${tag}`)}
              </button>
            )
          })}
        </div>
      )}

      {/* Equipment filter */}
      <div>
        <p className="text-xs font-medium text-text-muted mb-1.5">
          {t('planning:equipment_filter')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_EQUIPMENT.map((eq) => {
            const active = equipmentFilter.includes(eq)
            return (
              <button
                key={eq}
                type="button"
                onClick={() =>
                  setEquipmentFilter((prev) =>
                    active ? prev.filter((e) => e !== eq) : [...prev, eq]
                  )
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  active
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border-subtle text-text-muted hover:border-accent/40'
                }`}
              >
                {t(`onboarding:equipment.${eq}`)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filteredPresets.map((preset) => {
          const required = preset.sessions?.length ?? 0
          const incompatible = required > userTrainingDays.length
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              disabled={incompatible}
              title={
                incompatible
                  ? t('planning:incompatible_days_tooltip', { count: required })
                  : undefined
              }
              className={`rounded-xl border-2 p-4 text-left transition-colors ${
                incompatible
                  ? 'border-border-subtle bg-bg opacity-60 cursor-not-allowed'
                  : 'border-border-subtle hover:border-indigo-400 hover:bg-accent/10'
              }`}
            >
              <h3 className="font-medium text-sm text-text-primary">{t(preset.nameKey)}</h3>
              <p className="mt-1 text-xs text-text-muted">{t(preset.descriptionKey)}</p>
              {incompatible && (
                <span className="mt-2 inline-block rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-medium text-warning">
                  {t('planning:incompatible_days_badge', { count: required })}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {customPresets.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-text-muted mt-4">
            {t('planning:saved_presets')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {customPresets.map((cp) => {
              const required = cp.sessions?.length ?? 0
              const incompatible = required > userTrainingDays.length
              return (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => onSelectCustomPreset(cp)}
                  disabled={incompatible}
                  title={
                    incompatible
                      ? t('planning:incompatible_days_tooltip', { count: required })
                      : undefined
                  }
                  className={`rounded-xl border-2 p-4 text-left transition-colors relative group ${
                    incompatible
                      ? 'border-border-subtle bg-bg opacity-60 cursor-not-allowed'
                      : 'border-border-subtle hover:border-indigo-400 hover:bg-accent/10'
                  }`}
                >
                  <h3 className="font-medium text-sm text-text-primary">{cp.name}</h3>
                  <p className="mt-1 text-xs text-text-muted">
                    {cp.durationWeeks} {t('planning:weeks')}
                  </p>
                  {incompatible && (
                    <span className="mt-2 inline-block rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-medium text-warning">
                      {t('planning:incompatible_days_badge', { count: required })}
                    </span>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectCustomPreset(cp, true)
                      }}
                      className="rounded-full p-1 text-text-muted hover:text-accent hover:bg-accent/10"
                      aria-label={t('planning:edit_preset')}
                    >
                      <span className="text-xs font-medium">{t('planning:edit_preset')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteCustomPreset(cp.id)
                      }}
                      className="rounded-full p-1 text-text-muted hover:text-warning hover:bg-warning/10"
                      aria-label={t('planning:delete_preset')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Create from scratch */}
      <button
        type="button"
        onClick={onCreateFromScratch}
        className="w-full rounded-xl border-2 border-dashed border-accent/40 p-4 text-left transition-colors hover:border-accent hover:bg-accent/10"
      >
        <h3 className="font-medium text-sm text-accent">{t('planning:create_from_scratch')}</h3>
        <p className="mt-1 text-xs text-text-muted">{t('planning:create_from_scratch_desc')}</p>
      </button>
    </div>
  )
}
