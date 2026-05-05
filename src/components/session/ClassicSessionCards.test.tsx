import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ClassicSessionCards } from '@/components/session/ClassicSessionCards'
import { useUserStore } from '@/stores/userStore'
import {
  buildSessionExecutionModel,
  type BuildSessionExecutionInput,
  type SessionExecutionModel,
} from '@/services/session/buildSessionExecutionModel'
import type { Exercise } from '@/types/exercise'
import type { GeneratedSession, SelectedExercise } from '@/services/exercises/sessionGenerator'
import * as sessionAudio from '@/services/audio/sessionAudio'
import '@/i18n'

vi.mock('@/services/audio/sessionAudio', async () => {
  const actual = await vi.importActual<typeof import('@/services/audio/sessionAudio')>(
    '@/services/audio/sessionAudio'
  )
  return {
    ...actual,
    playSetCompleteBlip: vi.fn(),
    playRestEndChime: vi.fn(),
  }
})

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

describe('ClassicSessionCards — render', () => {
  beforeEach(() => {
    setMatchMedia(false)
    useUserStore.getState().reset()
    useUserStore.getState().setAestheticVariant('classic-boring')
    vi.mocked(sessionAudio.playSetCompleteBlip).mockClear()
    vi.mocked(sessionAudio.playRestEndChime).mockClear()
  })
  afterEach(() => cleanup())

  it('renders one button per non-collapsed set with aria-pressed and data-set-state', () => {
    const model = makeModel()
    render(
      <ClassicSessionCards
        model={model}
        actions={{
          logSet: vi.fn(),
          skipSet: vi.fn(),
          skipRest: vi.fn(),
          updateCurrentExerciseWeight: vi.fn(),
        }}
      />
    )
    const setButtons = screen.getAllByTestId(/^classic-set-/)
    // Active card (a, 3 sets) renders all 3; pending card (b, 2 sets) renders both.
    expect(setButtons).toHaveLength(5)
    for (const btn of setButtons) {
      expect(btn.tagName).toBe('BUTTON')
      expect(btn).toHaveAttribute('aria-pressed')
      expect(btn).toHaveAttribute('data-set-state')
      expect(btn).toHaveAttribute('aria-label')
    }
    const completed = screen.getByTestId('classic-set-0-0')
    expect(completed.getAttribute('data-set-state')).toBe('completed')
    expect(completed.getAttribute('aria-pressed')).toBe('true')
  })

  it('clicking the active set invokes actions.logSet', () => {
    const logSet = vi.fn()
    const model = makeModel()
    render(
      <ClassicSessionCards
        model={model}
        actions={{
          logSet,
          skipSet: vi.fn(),
          skipRest: vi.fn(),
          updateCurrentExerciseWeight: vi.fn(),
        }}
      />
    )
    fireEvent.click(screen.getByTestId('classic-set-0-1'))
    expect(logSet).toHaveBeenCalledTimes(1)
  })

  it('SetLogger complete invokes logSet; skip invokes skipSet; rest skip invokes skipRest', () => {
    const logSet = vi.fn()
    const skipSet = vi.fn()
    const skipRest = vi.fn()
    const model = makeModel()
    const { rerender } = render(
      <ClassicSessionCards
        model={model}
        actions={{ logSet, skipSet, skipRest, updateCurrentExerciseWeight: vi.fn() }}
      />
    )
    fireEvent.click(screen.getByText(/complete set/i))
    expect(logSet).toHaveBeenCalled()
    fireEvent.click(screen.getByText(/skip set/i))
    expect(skipSet).toHaveBeenCalledTimes(1)

    const restingModel = makeModel({ isResting: true, restSecondsRemaining: 30 })
    rerender(
      <ClassicSessionCards
        model={restingModel}
        actions={{ logSet, skipSet, skipRest, updateCurrentExerciseWeight: vi.fn() }}
      />
    )
    fireEvent.click(screen.getByText(/skip rest/i))
    expect(skipRest).toHaveBeenCalledTimes(1)
  })

  it('never mounts an <audio> element and never references retro completion copy', () => {
    const model = makeModel({ isFinished: true })
    const { container } = render(
      <ClassicSessionCards
        model={model}
        actions={{
          logSet: vi.fn(),
          skipSet: vi.fn(),
          skipRest: vi.fn(),
          updateCurrentExerciseWeight: vi.fn(),
        }}
      />
    )
    expect(container.querySelector('audio')).toBeNull()
    // Calm completion copy is rendered; retro "level clear" copy never is.
    expect(screen.getByTestId('classic-completion-calm')).toBeTruthy()
    expect(container.textContent ?? '').not.toMatch(/level clear/i)
    // No retro-only test ids leak in.
    expect(screen.queryAllByTestId(/^retro-/)).toHaveLength(0)
  })

  it('never invokes playSetCompleteBlip across a full set/rest cycle', () => {
    const logSet = vi.fn()
    const skipRest = vi.fn()
    const model = makeModel()
    const { rerender } = render(
      <ClassicSessionCards
        model={model}
        actions={{ logSet, skipSet: vi.fn(), skipRest, updateCurrentExerciseWeight: vi.fn() }}
      />
    )
    // Click the active per-card set button.
    fireEvent.click(screen.getByTestId('classic-set-0-1'))
    // Click the SetLogger "Complete set" button.
    fireEvent.click(screen.getByText(/complete set/i))
    // Transition into rest and back out.
    const restingModel = makeModel({ isResting: true, restSecondsRemaining: 30 })
    rerender(
      <ClassicSessionCards
        model={restingModel}
        actions={{ logSet, skipSet: vi.fn(), skipRest, updateCurrentExerciseWeight: vi.fn() }}
      />
    )
    fireEvent.click(screen.getByText(/skip rest/i))
    // C9 invariant: classic renderer must NEVER invoke the audio service.
    expect(sessionAudio.playSetCompleteBlip).toHaveBeenCalledTimes(0)
  })
})
