import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActiveExercise } from '@/components/session/ActiveExercise'
import { RestTimer } from '@/components/session/RestTimer'
import { SessionHudReadouts } from '@/components/session/SessionHudReadouts'
import { SetLogger } from '@/components/session/SetLogger'
import {
  SET_STATE_VAR,
  useSetAriaLabel,
  useSetStateLabel,
} from '@/components/session/sessionExecutionShared'
import { playSetCompleteBlip } from '@/services/audio/sessionAudio'
import type {
  ExerciseBlock,
  SessionExecutionModel,
  SetExecutionState,
  SetNode,
} from '@/services/session/buildSessionExecutionModel'

export type SessionExecutionActions = {
  logSet: (repsActual: number, weightActual?: number, isWarmup?: boolean) => void
  skipSet: () => void
  skipRest: () => void
  updateCurrentExerciseWeight: (newWeight: number) => void
}

type Props = {
  model: SessionExecutionModel
  actions: SessionExecutionActions
}

const STATE_TILE_CLASS: Record<SetExecutionState, string> = {
  pending: 'opacity-60',
  active: 'ring-2 ring-gray-900 scale-110',
  completed: '',
  skipped: 'opacity-50',
}

/**
 * Step 16 Phase C — `retro-platformer` session execution renderer.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Variant: Retro Platformer → Session Execution Surface" and
 * "Phase C Shared Contracts (Session Execution)".
 *
 * - Renders the model as a horizontal level strip with one platform per
 *   exercise and one coin per set; the active card composes the existing
 *   `SetLogger` and `RestTimer` primitives (no behavior duplication).
 * - Reads exclusively `--theme-session-*` and `--theme-game-session-*` tokens.
 * - Set surfaces are real `<button>` elements with `aria-pressed` per the
 *   shared accessibility contract.
 * - No countdown urgency colors on the rest timer (RestTimer has none) and
 *   no "level clear" effects mid-session — completion-frame copy lives in
 *   `session.completion.retro.*` and is rendered by the page-level summary,
 *   not by this row.
 */
export const RetroLevelRun = ({ model, actions }: Props) => {
  const { t } = useTranslation('common')
  const ariaName = useSetAriaLabel()
  const stateLabel = useSetStateLabel()

  const onActiveSetClick = useCallback(
    (block: ExerciseBlock) => {
      const plannedReps = Array.isArray(block.reps) ? block.reps[1] : block.reps
      playSetCompleteBlip()
      actions.logSet(plannedReps, block.weightKg)
    },
    [actions]
  )

  const activeBlock = model.exerciseBlocks[model.currentExerciseIndex] ?? null

  return (
    <div className="space-y-3" data-testid="retro-level-run">
      <SessionHudReadouts model={model} variant="retro" />

      <div
        className="overflow-x-auto rounded-md border-2 border-gray-900/10 p-2"
        data-testid="retro-level-strip"
      >
        <div className="flex items-end gap-3">
          {model.exerciseBlocks.map((block) => (
            <RetroPlatform
              key={`${block.exerciseIndex}-${block.exercise.id}`}
              block={block}
              ariaName={ariaName}
              stateLabel={stateLabel}
              onActiveSetClick={() => onActiveSetClick(block)}
            />
          ))}
        </div>
      </div>

      {activeBlock && !model.isFinished && (
        <>
          <ActiveExercise
            selectedExercise={{
              exercise: activeBlock.exercise,
              sets: activeBlock.sets.length,
              reps: activeBlock.reps,
              weightKg: activeBlock.weightKg,
              restSeconds: activeBlock.restSeconds,
            }}
            exerciseIndex={activeBlock.exerciseIndex}
            totalExercises={model.exerciseBlocks.length}
            currentSet={model.currentSetIndex}
            onWeightChange={actions.updateCurrentExerciseWeight}
          />

          {model.rest.isResting ? (
            <RestTimer onSkip={actions.skipRest} />
          ) : (
            <SetLogger
              selectedExercise={{
                exercise: activeBlock.exercise,
                sets: activeBlock.sets.length,
                reps: activeBlock.reps,
                weightKg: activeBlock.weightKg,
                restSeconds: activeBlock.restSeconds,
              }}
              currentSet={model.currentSetIndex}
              onComplete={(reps, weight, isWarmup) => {
                playSetCompleteBlip()
                actions.logSet(reps, weight, isWarmup)
              }}
              onSkipSet={actions.skipSet}
            />
          )}
        </>
      )}

      {model.isFinished && (
        <p
          className="rounded-md border-2 border-gray-900/10 p-3 text-center font-mono text-sm font-bold"
          data-testid="retro-level-clear"
          style={{
            backgroundColor: 'var(--theme-game-session-checkpoint)',
            color: 'var(--theme-session-hud-fg)',
          }}
        >
          {t('session.completion.retro.level_clear')}
        </p>
      )}
    </div>
  )
}

type PlatformProps = {
  block: ExerciseBlock
  ariaName: ReturnType<typeof useSetAriaLabel>
  stateLabel: ReturnType<typeof useSetStateLabel>
  onActiveSetClick: () => void
}

const RetroPlatform = ({ block, ariaName, stateLabel, onActiveSetClick }: PlatformProps) => {
  return (
    <div
      className="flex flex-col items-center gap-1"
      data-testid={`retro-platform-${block.exerciseIndex}`}
      style={{ backgroundColor: 'transparent' }}
    >
      <div className="flex items-center gap-1.5">
        {block.sets.map((node) => (
          <RetroCoin
            key={node.setIndex}
            block={block}
            node={node}
            ariaName={ariaName}
            stateLabel={stateLabel}
            onActiveSetClick={onActiveSetClick}
          />
        ))}
      </div>
      <div
        className="h-2 w-full rounded-sm"
        aria-hidden="true"
        style={{ backgroundColor: 'var(--theme-game-session-platform)' }}
      />
    </div>
  )
}

type CoinProps = {
  block: ExerciseBlock
  node: SetNode
  ariaName: ReturnType<typeof useSetAriaLabel>
  stateLabel: ReturnType<typeof useSetStateLabel>
  onActiveSetClick: () => void
}

const RetroCoin = ({ block, node, ariaName, stateLabel, onActiveSetClick }: CoinProps) => {
  const isActive = node.state === 'active'
  const label = ariaName(block.exerciseIndex + 1, node.setNumber, block.sets.length, node.state)
  return (
    <button
      type="button"
      role="button"
      aria-pressed={node.state === 'completed'}
      aria-label={label}
      title={stateLabel(node.state)}
      data-set-state={node.state}
      data-testid={`retro-set-${block.exerciseIndex}-${node.setIndex}`}
      onClick={isActive ? onActiveSetClick : undefined}
      disabled={!isActive}
      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-900 font-mono text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 ${
        STATE_TILE_CLASS[node.state]
      }`}
      style={{
        backgroundColor: SET_STATE_VAR[node.state],
        color: '#0f172a',
        cursor: isActive ? 'pointer' : 'default',
      }}
    >
      {node.setNumber}
    </button>
  )
}
