import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'

import { exportData } from '@/services/db/exportImport'

export const ExportButton = () => {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    setError(false)
    try {
      await exportData()
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <Download size={16} />
        {loading ? t('data.exporting') : t('data.export')}
      </button>
      {error && <p className="text-xs text-red-500 text-center">{t('data.exportError')}</p>}
    </div>
  )
}
