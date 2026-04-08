import * as configRepo from '@/services/db/configRepository'
import * as mesocycleRepo from '@/services/db/mesocycleRepository'
import * as sessionRepo from '@/services/db/sessionRepository'

export function useDB() {
  return {
    config: {
      get: configRepo.getConfig,
      set: configRepo.setConfig,
      getAll: configRepo.getAllConfig,
    },
    mesocycles: {
      save: mesocycleRepo.saveMesocycle,
      get: mesocycleRepo.getMesocycle,
      getActive: mesocycleRepo.getActiveMesocycle,
      list: mesocycleRepo.listMesocycles,
      update: mesocycleRepo.updateMesocycle,
    },
    sessions: {
      save: sessionRepo.saveSession,
      get: sessionRepo.getSession,
      listByDateRange: sessionRepo.listSessionsByDateRange,
      getSetsBySession: sessionRepo.getSetsBySession,
      getSetsByExercise: sessionRepo.getSetsByExercise,
      markTemplateCompleted: sessionRepo.markTemplateCompleted,
      listSetsByDateRange: sessionRepo.listSetsByDateRange,
      listAllSessions: sessionRepo.listAllSessions,
      listAllSets: sessionRepo.listAllSets,
    },
  }
}
