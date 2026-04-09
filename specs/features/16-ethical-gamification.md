# Feature 16 - Ethical Gamification

## Description

Define and implement a motivation layer that improves training adherence while protecting user well-being.

This feature must reward sustainable habits (consistency, recovery, technique, and safety) and must explicitly reject manipulative engagement patterns.

This document is the implementation source of truth for Step 16.

## Dependencies

- Step 8 ✅ (Execution mode and real session flow)
- Step 9 ✅ (Dashboard and stats surfaces)
- Step 14 ✅ (Deterministic planning baseline)

## Source Of Truth Rule

- Any Step 16 implementation work must start by reading this file end-to-end.
- If any ticket, TODO, or discussion conflicts with this file, this file wins.
- Scope changes must be recorded here first, then reflected in `specs/STATUS.md` and `specs/STATUS_HISTORY.md`.

## Product Intent

Ethical gamification is not about maximizing app time.

It is about helping users:
- show up consistently,
- train safely,
- recover on purpose,
- build long-term confidence,
- avoid guilt spirals after missed sessions.

## Non-Negotiable Guardrails

All mechanics must pass every guardrail below.

1. Health over engagement
- Never optimize for session count at the cost of recovery, deload, or pain signals.

2. No punishment loops
- Missing a day cannot wipe meaningful progress.
- Progress framing must be recovery-friendly and restart-friendly.

3. No artificial urgency
- No countdown pressure, fear copy, or expiring rewards that push unsafe behavior.

4. No exploitative monetization
- No pay-to-progress, pay-to-recover, or paid streak protection.
- Optional support must be clearly non-competitive and non-blocking.

5. Transparency first
- Users can see why a milestone was granted.
- Rules are deterministic, explainable, and auditable.

6. Autonomy and control
- Users can mute celebration intensity, notifications, and public-facing badges.

7. Accessibility and inclusion
- Mechanics must work with rehab contexts, irregular schedules, and beginner pacing.

8. Balanced copy
- Language must avoid shame, guilt, or fear of failure.

9. Protect cognitive load
- No noisy reward spam after every micro-action.

10. Data minimization
- Track only events required for milestones, audits, and user-facing insight.

## Forbidden Patterns (Must Not Ship)

- Variable-ratio reward loops designed to create compulsive checking.
- Streak freezes, paid streak protection, or any premium feature tied to avoiding loss.
- "You are falling behind" fear messaging.
- "Last chance" pressure banners for non-essential actions.
- Competitive leaderboards that pressure overtraining.
- Dark patterns in supporter or tip flows.
- Hidden formulas for points, levels, or eligibility.
- Frequent push prompts that ignore user rest days.
- Progress reset mechanics that remove long-term earned milestones.

## Duolingo References: Use Intentionally, Not Literally

Duolingo is used as a known reference for motivation mechanics. We only adopt patterns that remain ethical in a strength-training context.

### Positive Patterns We Can Reuse

- Clear next action with minimal friction.
- Friendly completion feedback after meaningful actions.
- Simple visual progress landmarks.
- Lightweight consistency framing that encourages return after missed days.

### Patterns We Explicitly Reject

- Anxiety-heavy streak-loss framing.
- Intrusive urgency notifications.
- Loss-aversion mechanics that convert guilt into retention.
- Gamified pressure that rewards volume over recovery quality.

### Brand And IP Boundary

- Do not copy Duolingo-specific wording, icons, visual identity, or interaction choreography.
- Keep references conceptual only.

## Pre-Execution Phases

No implementation starts until all pre-execution phases are complete.

### Phase 0 - Source-Of-Truth Read And Dependency Check

Deliverables:
- Confirm dependencies from `specs/STATUS.md` are complete.
- Confirm this file has been read and accepted as the Step 16 source of truth.
- Confirm no open contradiction in `tasks/todo.md`.

### Phase 1 - Behavioral Risk Brief

Deliverables:
- List proposed mechanics and expected user behavior impact.
- Identify risk level per mechanic (low/medium/high).
- Define mitigation for every medium/high risk mechanic.

### Phase 2 - UI/UX Integrity Gate

Deliverables:
- Evaluate whether current IA, component structure, and interaction patterns can satisfy all guardrails.
- If not, trigger full UI/UX refactor policy before feature implementation.

### Phase 3 - Mechanic Design And Event Model

Deliverables:
- Final milestone taxonomy.
- Event instrumentation map.
- Copy tone check against guardrails.
- Opt-out and notification control surfaces.

### Phase 4 - Implementation Plan Gate

Deliverables:
- Ordered implementation plan with acceptance criteria and tests.
- Explicit decision log for any trade-off.

