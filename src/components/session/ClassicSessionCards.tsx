import { Check, Circle, Minus, Play } from 'lucide-react'
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
import type {
  ExerciseBlock,
  SessionExecutionModel,
  SetExecutionState,
  SetNode,
} from '@/services/session/buildSessionExecutionModel'

export type SessionExecutionActions = {
  logSet: (repsActual: number, weightActual?: number) => void
  skipSet: () => void
  skipRest: () => void
  updateCurrentExerciseWeight: (newWeight: number) => void
}

type Props = {
  model: SessionExecutionModel
  actions: SessionExecutionActions
}

const STATE_ICON: Record<SetExecutionState, typeof Circle> = {
  pending: Circle,
  active: Play,
  completed: Check,
  skipped: Minus,
}

const STATE_ROW_CLASS: Record<SetExecutionState, string> = {
  pending: 'opacity-70',
  active: 'ring-2',
  completed: '',
  skipped: 'opacity-60',
}

/**
 * Step 16 Phase C — `classic-boring` session execution renderer.
 *
 * Spec: `specs/features/16-ethical-gamification.md` →
 * "Variant: Classic Boring → Session Execution Surface" and
 * "Phase C Shared Contracts (Session Execution)".
 *
 * - Renders the model as a vertical card list (one card per exercise) with
 *   a sticky top HUD. The active card composes the existing `SetLogger` and
 *   `RestTimer` primitives — no behavior duplication, identical semantics
 *   to {@link RetroLevelRun}.
 * - Reads exclusively `--theme-session-*` tokens. NEVER reads any
 *   `--theme-game-session-*` token (verified by C11 grep guard).
 * - NEVER references `session.completion.retro.*` keys (Completion-Frame
 *   Contract); a calm acknowledgement using `session.completion.calm.*`
 *   is rendered when the model is finished.
 * - Set surfaces are real `<button>` elements with `aria-pressed` per the
 *   shared accessibility contract.
 * - No countdown urgency colors on the rest timer. No shame copy on
 *   skipped sets. No `<audio>` mounts (audio service short-circuits when
 *   variant !== retro-platformer; this renderer also never invokes it).
 */
export const ClassicSessionCards = ({ model, actions }: Props) => {
  const { t } = useTranslation('common')
  const ariaName = useSetAriaLabel()
  const stateLabel = useSetStateLabel()

  const onActiveSetClick = useCallback(
    (block: ExerciseBlock) => {
      const plannedReps = Array.isArray(block.reps) ? block.reps[1] : block.reps
      // Audio is a retro-only affordance; the parity contract is on model
      // + actions, not cosmetic-call mirroring. `classic-boring` is silent
      // by construction — `playSetCompleteBlip` is never invoked here.
      actions.logSet(plannedReps, block.weightKg)
    },
    [actions]
  )

  const activeBlock = model.exerciseBlocks[model.currentExerciseIndex] ?? null

  return (
    <div className="space-y-3" data-testid="classic-session-cards">
      <SessionHudReadouts model={model} variant="classic" />

      <div className="space-y-2" data-testid="classic-cards-list">
        {model.exerciseBlocks.map((block) => (
          <ClassicCard
            key={`${block.exerciseIndex}-${block.exercise.id}`}
            block={block}
            isActive={block.exerciseIndex === model.currentExerciseIndex && !model.isFinished}
            ariaName={ariaName}
            stateLabel={stateLabel}
            onActiveSetClick={() => onActiveSetClick(block)}
          />
        ))}
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
              onComplete={(reps, weight) => {
                actions.logSet(reps, weight)
              }}
              onSkipSet={actions.skipSet}
            />
          )}
        </>
      )}

      {model.isFinished && (
        <div
          className="rounded-lg border border-gray-200 bg-white p-3 text-center"
          data-testid="classic-completion-calm"
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--theme-session-hud-fg)' }}>
            {t('session.completion.calm.headline')}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--theme-session-hud-muted)' }}>
            {t('session.completion.calm.body')}
          </p>
        </div>
      )}
    </div>
  )
}

type CardProps = {
  block: ExerciseBlock
  isActive: boolean
  ariaName: ReturnType<typeof useSetAriaLabel>
  stateLabel: ReturnType<typeof useSetStateLabel>
  onActiveSetClick: () => void
}

const ClassicCard = ({ block, isActive, ariaName, stateLabel, onActiveSetClick }: CardProps) => {
  const { t } = useTranslation('common')
  const exerciseName = t(block.exercise.nameKey, { defaultValue: block.exercise.id })
  const allCompleted = block.sets.every((n) => n.state === 'completed')
  // Completed cards collapse to a one-line summary (per spec). Active and
  // pending cards keep the full per-set list visible.
  if (allCompleted && !isActive) {
    return (
      <div
        className="rounded-lg border border-gray-200 bg-white p-2 opacity-70"
        data-testid={`classic-card-${block.exerciseIndex}`}
        data-collapsed="true"
      >
        <div className="flex items-center justify-between">
          <span className="truncate text-xs font-medium text-gray-700">{exerciseName}</span>
          <Check
            size={14}
            strokeWidth={2.5}
            aria-hidden="true"
            style={{ color: 'var(--theme-session-set-completed)' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-2 ${
        isActive ? 'border-gray-300' : ''
      }`}
      data-testid={`classic-card-${block.exerciseIndex}`}
      data-collapsed="false"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="truncate text-xs font-semibold text-gray-700">{exerciseName}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="list">
        {block.sets.map((node) => (
          <ClassicSetRow
            key={node.setIndex}
            block={block}
            node={node}
            ariaName={ariaName}
            stateLabel={stateLabel}
            onActiveSetClick={onActiveSetClick}
          />
        ))}
      </div>
    </div>
  )
}

type RowProps = {
  block: ExerciseBlock
  node: SetNode
  ariaName: ReturnType<typeof useSetAriaLabel>
  stateLabel: ReturnType<typeof useSetStateLabel>
  onActiveSetClick: () => void
}

const ClassicSetRow = ({ block, node, ariaName, stateLabel, onActiveSetClick }: RowProps) => {
  const isActive = node.state === 'active'
  const Icon = STATE_ICON[node.state]
  const label = ariaName(block.exerciseIndex + 1, node.setNumber, block.sets.length, node.state)
  const style: React.CSSProperties = {
    backgroundColor: SET_STATE_VAR[node.state],
    color: 'var(--theme-session-hud-fg)',
  }
  if (isActive) {
    ;(style as React.CSSProperties & Record<string, string>)['--tw-ring-color'] =
      'var(--theme-session-set-active)'
  }
  return (
    <button
      type="button"
      role="button"
      aria-pressed={node.state === 'completed'}
      aria-label={label}
      title={stateLabel(node.state)}
      data-set-state={node.state}
      data-testid={`classic-set-${block.exerciseIndex}-${node.setIndex}`}
      onClick={isActive ? onActiveSetClick : undefined}
      disabled={!isActive}
      className={`flex h-8 min-w-[2rem] items-center justify-center gap-1 rounded-md border border-gray-300 px-2 font-mono text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        STATE_ROW_CLASS[node.state]
      }`}
      style={style}
    >
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      <span>{node.setNumber}</span>
    </button>
  )
}
