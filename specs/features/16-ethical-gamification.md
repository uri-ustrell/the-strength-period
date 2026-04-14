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

## Long Journey And Totem System

### Design Philosophy

Training is a long, non-linear journey that unfolds over months and years. The system represents this metaphorically through permanent totemic markers placed along the path — not points, not streaks, not levels that expire.

Totems are earned once and kept forever. They cannot be lost, revoked, or reset. They accumulate silently and are discovered naturally as the user progresses. The journey has no finish line: new totems become reachable as the user's history deepens.

Rest and recovery are first-class segments of the journey, not gaps or silences. A totem for honoring a deload week is as prominent as a totem for a training milestone.

### Totem Visual Language

- Each totem is a distinct sculptural marker on the user's path: a carved stone, a standing figure, a stacked landmark — culturally neutral, non-gendered, and non-hierarchical in visual weight.
- Totems belonging to the same milestone family share a visual motif (e.g., carved lines for consistency, water forms for recovery, roots for foundations).
- No totem is brighter, larger, or more visually prominent than another based solely on training intensity — recovery totems receive equal visual treatment.
- Locked totems are not shown as missing or empty: the path ahead is simply unexplored, not visually punishing.

### Journey Stages

Stages are descriptive, not gating. Reaching a new stage does not unlock access; it provides narrative context for where the user is on their journey. Skipping stages or regressing to an earlier one after a break carries no penalty.

| Stage | Approximate timeframe | Narrative framing |
|---|---|---|
| Foundation | Months 1–3 | Learning to show up and listen to your body |
| Building | Months 3–9 | Developing a rhythm that fits your life |
| Endurance | Months 9–18 | Sustaining through plateaus, seasons, and unexpected pauses |
| Mastery | 18+ months | Deep self-knowledge, autonomous adjustment, and long-term ownership |

Timeframes are approximate and non-blocking. A user who pauses for 4 months and returns is welcomed back at their existing stage.

### Totem Taxonomy (Representative, Not Exhaustive)

Each totem maps to one milestone family and has a deterministic, explainable eligibility rule.

**Consistency totems**
- First Session — complete any single session.
- Three Weeks Present — complete at least one session per week for 3 consecutive weeks.
- Return After Break — log a session after a gap of 14+ days.
- Eight-Week Rhythm — complete at least one session per week for 8 consecutive weeks (any session type counts).

**Recovery and Deload totems**
- First Rest Day Honored — follow a planned rest day without logging an unplanned session.
- Deload Completed — complete a full planned deload week.
- Five Deloads Honored — complete 5 deload weeks over the training history.
- Recovery Read — use the volume-based recovery indicator before scheduling a session 3 different times.

**Preparation totems**
- Warm-Up Habit — complete the warm-up block before the work sets in 10 sessions.
- Triple Preparation — complete warm-up in 3 consecutive sessions.

**Injury-safe progression totems**
- Measured Step — advance load conservatively (within progression rule bounds) for 4 consecutive weeks.
- RPE Awareness — log RPE on every set in 5 sessions.
- Pain Signal Respected — log a pain flag and adjust or abort the session as a result.

**Reflection totems**
- First Note — log any session note.
- Honest Check-In — report RPE ≥ 9 and choose to reduce next session load.
- Consistent Logger — add session notes in 10 sessions.

### Copy Guardrails For Totem Discovery

- Totem discovery is framed as acknowledgment, not reward: "You honored your rest. That counts."
- Never: "You earned X points." "You unlocked a reward." "Don't lose your streak."
- Copy must be specific to the behavior: state what the user did, not how the app feels about it.
- No superlatives or enthusiasm inflation: calm, matter-of-fact, respectful.

---

## Volume-Based Recovery Estimation

### Purpose

Recovery time between sessions is not fixed. It depends on the actual training load accumulated. The system provides an advisory recovery estimate based on real data from the user's sessions.

