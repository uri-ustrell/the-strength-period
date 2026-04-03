export type ExecutedSet = {
  id: string
  sessionId: string
  sessionTemplateId: string
  date: string
  exerciseId: string
  setNumber: number
  repsPlanned: number
  repsActual: number
  weightKgPlanned?: number
  weightKgActual?: number
  rpe?: number
  completedAt: string
}

export type ExecutedSession = {
  id: string
  sessionTemplateId: string
  date: string
  startedAt: string
  completedAt?: string
  sets: ExecutedSet[]
  globalRpe?: number
  notes?: string
  skipped: boolean
}
