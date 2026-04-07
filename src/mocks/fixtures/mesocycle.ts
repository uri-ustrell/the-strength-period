type LLMSessionTarget = {
  muscleGroup: string
  percentageOfSession: number
  sets: number
  reps: [number, number]
  rpe: number
  restSeconds: number
}

type LLMSession = {
  dayOfWeek: number
  durationMinutes: number
  muscleGroupTargets: LLMSessionTarget[]
}

type LLMWeek = {
  weekNumber: number
  focus: string
  loadPercentage: number
  sessions: LLMSession[]
}

type LLMResponse = {
  mesocycle: {
    name: string
    durationWeeks: number
    weeks: LLMWeek[]
  }
}

export const mockMesocycleResponse: LLMResponse = {
  mesocycle: {
    name: 'Força General 4 Setmanes',
    durationWeeks: 4,
    weeks: [
      {
        weekNumber: 1,
        focus: 'Activació i patrons de moviment',
        loadPercentage: 70,
        sessions: [
          {
            dayOfWeek: 1,
            durationMinutes: 60,
            muscleGroupTargets: [
              { muscleGroup: 'pectoral', percentageOfSession: 35, sets: 3, reps: [8, 10], rpe: 7, restSeconds: 90 },
              { muscleGroup: 'triceps', percentageOfSession: 20, sets: 3, reps: [10, 12], rpe: 7, restSeconds: 60 },
              { muscleGroup: 'deltoides', percentageOfSession: 25, sets: 3, reps: [10, 12], rpe: 7, restSeconds: 60 },
              { muscleGroup: 'abdominal', percentageOfSession: 20, sets: 3, reps: [12, 15], rpe: 6, restSeconds: 45 },
            ],
          },
          {
            dayOfWeek: 3,
            durationMinutes: 60,
            muscleGroupTargets: [
              { muscleGroup: 'dorsal', percentageOfSession: 40, sets: 3, reps: [8, 10], rpe: 7, restSeconds: 90 },
              { muscleGroup: 'biceps', percentageOfSession: 20, sets: 3, reps: [10, 12], rpe: 7, restSeconds: 60 },
              { muscleGroup: 'trapezi', percentageOfSession: 20, sets: 3, reps: [10, 12], rpe: 7, restSeconds: 60 },
              { muscleGroup: 'abdominal', percentageOfSession: 20, sets: 3, reps: [12, 15], rpe: 6, restSeconds: 45 },
            ],
          },
          {
            dayOfWeek: 5,
            durationMinutes: 60,
            muscleGroupTargets: [
              { muscleGroup: 'quadriceps', percentageOfSession: 35, sets: 3, reps: [8, 10], rpe: 7, restSeconds: 90 },
              { muscleGroup: 'glutis', percentageOfSession: 30, sets: 3, reps: [10, 12], rpe: 7, restSeconds: 90 },
              { muscleGroup: 'isquiotibials', percentageOfSession: 20, sets: 3, reps: [10, 12], rpe: 7, restSeconds: 75 },
              { muscleGroup: 'abdominal', percentageOfSession: 15, sets: 2, reps: [12, 15], rpe: 6, restSeconds: 45 },
            ],
          },
        ],
      },
      {
        weekNumber: 2,
        focus: 'Progressió de càrrega',
        loadPercentage: 80,
        sessions: [
          {
            dayOfWeek: 1,
            durationMinutes: 65,
            muscleGroupTargets: [
              { muscleGroup: 'pectoral', percentageOfSession: 35, sets: 4, reps: [8, 10], rpe: 8, restSeconds: 90 },
              { muscleGroup: 'triceps', percentageOfSession: 20, sets: 3, reps: [10, 12], rpe: 8, restSeconds: 60 },
              { muscleGroup: 'deltoides', percentageOfSession: 25, sets: 3, reps: [10, 12], rpe: 8, restSeconds: 60 },
              { muscleGroup: 'abdominal', percentageOfSession: 20, sets: 3, reps: [12, 15], rpe: 7, restSeconds: 45 },
            ],
          },
          {
            dayOfWeek: 3,
            durationMinutes: 65,
            muscleGroupTargets: [
              { muscleGroup: 'dorsal', percentageOfSession: 40, sets: 4, reps: [8, 10], rpe: 8, restSeconds: 90 },
              { muscleGroup: 'biceps', percentageOfSession: 20, sets: 3, reps: [10, 12], rpe: 8, restSeconds: 60 },
              { muscleGroup: 'trapezi', percentageOfSession: 20, sets: 3, reps: [10, 12], rpe: 8, restSeconds: 60 },
              { muscleGroup: 'abdominal', percentageOfSession: 20, sets: 3, reps: [12, 15], rpe: 7, restSeconds: 45 },
            ],
          },
          {
            dayOfWeek: 5,
            durationMinutes: 65,
            muscleGroupTargets: [
              { muscleGroup: 'quadriceps', percentageOfSession: 35, sets: 4, reps: [8, 10], rpe: 8, restSeconds: 90 },
              { muscleGroup: 'glutis', percentageOfSession: 30, sets: 3, reps: [10, 12], rpe: 8, restSeconds: 90 },
              { muscleGroup: 'isquiotibials', percentageOfSession: 20, sets: 3, reps: [10, 12], rpe: 8, restSeconds: 75 },
              { muscleGroup: 'abdominal', percentageOfSession: 15, sets: 2, reps: [12, 15], rpe: 7, restSeconds: 45 },
            ],
          },
        ],
      },
      {
        weekNumber: 3,
        focus: 'Intensitat màxima',
        loadPercentage: 90,
        sessions: [
          {
            dayOfWeek: 1,
            durationMinutes: 70,
            muscleGroupTargets: [
              { muscleGroup: 'pectoral', percentageOfSession: 35, sets: 4, reps: [6, 8], rpe: 9, restSeconds: 120 },
              { muscleGroup: 'triceps', percentageOfSession: 20, sets: 3, reps: [8, 10], rpe: 9, restSeconds: 90 },
              { muscleGroup: 'deltoides', percentageOfSession: 25, sets: 3, reps: [8, 10], rpe: 8, restSeconds: 75 },
              { muscleGroup: 'abdominal', percentageOfSession: 20, sets: 3, reps: [10, 15], rpe: 7, restSeconds: 45 },
            ],
          },
          {
            dayOfWeek: 3,
            durationMinutes: 70,
            muscleGroupTargets: [
              { muscleGroup: 'dorsal', percentageOfSession: 40, sets: 4, reps: [6, 8], rpe: 9, restSeconds: 120 },
              { muscleGroup: 'biceps', percentageOfSession: 20, sets: 3, reps: [8, 10], rpe: 9, restSeconds: 90 },
              { muscleGroup: 'trapezi', percentageOfSession: 20, sets: 3, reps: [8, 10], rpe: 8, restSeconds: 75 },
              { muscleGroup: 'abdominal', percentageOfSession: 20, sets: 3, reps: [10, 15], rpe: 7, restSeconds: 45 },
            ],
          },
          {
            dayOfWeek: 5,
            durationMinutes: 70,
            muscleGroupTargets: [
              { muscleGroup: 'quadriceps', percentageOfSession: 35, sets: 4, reps: [6, 8], rpe: 9, restSeconds: 120 },
              { muscleGroup: 'glutis', percentageOfSession: 30, sets: 4, reps: [8, 10], rpe: 9, restSeconds: 120 },
              { muscleGroup: 'isquiotibials', percentageOfSession: 20, sets: 3, reps: [8, 10], rpe: 8, restSeconds: 90 },
              { muscleGroup: 'abdominal', percentageOfSession: 15, sets: 2, reps: [12, 15], rpe: 7, restSeconds: 45 },
            ],
          },
        ],
      },
      {
        weekNumber: 4,
        focus: 'Setmana de descàrrega',
        loadPercentage: 60,
        sessions: [
          {
            dayOfWeek: 1,
            durationMinutes: 50,
            muscleGroupTargets: [
              { muscleGroup: 'pectoral', percentageOfSession: 35, sets: 2, reps: [10, 12], rpe: 6, restSeconds: 90 },
              { muscleGroup: 'triceps', percentageOfSession: 20, sets: 2, reps: [12, 15], rpe: 6, restSeconds: 60 },
              { muscleGroup: 'deltoides', percentageOfSession: 25, sets: 2, reps: [12, 15], rpe: 6, restSeconds: 60 },
              { muscleGroup: 'abdominal', percentageOfSession: 20, sets: 2, reps: [15, 20], rpe: 5, restSeconds: 45 },
            ],
          },
          {
            dayOfWeek: 3,
            durationMinutes: 50,
            muscleGroupTargets: [
              { muscleGroup: 'dorsal', percentageOfSession: 40, sets: 2, reps: [10, 12], rpe: 6, restSeconds: 90 },
              { muscleGroup: 'biceps', percentageOfSession: 20, sets: 2, reps: [12, 15], rpe: 6, restSeconds: 60 },
              { muscleGroup: 'trapezi', percentageOfSession: 20, sets: 2, reps: [12, 15], rpe: 6, restSeconds: 60 },
              { muscleGroup: 'abdominal', percentageOfSession: 20, sets: 2, reps: [15, 20], rpe: 5, restSeconds: 45 },
            ],
          },
          {
            dayOfWeek: 5,
            durationMinutes: 50,
            muscleGroupTargets: [
              { muscleGroup: 'quadriceps', percentageOfSession: 35, sets: 2, reps: [10, 12], rpe: 6, restSeconds: 90 },
              { muscleGroup: 'glutis', percentageOfSession: 30, sets: 2, reps: [12, 15], rpe: 6, restSeconds: 90 },
              { muscleGroup: 'isquiotibials', percentageOfSession: 20, sets: 2, reps: [12, 15], rpe: 6, restSeconds: 75 },
              { muscleGroup: 'abdominal', percentageOfSession: 15, sets: 2, reps: [15, 20], rpe: 5, restSeconds: 45 },
            ],
          },
        ],
      },
    ],
  },
}