This estimate helps users plan the next session without guessing — and without pressure. It surfaces the signal that rest accelerates progress, not just prevents injury.

### Inputs

| Input | Source |
|---|---|
| Weekly volume load | Sum of (sets × reps × load) for each session in the rolling 7-day window, per muscle group |
| Session RPE trend | Mean RPE logged across the last 3 sessions |
| Deload compliance | Whether the most recent planned deload week was followed |
| Pain flags | Any pain or discomfort flags logged in the last 3 sessions |
| Muscle group overlap | Degree of overlap between last session and proposed next session (primary + secondary groups) |

### Output States

The recovery indicator has three states, always framed positively.

| State | Display copy | Condition |
|---|---|---|
| Consolidating | "Your muscles are consolidating. A rest today makes the next session stronger." | < 48h since last session targeting same primary muscle group |
| Ready | "You appear ready. Trust your body and train when it feels right." | ≥ 48h rest, volume within threshold, RPE trend ≤ 8.0, no pain flags |
| Extended recovery suggested | "Your recent load was significant. An extra rest day may accelerate your next block." | Volume above individual rolling threshold OR RPE ≥ 8.5 for 2+ consecutive sessions OR pain flags in last 3 sessions |

### Conservative Defaults

- Minimum rest between sessions targeting the same primary muscle group: **48h**.
- If weekly volume for a muscle group exceeds the individual rolling average by more than 25%: suggest **72h+**.
- If RPE trend ≥ 8.5 for 2 or more consecutive sessions: surface a deload suggestion in the next session planning view.
- If any pain flag logged in the last 3 sessions: always show extended recovery state regardless of volume.

When no load history exists (new user or data gap), the system defaults to the most conservative state and never suggests the user is "overdue" to train.

### Safety And Autonomy Rules

- Recovery estimates are **advisory only**. The user can always log a session regardless of recovery state.
- No blocking UI, no confirmation dialogs, no repeated warnings after the first view.
- No guilt copy if the user trains during a Consolidating or Extended recovery period.
- The recovery indicator is visible in the session planning view and dashboard. It is not surfaced as a notification.
- The calculation formula is documented in the app's help section so users can understand and verify it.

### Forbidden Implementation Patterns

- No countdown timer to "when you can train."
- No "You trained too hard" shame copy.
- No "Warning: rest required" alarming language.
- No pairing of recovery state with paid content or premium unlock.
- No using recovery state to push notification frequency.

---

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
- [ ] Totem system uses permanent, non-revocable milestones with neutral copy.
- [ ] Recovery totems have equal visual weight to intensity totems.
- [ ] Volume-based recovery indicator is advisory only and never blocks a session.
- [ ] Recovery copy passes forbidden-pattern audit (no countdown, no shame, no urgency).
- [ ] Recovery estimation formula is publicly documented in the app.
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
- [ ] Define totem visual language: motif families, neutral aesthetics, equal visual weight for recovery totems.
- [ ] Write neutral, supportive copy for all reward states following totem copy guardrails.
- [ ] Define user controls for notification and celebration intensity.
- [ ] Document patronage flow with non-pressure constraints.
- [ ] Design volume-based recovery indicator states and copy.
- [ ] Validate recovery copy against forbidden patterns (no countdown, no shame, no urgency).

### Engineering Checklist

- [ ] Implement milestone computation with traceable logic.
- [ ] Implement totem eligibility rules: deterministic, auditable, non-revocable.
- [ ] Implement volume-based recovery estimation (sets × reps × load, rolling 7-day window, per muscle group).
- [ ] Implement conservative recovery defaults (48h minimum, pain flag override).
- [ ] Expose recovery formula in app help section for transparency.
- [ ] Implement safeguards for missed-session recovery.
- [ ] Instrument required telemetry events.
- [ ] Add tests for forbidden-pattern regressions.
- [ ] Add unit tests for recovery estimation: thresholds, pain flag override, no-history default.
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
