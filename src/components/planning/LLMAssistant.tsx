import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Copy, Check, Download, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'

import type { Preset } from '@/data/presets'
import type { UserConfig } from '@/types/user'
import type { Exercise } from '@/types/exercise'
import type { Mesocycle } from '@/types/planning'
import type { ValidationResult } from '@/services/planning/llmAssistantService'
import { getConfig, setConfig } from '@/services/db/configRepository'
import {
  generatePromptTemplate,
  resolvePromptParams,
  generateExerciseCsv,
  validateLLMResponse,
  convertToMesocycle,
} from '@/services/planning/llmAssistantService'

interface LLMAssistantProps {
  preset: Preset | null
  config: UserConfig
  weeks: number
  daysPerWeek: number
  minutesPerSession: number
  weeklyProgression: number
  filteredExercises: Exercise[]
  onImport: (mesocycle: Mesocycle) => void
  onBack: () => void
}

export const LLMAssistant = ({
  preset,
  config,
  weeks,
  daysPerWeek,
  minutesPerSession,
  weeklyProgression,
  filteredExercises,
  onImport,
  onBack,
}: LLMAssistantProps) => {
  const { t, i18n } = useTranslation(['planning', 'common', 'exercises'])

  const [personalNotes, setPersonalNotes] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [copyFeedback, setCopyFeedback] = useState(false)

  // Load personal notes from config on mount
  useEffect(() => {
    const loadNotes = async () => {
      const saved = (await getConfig('llmPersonalNotes')) as string | null
      if (saved) setPersonalNotes(saved)
    }
    loadNotes()
  }, [])

  // Save personal notes on blur
  const handleNotesBlur = useCallback(() => {
    setConfig('llmPersonalNotes', personalNotes)
  }, [personalNotes])

  // Build training days array from daysPerWeek
  const trainingDays = useMemo(() => {
    if (daysPerWeek === config.trainingDays.length) {
      return config.trainingDays
    }
    const spacing = 7 / daysPerWeek
    return Array.from({ length: daysPerWeek }, (_, i) =>
      Math.min(7, Math.max(1, Math.round(1 + i * spacing)))
    )
  }, [daysPerWeek, config.trainingDays])

  // Generate prompt
  const prompt = useMemo(() => {
    const presetName = preset ? t(preset.nameKey, { lng: 'en' }) : t('planning:custom', { lng: 'en' })
    const params = resolvePromptParams({
      presetName,
      durationWeeks: weeks,
      trainingDays,
      minutesPerSession,
      equipment: config.equipment,
      activeRestrictions: config.activeRestrictions,
      weeklyProgression,
      personalNotes: personalNotes.trim() || undefined,
    })
    return generatePromptTemplate(params)
  }, [
    preset,
    weeks,
    trainingDays,
    minutesPerSession,
    config.equipment,
    config.activeRestrictions,
    weeklyProgression,
    personalNotes,
    t,
  ])

  // Exercise map for validation/conversion
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>()
    for (const ex of filteredExercises) {
      map.set(ex.id, ex)
    }
    return map
  }, [filteredExercises])

  const validExerciseIds = useMemo(() => {
    return new Set(filteredExercises.map((ex) => ex.id))
  }, [filteredExercises])

  // Copy prompt
  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch {
      // Fallback: select the text area content
      const textarea = document.getElementById('llm-prompt-display') as HTMLTextAreaElement | null
      if (textarea) {
        textarea.select()
      }
    }
  }, [prompt])

  // Download CSV
  const handleDownloadCsv = useCallback(() => {
    const getEnglishName = (nameKey: string) => i18n.t(nameKey, { lng: 'en' })
    const csv = generateExerciseCsv(filteredExercises, getEnglishName)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'exercise-catalog.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [filteredExercises, i18n])

  // Validate
  const handleValidate = useCallback(() => {
    const result = validateLLMResponse(jsonInput, validExerciseIds, minutesPerSession, exerciseMap)
    setValidationResult(result)
  }, [jsonInput, validExerciseIds, minutesPerSession, exerciseMap])

  // Import
  const handleImport = useCallback(() => {
    if (!validationResult?.parsed) return
    const presetId = preset?.id ?? 'llm_custom'
    const mesocycle = convertToMesocycle(validationResult.parsed, presetId, config, exerciseMap)
    onImport(mesocycle)
  }, [validationResult, preset, config, exerciseMap, onImport])

  const notesLength = personalNotes.length
  const notesCountColor =
    notesLength >= 500 ? 'text-red-500' : notesLength >= 400 ? 'text-amber-500' : 'text-gray-400'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">{t('planning:llm.title')}</h2>
      </div>

      {/* How to use */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <h3 className="text-sm font-semibold text-indigo-900 mb-2">
          {t('planning:llm.how_to_use')}
        </h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-indigo-800">
          <li>{t('planning:llm.step_1')}</li>
          <li>{t('planning:llm.step_2')}</li>
          <li>{t('planning:llm.step_3')}</li>
          <li>{t('planning:llm.step_4')}</li>
          <li>{t('planning:llm.step_5')}</li>
          <li>{t('planning:llm.step_6')}</li>
          <li>{t('planning:llm.step_7')}</li>
        </ol>
      </div>

      {/* Personal notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('planning:llm.personal_notes')}
        </label>
        <textarea
          value={personalNotes}
          onChange={(e) => setPersonalNotes(e.target.value.slice(0, 500))}
          onBlur={handleNotesBlur}
          maxLength={500}
          placeholder={t('planning:llm.personal_notes_placeholder')}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px] resize-y"
        />
        <p className={`text-xs mt-1 text-right ${notesCountColor}`}>{notesLength}/500</p>
      </div>

      {/* Prompt display */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('planning:llm.prompt_section')}
        </label>
        <textarea
          id="llm-prompt-display"
          readOnly
          value={prompt}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono focus:outline-none max-h-64 overflow-y-auto resize-none min-h-[160px]"
        />
        <button
          type="button"
          onClick={handleCopyPrompt}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copyFeedback ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          {copyFeedback ? t('planning:llm.copied') : t('planning:llm.copy_prompt')}
        </button>
      </div>

      {/* CSV download */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('planning:llm.catalog_section')}
        </label>
        <p className="text-xs text-gray-500 mb-2">
          {t('planning:llm.catalog_count', { count: filteredExercises.length })}
        </p>
        <button
          type="button"
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download size={14} />
          {t('planning:llm.download_csv')}
        </button>
      </div>

      <hr className="border-gray-200" />

      {/* JSON paste */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('planning:llm.paste_section')}
        </label>
        <textarea
          value={jsonInput}
          onChange={(e) => {
            setJsonInput(e.target.value)
            setValidationResult(null)
          }}
          placeholder={t('planning:llm.paste_placeholder')}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[160px] resize-y"
        />
        <button
          type="button"
          onClick={handleValidate}
          disabled={!jsonInput.trim()}
          className="mt-2 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {t('planning:llm.validate')}
        </button>
      </div>

      {/* Validation results */}
      {validationResult && (
        <div className="space-y-3">
          {/* Errors */}
          {validationResult.errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1.5">
                <XCircle size={16} />
                {t('planning:llm.errors_title')}
              </h4>
              <ul className="space-y-1">
                {validationResult.errors.map((err, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-red-700">
                    <span className="shrink-0 mt-0.5">✕</span>
                    <span>{t(`planning:${err.key}`, err.params ?? {})}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success */}
          {validationResult.valid && validationResult.parsed && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                <CheckCircle size={16} />
                {t('planning:llm.valid_plan', {
                  weeks: validationResult.parsed.durationWeeks,
                  sessions: validationResult.parsed.sessions.length,
                })}
              </p>
            </div>
          )}

          {/* Warnings */}
          {validationResult.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={16} />
                {t('planning:llm.warnings_title')}
              </h4>
              <ul className="space-y-1">
                {validationResult.warnings.map((warn, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-amber-700">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{t(`planning:${warn.key}`, warn.params ?? {})}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Import button */}
          {validationResult.valid && (
            <button
              type="button"
              onClick={handleImport}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              <Check size={16} />
              {t('planning:llm.import_plan')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
