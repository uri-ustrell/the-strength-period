import type { Mesocycle, LoadTarget } from '@/types/planning'

export function skipSession(mesocycle: Mesocycle, templateId: string): Mesocycle {
  return {
    ...mesocycle,
    sessions: mesocycle.sessions.map((s) => (s.id === templateId ? { ...s, skipped: true } : s)),
  }
}

export function unskipSession(mesocycle: Mesocycle, templateId: string): Mesocycle {
  return {
    ...mesocycle,
    sessions: mesocycle.sessions.map((s) => (s.id === templateId ? { ...s, skipped: false } : s)),
  }
}

export function adjustLoad(
  mesocycle: Mesocycle,
  templateId: string,
  muscleGroup: string,
  loadUpdates: Partial<LoadTarget>
): Mesocycle {
  return {
    ...mesocycle,
    sessions: mesocycle.sessions.map((s) => {
      if (s.id !== templateId) return s
      return {
        ...s,
        muscleGroupTargets: s.muscleGroupTargets.map((t) => {
          if (t.muscleGroup !== muscleGroup) return t
          return {
            ...t,
            loadTarget: { ...t.loadTarget, ...loadUpdates },
          }
        }),
      }
    }),
  }
}
