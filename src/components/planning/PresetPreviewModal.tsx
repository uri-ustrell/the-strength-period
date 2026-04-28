import { X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { ProgressionSparkline } from '@/components/planning/ProgressionSparkline'
import type { Preset } from '@/data/presets'
import type { Exercise } from '@/types/exercise'

interface Props {
  preset: Preset
  exercises: Exercise[]
  estimatedMinutesPerSession: number
  onStartNow: () => void
  onCustomize: () => void
  onClose: () => void
}

const formatReps = (reps: number | [number, number]): string =>
  Array.isArray(reps) ? `${reps[0]}–${reps[1]}` : String(reps)

export const PresetPreviewModal = ({
  preset,
  exercises,
  estimatedMinutesPerSession,
  onStartNow,
  onCustomize,
  onClose,
}: Props) => {
  const { t } = useTranslation(['planning', 'common', 'exercises', 'onboarding'])
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // Focus trap + ESC + restore focus on close
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusables?.[0]?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const list = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!list || list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      if (!first || !last) return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused.current?.focus?.()
    }
  }, [onClose])

  const exerciseMap = useMemo(() => {
    const m = new Map<string, Exercise>()
    for (const ex of exercises) m.set(ex.id, ex)
    return m
  }, [exercises])

  const sessionsPerWeek = preset.sessions.filter((s) => s.exercises.length > 0).length

  const requiredEquipment = useMemo(() => {
    const set = new Set<string>()
    for (const session of preset.sessions) {
      for (const entry of session.exercises) {
        const ex = exerciseMap.get(entry.exerciseId)
        if (!ex) continue
        for (const eq of ex.equipment) set.add(eq)
      }
    }
    return Array.from(set).sort()
  }, [preset.sessions, exerciseMap])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[95vh]"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              {t('planning:preview_title')}
            </p>
            <h2 className="text-lg font-semibold text-gray-900 mt-0.5">{t(preset.nameKey)}</h2>
            <p className="text-sm text-gray-500 mt-1">{t(preset.descriptionKey)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:text-gray-700"
            aria-label={t('common:close', { defaultValue: 'Close' })}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            <span className="rounded-full bg-gray-100 px-2.5 py-1">
              {preset.durationOptions[0]} {t('planning:weeks')}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1">
              {t('planning:preview_sessions_per_week', { count: sessionsPerWeek })}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1">
              {t('planning:preview_estimated_duration', { min: estimatedMinutesPerSession })}
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              {t('planning:week_progression_table')}
            </p>
            <div className="rounded-lg border border-gray-200 p-2">
              <ProgressionSparkline rates={preset.weeklyProgressionRates} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {preset.sessions.map((session) => (
              <div key={session.templateKey} className="rounded-lg border border-gray-200">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">
                    {t('planning:template_tab_label', { key: session.templateKey })}{' '}
                    <span className="text-gray-500 font-normal">— {session.name}</span>
                  </p>
                  {session.isDeload && (
                    <span className="text-xs font-medium text-amber-600">
                      {t('planning:deload_week_hint')}
                    </span>
                  )}
                </div>
                <div className="px-3 py-2">
                  {session.exercises.length === 0 ? (
                    <p className="text-xs text-gray-400">—</p>
                  ) : (
                    <ul className="space-y-1">
                      {session.exercises.map((entry, idx) => {
                        const ex = exerciseMap.get(entry.exerciseId)
                        return (
                          <li
                            key={`${session.templateKey}-${idx}-${entry.exerciseId}`}
                            className="flex items-center justify-between text-xs gap-2"
                          >
                            <span className="text-gray-800 truncate">
                              {ex ? t(ex.nameKey) : entry.exerciseId}
                            </span>
                            <span className="text-gray-500 shrink-0">
                              {entry.sets} × {formatReps(entry.reps)}
                              {entry.initialLoadKg ? ` · ${entry.initialLoadKg}kg` : ''} ·{' '}
                              {entry.restSeconds}s
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          {requiredEquipment.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                {t('planning:preview_required_equipment')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {requiredEquipment.map((eq) => (
                  <span
                    key={eq}
                    className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                  >
                    {t(`onboarding:equipment.${eq}`)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
          <button
            type="button"
            onClick={onCustomize}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('planning:customize')}
          </button>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={onStartNow}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t('planning:start_now')}
            </button>
            <p className="text-[11px] text-gray-400">{t('planning:start_now_help')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
