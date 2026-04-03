import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload } from 'lucide-react'

import { importData } from '@/services/db/exportImport'

export const ImportButton = () => {
  const { t } = useTranslation('common')
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleFile = async (file: File) => {
    if (!window.confirm(t('data.importConfirm'))) return

    setLoading(true)
    setStatus('idle')
    try {
      const result = await importData(file)
      setStatus(result.success ? 'success' : 'error')
      if (result.success) {
        window.location.reload()
      }
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-1">
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <Upload size={16} />
        {loading ? t('data.importing') : t('data.import')}
      </button>
      {status === 'success' && (
        <p className="text-xs text-green-600 text-center">{t('data.importSuccess')}</p>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-500 text-center">{t('data.importError')}</p>
      )}
    </div>
  )
}
