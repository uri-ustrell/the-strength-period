import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RetroLevelRun } from '@/components/session/RetroLevelRun'
import type { GeneratedSession, SelectedExercise } from '@/services/exercises/sessionGenerator'
import {
  type BuildSessionExecutionInput,
  buildSessionExecutionModel,
  type SessionExecutionModel,
} from '@/services/session/buildSessionExecutionModel'
import { useUserStore } from '@/stores/userStore'
import type { Exercise } from '@/types/exercise'
import '@/i18n'

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

function makeExercise(id: string): Exercise {
  return {
    id,
    nameKey: `exercises:${id}`,
    primaryMuscles: ['pectoral'],
    secondaryMuscles: [],
    equipment: [],
    level: 'beginner',
    category: 'strength',
    estimatedSeriesDurationSeconds: 30,
    progressionMetric: 'reps',
    tags: [],
    restrictions: [],
    instructions: [],
    images: [],
  }
}

function makeSelected(id: string, sets: number): SelectedExercise {
  return {
    exercise: makeExercise(id),
    sets,
    reps: [8, 12],
    weightKg: 40,
    restSeconds: 60,
  }
}

function makeGeneratedSession(...selected: SelectedExercise[]): GeneratedSession {
  return {
    templateId: 'tmpl-1',
    mesocycleId: 'm-1',
    exercises: selected,
    estimatedDurationMinutes: 30,
  }
}

const NOW_MS = 1_700_000_000_000

function makeModel(input: Partial<BuildSessionExecutionInput> = {}): SessionExecutionModel {
  return buildSessionExecutionModel({
    generatedSession: makeGeneratedSession(makeSelected('a', 3), makeSelected('b', 2)),
    executedSets: [
      {
        id: 'set-a-1',
        sessionId: '',
        sessionTemplateId: 'tmpl-1',
        date: '2026-05-04',
        exerciseId: 'a',
        setNumber: 1,
        repsActual: 10,
        weightKgActual: 40,
        repsPlanned: 10,
        weightKgPlanned: 40,
        completedAt: new Date(NOW_MS - 30_000).toISOString(),
      },
    ],
    executionMode: 'standard',
    currentExerciseIndex: 0,
    currentSetIndex: 1,
    currentRound: 0,
    totalRounds: 1,
    isResting: false,
    restSecondsRemaining: 0,
    sessionStartedAt: new Date(NOW_MS - 60_000).toISOString(),
    isFinished: false,
    nowMs: NOW_MS,
    ...input,
  })
}

describe('RetroLevelRun — render', () => {
  beforeEach(() => {
    setMatchMedia(false)
    useUserStore.getState().reset()
    useUserStore.getState().setAestheticVariant('retro-platformer')
  })
  afterEach(() => cleanup())

  it('renders one button per set with aria-pressed and data-set-state', () => {
    const model = makeModel()
    render(
      <RetroLevelRun
        model={model}
        actions={{
          logSet: vi.fn(),
          skipSet: vi.fn(),
          skipRest: vi.fn(),
          updateCurrentExerciseWeight: vi.fn(),
        }}
      />
    )
    // 3 + 2 sets total
    const setButtons = screen.getAllByTestId(/^retro-set-/)
    expect(setButtons).toHaveLength(5)
    for (const btn of setButtons) {
      expect(btn.tagName).toBe('BUTTON')
      expect(btn).toHaveAttribute('aria-pressed')
      expect(btn).toHaveAttribute('data-set-state')
      expect(btn).toHaveAttribute('aria-label')
    }
    // First (completed) set has aria-pressed=true.
    const completed = screen.getByTestId('retro-set-0-0')
    expect(completed).toHaveAttribute('data-set-state', 'completed')
    expect(completed.getAttribute('aria-pressed')).toBe('true')
    // Active set is the cursor (exercise 0, set 1).
    const active = screen.getByTestId('retro-set-0-1')
    expect(active.getAttribute('data-set-state')).toBe('active')
  })

  it('clicking the active set invokes actions.logSet', () => {
    const logSet = vi.fn()
    const model = makeModel()
    render(
      <RetroLevelRun
        model={model}
        actions={{
          logSet,
          skipSet: vi.fn(),
          skipRest: vi.fn(),
          updateCurrentExerciseWeight: vi.fn(),
        }}
      />
    )
    fireEvent.click(screen.getByTestId('retro-set-0-1'))
    expect(logSet).toHaveBeenCalledTimes(1)
  })

  it('clicking the SetLogger complete button invokes logSet; skip invokes skipSet', () => {
    const logSet = vi.fn()
    const skipSet = vi.fn()
    const model = makeModel()
    render(
      <RetroLevelRun
        model={model}
        actions={{
          logSet,
          skipSet,
          skipRest: vi.fn(),
          updateCurrentExerciseWeight: vi.fn(),
        }}
      />
    )
    // SetLogger renders the canonical "Complete set" + "Skip set" buttons.
    const completeBtn = screen.getByText(/complete set/i)
    fireEvent.click(completeBtn)
    expect(logSet).toHaveBeenCalled()

    const skipBtn = screen.getByText(/skip set/i)
    fireEvent.click(skipBtn)
    expect(skipSet).toHaveBeenCalledTimes(1)
  })

  it('rest timer skip button invokes actions.skipRest', () => {
    const skipRest = vi.fn()
    const model = makeModel({ isResting: true, restSecondsRemaining: 30 })
    render(
      <RetroLevelRun
        model={model}
        actions={{
          logSet: vi.fn(),
          skipSet: vi.fn(),
          skipRest,
          updateCurrentExerciseWeight: vi.fn(),
        }}
      />
    )
    fireEvent.click(screen.getByText(/skip rest/i))
    expect(skipRest).toHaveBeenCalledTimes(1)
  })
})
