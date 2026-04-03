import { useCallback } from 'react'

import * as configRepo from '@/services/db/configRepository'
import * as mesocycleRepo from '@/services/db/mesocycleRepository'
import * as sessionRepo from '@/services/db/sessionRepository'

export function useDB() {
  const config = {
    get: useCallback(configRepo.getConfig, []),
    set: useCallback(configRepo.setConfig, []),
    getAll: useCallback(configRepo.getAllConfig, []),
  }

  const mesocycles = {
    save: useCallback(mesocycleRepo.saveMesocycle, []),
    get: useCallback(mesocycleRepo.getMesocycle, []),
    getActive: useCallback(mesocycleRepo.getActiveMesocycle, []),
    list: useCallback(mesocycleRepo.listMesocycles, []),
    update: useCallback(mesocycleRepo.updateMesocycle, []),
  }

  const sessions = {
    save: useCallback(sessionRepo.saveSession, []),
    get: useCallback(sessionRepo.getSession, []),
    listByDateRange: useCallback(sessionRepo.listSessionsByDateRange, []),
    getSetsBySession: useCallback(sessionRepo.getSetsBySession, []),
    getSetsByExercise: useCallback(sessionRepo.getSetsByExercise, []),
    markTemplateCompleted: useCallback(sessionRepo.markTemplateCompleted, []),
    listSetsByDateRange: useCallback(sessionRepo.listSetsByDateRange, []),
    listAllSessions: useCallback(sessionRepo.listAllSessions, []),
    listAllSets: useCallback(sessionRepo.listAllSets, []),
  }

  return { config, mesocycles, sessions }
}
