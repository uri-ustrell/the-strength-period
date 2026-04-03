import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Power } from 'lucide-react'

import { usePlanningStore } from '@/stores/planningStore'
import { useUserStore } from '@/stores/userStore'
import { PlanCreator } from '@/components/planning/PlanCreator'
import { MonthView } from '@/components/planning/MonthView'

function getCurrentWeek(startDate: string): number {
  const start = new Date(startDate)
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  return Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1)
}

export const Planning = () => {
  const { t } = useTranslation(['planning', 'common'])

  const loadActive = usePlanningStore((s) => s.loadActive)
  const activeMesocycle = usePlanningStore((s) => s.activeMesocycle)
  const isLoading = usePlanningStore((s) => s.isLoading)
  const deactivate = usePlanningStore((s) => s.deactivate)
  const loadUserConfig = useUserStore((s) => s.loadUserConfig)

  const [showCreator, setShowCreator] = useState(false)

  useEffect(() => {
    loadActive()
    loadUserConfig()
  }, [loadActive, loadUserConfig])

  const currentWeek = useMemo(() => {
    if (!activeMesocycle) return 1
    return Math.min(getCurrentWeek(activeMesocycle.startDate), activeMesocycle.durationWeeks)
  }, [activeMesocycle])

  const completedIds = useMemo(() => {
    if (!activeMesocycle) return new Set<string>()
    return new Set(
      activeMesocycle.sessions.filter((s) => s.completed).map((s) => s.id),
    )
  }, [activeMesocycle])

  const handleDeactivate = async () => {
    if (!activeMesocycle) return
    await deactivate(activeMesocycle.id)
    setShowCreator(false)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!activeMesocycle || showCreator) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white px-5 pt-6 pb-4 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">{t('planning:title')}</h1>
          {!activeMesocycle && (
            <p className="text-sm text-gray-500 mt-1">{t('planning:createFirst')}</p>
          )}
        </div>
        <div className="px-5 pt-4">
          <PlanCreator onComplete={() => setShowCreator(false)} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('planning:active_plan')}</h1>
            <p className="text-sm text-gray-500">
              {activeMesocycle.name} — {t('planning:week')} {currentWeek}/{activeMesocycle.durationWeeks}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCreator(true)}
              className="rounded-lg bg-indigo-100 p-2 text-indigo-600 hover:bg-indigo-200 transition-colors"
              title={t('common:dashboard.create_plan')}
            >
              <Plus size={18} />
            </button>
            <button
              type="button"
              onClick={handleDeactivate}
              className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100 transition-colors"
              title={t('planning:deactivate')}
            >
              <Power size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-4">
        <MonthView
          mesocycle={activeMesocycle}
          currentWeek={currentWeek}
          completedTemplateIds={completedIds}
        />
      </div>
    </div>
  )
}

