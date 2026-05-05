import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SessionExecution } from '@/components/session/SessionExecution'
import { useUserStore } from '@/stores/userStore'
import {
  buildSessionExecutionModel,
  type BuildSessionExecutionInput,
  type SessionExecutionModel,
} from '@/services/session/buildSessionExecutionModel'
import type { Exercise } from '@/types/exercise'
import type { GeneratedSession, SelectedExercise } from '@/services/exercises/sessionGenerator'
import '@/i18n'

/**
 * Step 16 Phase C — C10 cross-variant parity test.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Phase C Shared Contracts (Session Execution)" + C10 in `tasks/todo.md`.
 *
 * Renders `<SessionExecution />` against the SAME `SessionExecutionModel`
 * fixture twice — once per persisted aesthetic variant — and asserts:
 *   1. Both trees expose the same `[data-set-state]` ordering.
 *   2. Click on the active set in BOTH variants invokes `actions.logSet`.
 *   3. Switching the persisted variant flips the rendered subtree
 *      (`retro-set-*` vs `classic-set-*`) without mutating the underlying
 *      model object.
 *   4. `session.completion.retro.*` copy NEVER leaks into the classic tree.
 */

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

describe('SessionExecution — cross-variant parity', () => {
  beforeEach(() => {
    setMatchMedia(false)
    useUserStore.getState().reset()
  })
  afterEach(() => cleanup())

  it('renders identical [data-set-state] order, same active-set logSet outcome, and flips subtree per persisted variant without mutating the model', () => {
    const model = makeModel()
    const modelSnapshot = JSON.stringify(model)

    // ── retro-platformer ──────────────────────────────────────────────
    useUserStore.getState().setAestheticVariant('retro-platformer')
    const retroLogSet = vi.fn()
    const { unmount: unmountRetro } = render(
      <SessionExecution
        model={model}
        actions={{
          logSet: retroLogSet,
          skipSet: vi.fn(),
          skipRest: vi.fn(),
          updateCurrentExerciseWeight: vi.fn(),
        }}
      />
    )
    expect(JSON.stringify(model)).toBe(modelSnapshot)
    const retroSetButtons = screen.getAllByTestId(/^retro-set-/)
    const retroStates = retroSetButtons.map((el) => el.getAttribute('data-set-state'))
    const retroIds = retroSetButtons.map(
      (el) => (el.getAttribute('data-testid') ?? '').replace('retro-set-', '')
    )
    // Retro-only marker present; classic-only marker absent.
    expect(screen.queryAllByTestId(/^retro-platform-/).length).toBeGreaterThan(0)
    expect(screen.queryAllByTestId(/^classic-card-/)).toHaveLength(0)
    expect(screen.queryAllByTestId('classic-session-cards')).toHaveLength(0)
    // Click the active set → logSet fires.
    fireEvent.click(screen.getByTestId('retro-set-0-1'))
    expect(retroLogSet).toHaveBeenCalledTimes(1)
    unmountRetro()
    cleanup()

    // ── classic-boring ────────────────────────────────────────────────
    useUserStore.getState().setAestheticVariant('classic-boring')
    const classicLogSet = vi.fn()
    render(
      <SessionExecution
        model={model}
        actions={{
          logSet: classicLogSet,
          skipSet: vi.fn(),
          skipRest: vi.fn(),
          updateCurrentExerciseWeight: vi.fn(),
        }}
      />
    )
    expect(JSON.stringify(model)).toBe(modelSnapshot)
    const classicSetButtons = screen.getAllByTestId(/^classic-set-/)
    const classicStates = classicSetButtons.map((el) => el.getAttribute('data-set-state'))
    const classicIds = classicSetButtons.map(
      (el) => (el.getAttribute('data-testid') ?? '').replace('classic-set-', '')
    )
    expect(screen.queryAllByTestId(/^classic-card-/).length).toBeGreaterThan(0)
    expect(screen.queryAllByTestId(/^retro-set-/)).toHaveLength(0)
    expect(screen.queryAllByTestId('retro-level-run')).toHaveLength(0)
    fireEvent.click(screen.getByTestId('classic-set-0-1'))
    expect(classicLogSet).toHaveBeenCalledTimes(1)

    // ── parity assertions ─────────────────────────────────────────────
    expect(classicStates).toEqual(retroStates)
    expect(classicIds).toEqual(retroIds)
  })

  it('forbidden-pattern guard: session.completion.retro.* copy never appears in classic', () => {
    // Render classic in the in-progress state.
    useUserStore.getState().setAestheticVariant('classic-boring')
    const inProgress = makeModel()
    const { container: inProgressContainer, unmount } = render(
      <SessionExecution
        model={inProgress}
        actions={{
          logSet: vi.fn(),
          skipSet: vi.fn(),
          skipRest: vi.fn(),
          updateCurrentExerciseWeight: vi.fn(),
        }}
      />
    )
    expect(inProgressContainer.textContent ?? '').not.toMatch(/level clear/i)
    expect(inProgressContainer.textContent ?? '').not.toMatch(/nivell superat/i)
    expect(screen.queryAllByTestId('retro-level-clear')).toHaveLength(0)
    unmount()
    cleanup()

    // And in the finished state too.
    const finished = makeModel({ isFinished: true })
    const { container: finishedContainer } = render(
      <SessionExecution
        model={finished}
        actions={{
          logSet: vi.fn(),
          skipSet: vi.fn(),
          skipRest: vi.fn(),
          updateCurrentExerciseWeight: vi.fn(),
        }}
      />
    )
    expect(finishedContainer.textContent ?? '').not.toMatch(/level clear/i)
    expect(finishedContainer.textContent ?? '').not.toMatch(/nivell superat/i)
    expect(screen.queryAllByTestId('retro-level-clear')).toHaveLength(0)
    // Classic uses the calm completion copy instead.
    expect(screen.getByTestId('classic-completion-calm')).toBeTruthy()
  })
})