## Full UI/UX Refactor Policy (Explicit)

A full UI/UX refactor is allowed and recommended when incremental edits cannot meet guardrails without fragile compromises.

### Refactor Trigger Conditions

Trigger full refactor if one or more are true:
- Existing flow requires manipulative copy to maintain engagement.
- Current layout cannot surface safety/recovery context clearly.
- Existing component constraints force hidden or confusing progression logic.
- Accessibility issues would remain after incremental patching.

### Policy Requirements

- Refactor first, then implement gamification mechanics.
- Preserve domain correctness (planning/session logic) while redesigning presentation and flow.
- Re-run Step 16 guardrail checklist after refactor before shipping mechanics.

### Decision Logging

- Record gate result in `specs/STATUS_HISTORY.md`.
- Mirror execution state in `specs/STATUS.md` and `tasks/todo.md`.

## Ethical Achievement Framework

### Milestone Families

1. Consistency milestones
- Reward attendance patterns over time windows, not absolute streak purity.

2. Recovery and deload milestones
- Reward adherence to planned deload and rest behavior.

3. Warm-up and preparation milestones
- Reward completion of preparation steps before work sets.

4. Injury-safe progression milestones
- Reward safe load progression and controlled RPE behavior.

5. Reflection milestones
- Reward session notes, pain flag honesty, and thoughtful adjustment behavior.

### Progression Principles

- Milestones should be cumulative and mostly non-revocable.
- Missing one day should not erase prior achievement history.
- Recovery and safety milestones must be as visible as intensity milestones.

## Patronage Model Constraints

- Supporter badges and tips are optional and clearly separated from training progress.
- No exclusive training power from payment.
- No repeated pressure prompts after a declined contribution.

## Metrics And Monitoring

Metrics are split into positive outcomes and anti-addiction safety checks.

### Positive Outcome Metrics

- Weekly adherence rate (sessions completed vs planned).
- Deload compliance rate.
- Warm-up completion rate.
- Injury-safe progression consistency (no abrupt unsafe load jumps).
- Return-after-miss rate (user resumes within 7 days after a missed session).

### Safety Metrics (Must Stay Within Threshold)

- Guilt copy incidents: 0.
- Paid pressure prompts shown after explicit decline: 0.
- Streak-loss hard resets: 0.
- Consecutive day push prompts on planned rest days: 0.

### Validation Metrics For QA

- Each mechanic maps to at least one guardrail and one measurable outcome.
- All milestone rules are explainable in plain language.
- Supporter UI has no effect on algorithmic plan or milestone eligibility.

## Acceptance Criteria

- [ ] Guardrails and forbidden patterns are implemented as explicit review criteria.
- [ ] Step 16 mechanics only reward sustainable behaviors.
- [ ] Streak recovery policy avoids punitive loss framing.
- [ ] Optional patronage flow is non-pressuring and non-blocking.
- [ ] UI copy avoids guilt and fear framing.
- [ ] Full UI/UX refactor gate is executed and documented before implementation.
- [ ] Metrics instrumentation exists for outcomes and safety checks.
- [ ] QA checklist is completed before merge.
- [ ] `npm run build` passes.

## Step 16 Implementation Checklist

### Planning Checklist

- [ ] Read this file as source of truth.
- [ ] Verify Step 8, Step 9, and Step 14 are complete.
- [ ] Complete behavioral risk brief.
- [ ] Complete UI/UX integrity gate.
- [ ] Decide and record whether full refactor is required.

### Design Checklist

- [ ] Define milestone taxonomy with deterministic rules.
- [ ] Write neutral, supportive copy for all reward states.
- [ ] Define user controls for notification and celebration intensity.
- [ ] Document patronage flow with non-pressure constraints.

### Engineering Checklist

- [ ] Implement milestone computation with traceable logic.
- [ ] Implement safeguards for missed-session recovery.
- [ ] Instrument required telemetry events.
- [ ] Add tests for forbidden-pattern regressions.
- [ ] Add accessibility checks for all new UI surfaces.

### Release Checklist

- [ ] Run guardrail review and sign-off.
- [ ] Run product copy review against forbidden language patterns.
- [ ] Run `npm run build` with zero errors.
- [ ] Update `specs/STATUS.md` and `specs/STATUS_HISTORY.md`.
- [ ] Update `tasks/todo.md` with completion and verification notes.

## Out Of Scope For Step 16

- Competitive social ranking systems.
- Paid feature gating for core training capabilities.
- Third-party ad network engagement loops.
- Any mechanic that incentivizes unsafe training frequency.
