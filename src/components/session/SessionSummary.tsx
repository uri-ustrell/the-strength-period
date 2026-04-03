import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ExecutedSet } from '@/types/session'

interface Props {
  executedSets: ExecutedSet[]
  sessionStartedAt: string
  isSaving: boolean
  onFinish: (globalRpe: number, notes?: string) => void
  onDiscard?: () => void
}

export const SessionSummary = ({ executedSets, sessionStartedAt, isSaving, onFinish, onDiscard }: Props) => {
  const { t } = useTranslation(['common', 'exercises'])
  const [globalRpe, setGlobalRpe] = useState(7)
  const [notes, setNotes] = useState('')

  const exercisesDone = new Set(executedSets.map((s) => s.exerciseId)).size
  const totalSets = executedSets.length
  const totalVolume = executedSets.reduce((sum, s) => sum + s.repsActual * (s.weightKgActual ?? 0), 0)

  const elapsedMs = Date.now() - new Date(sessionStartedAt).getTime()
  const elapsedMinutes = Math.round(elapsedMs / 60000)

  const handleSave = () => {
    onFinish(globalRpe, notes.trim() || undefined)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-gray-900">{t('common:session.summary')}</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <p className="text-xs text-green-600">{t('common:session.exercises_done')}</p>
            <p className="text-2xl font-bold text-green-900">{exercisesDone}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-xs text-blue-600">{t('common:session.total_sets')}</p>
            <p className="text-2xl font-bold text-blue-900">{totalSets}</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4 text-center">
            <p className="text-xs text-purple-600">{t('common:session.total_volume')}</p>
            <p className="text-2xl font-bold text-purple-900">{Math.round(totalVolume)}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4 text-center">
            <p className="text-xs text-amber-600">{t('common:session.total_time')}</p>
            <p className="text-2xl font-bold text-amber-900">{elapsedMinutes} {t('common:session.minutes')}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <label htmlFor="rpe-slider" className="mb-2 block text-sm font-semibold text-gray-700">
          {t('common:session.rpe_prompt')}
        </label>
        <div className="flex items-center gap-4">
          <input
            id="rpe-slider"
            type="range"
            min={1}
            max={10}
            value={globalRpe}
            onChange={(e) => setGlobalRpe(parseInt(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600"
          />
          <span className="min-w-[2rem] text-center text-2xl font-bold text-indigo-600">{globalRpe}</span>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <label htmlFor="session-notes" className="mb-2 block text-sm font-semibold text-gray-700">
          {t('common:session.notes_placeholder')}
        </label>
        <textarea
          id="session-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-300 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={t('common:session.notes_placeholder')}
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="w-full rounded-xl bg-green-600 py-4 text-base font-semibold text-white disabled:opacity-50 active:bg-green-700"
      >
        {isSaving ? t('common:session.saving') : t('common:session.save_close')}
      </button>

      {onDiscard && (
        <button
          type="button"
          onClick={onDiscard}
          disabled={isSaving}
          className="w-full rounded-xl border border-gray-300 bg-white py-3 text-sm font-medium text-gray-600 disabled:opacity-50 active:bg-gray-50"
        >
          {t('common:session_control.discard')}
        </button>
      )}
    </div>
  )
}
