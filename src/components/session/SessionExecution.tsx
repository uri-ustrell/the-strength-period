import { Check, Circle, Minus, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ActiveExercise } from '@/components/session/ActiveExercise'
import { RestTimer } from '@/components/session/RestTimer'
import { SessionHudReadouts } from '@/components/session/SessionHudReadouts'
import { SetLogger } from '@/components/session/SetLogger'
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

export type SessionExecutionProps = {
  model: SessionExecutionModel
  actions: SessionExecutionActions
}

const STATE_ICON: Record<SetExecutionState, typeof Circle> = {
  pending: Circle,
  active: Play,
  completed: Check,
  skipped: Minus,
}

const STATE_CLASS: Record<SetExecutionState, string> = {
  pending: 'border-border-subtle bg-surface text-text-muted',
  active: 'border-accent bg-surface text-text-primary',
  completed: 'border-success/40 bg-success/10 text-success',
  skipped: 'border-border-subtle bg-transparent text-text-muted/70',
}

/**
 * Feature 17 — Session execution surface.
 *
 * Single-renderer replacement for the Step 16 dual-skin SessionExecution
 * (`classic-boring` + `retro-platformer`). Renders the model as a stacked
 * card list of exercises, each with one set row per `SetNode`. The active
 * card composes `SetLogger` + `RestTimer` exactly as before.
 *
 * Hard rule: the set rows are decorative — they NEVER call `actions.logSet`
 * directly. Logging is exclusively wired through `SetLogger`'s `onComplete`.
 */
export const SessionExecution = ({ model, actions }: SessionExecutionProps) => {
  const { t } = useTranslation('common')
  const activeBlock = model.exerciseBlocks[model.currentExerciseIndex] ?? null

  return (
    <div className="space-y-3" data-testid="session-execution">
      <SessionHudReadouts model={model} variant="classic" />

      <div className="space-y-2" data-testid="session-cards-list">
        {model.exerciseBlocks.map((block) => (
          <SessionCard
            key={`${block.exerciseIndex}-${block.exercise.id}`}
            block={block}
            isActive={block.exerciseIndex === model.currentExerciseIndex && !model.isFinished}
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
              onComplete={(reps, weight, isWarmup) => actions.logSet(reps, weight, isWarmup)}
              onSkipSet={actions.skipSet}
            />
          )}
        </>
      )}

      {model.isFinished && (
        <div
          className="rounded-2xl border border-border-subtle bg-surface p-4 text-center"
          data-testid="session-completion"
        >
          <p className="font-display text-base font-semibold text-text-primary">
            {t('session.completion.headline', { defaultValue: 'Sessió completada' })}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {t('session.completion.body', {
              defaultValue: 'Bona feina. Guarda quan vulguis.',
            })}
          </p>
        </div>
      )}
    </div>
  )
}

type CardProps = { block: ExerciseBlock; isActive: boolean }

const SessionCard = ({ block, isActive }: CardProps) => {
  const { t } = useTranslation('common')
  const exerciseName = t(block.exercise.nameKey, { defaultValue: block.exercise.id })
  const allCompleted = block.sets.every((n) => n.state === 'completed')

  if (allCompleted && !isActive) {
    return (
      <div
        className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface px-3 py-2 opacity-70"
        data-testid={`session-card-${block.exerciseIndex}`}
        data-collapsed="true"
      >
        <span className="truncate text-xs font-medium text-text-muted">{exerciseName}</span>
        <Check size={14} strokeWidth={2.5} className="text-success" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl border bg-surface px-3 py-2 ${
        isActive ? 'border-accent shadow-card' : 'border-border-subtle'
      }`}
      data-testid={`session-card-${block.exerciseIndex}`}
      data-collapsed="false"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="truncate text-xs font-semibold text-text-primary">{exerciseName}</span>
      </div>
      <ul className="flex flex-wrap items-center gap-1.5">
        {block.sets.map((node) => (
          <SetRow key={node.setIndex} block={block} node={node} />
        ))}
      </ul>
    </div>
  )
}

type RowProps = { block: ExerciseBlock; node: SetNode }

const SetRow = ({ block, node }: RowProps) => {
  const Icon = STATE_ICON[node.state]
  return (
    <li
      data-set-state={node.state}
      data-testid={`session-set-${block.exerciseIndex}-${node.setIndex}`}
      aria-label={`Set ${node.setNumber} of ${block.sets.length} — ${node.state}`}
      className={`flex h-8 min-w-[2rem] items-center justify-center gap-1 rounded-full border px-2 font-mono text-xs font-semibold ${STATE_CLASS[node.state]}`}
    >
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      <span className="tabular">{node.setNumber}</span>
    </li>
  )
}
