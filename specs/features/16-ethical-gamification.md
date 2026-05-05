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
- [ ] `aestheticVariant` selector is implemented in Settings and surfaced as an optional onboarding step; `classic-boring` is the safer default when skipped.
- [ ] `prefers-reduced-motion` forces `classic-boring` and the Settings selector explains the override without overwriting the user's persisted preference.
- [ ] Both `retro-platformer` and `classic-boring` variants ship with full surface coverage, parity on shared core, and independent guardrail cross-check sign-off.

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

## Aesthetic Layer — Retro Platformer UI/UX

### Intent

The training surfaces of the app must feel like a retro platformer game, not like another generic Tailwind dashboard. The metaphor is deliberate: a workout is a level, a week is a world, a mesocycle is a quest. Aesthetic identity reinforces consistency motivation **without** introducing any pattern banned by the guardrails above.

This section is purely additive. It does **not** replace, weaken or contradict any rule from the Non-Negotiable Guardrails or Forbidden Patterns sections. If a visual idea ever conflicts with those, the guardrails win and the visual idea is dropped.

### Shared Gamification Core (Variant-Agnostic)

The gamification system has **one and only one** logic, data model, and copy contract. Aesthetic variants (see next section) re-skin the presentation layer; they never branch the rules, the eligibility, or the persisted data.

**Always shared across every variant — single source of truth:**

- Milestone taxonomy and eligibility rules (consistency, recovery, preparation, injury-safe progression, reflection).
- Totem catalog, identifiers, and deterministic granting logic (non-revocable, auditable).
- Volume-based recovery indicator (inputs, formulas, three states, conservative defaults, pain-flag override).
- Event instrumentation map and telemetry schema.
- Copy guardrails, forbidden patterns, and language tone rules.
- Patronage model constraints.
- Persisted data model in `UserConfig`, milestone history, and session-derived state. No variant adds new IDB stores.
- Accessibility contracts (i18n keys, AA contrast on functional overlays, `aria-*` semantics, keyboard navigation).

**Variant-specific (presentation only):**

- Visual layout (world map vs calendar, side-scroll level vs vertical card list).
- Typography ratios (where pixel font appears, how much of the surface uses it).
- Iconography (sprite-only, sprite + Lucide, Lucide-only).
- Motion intensity and choreography (parallax vs stepped HUD only vs minimal transitions).
- Palette saturation and background treatment (full master palette vs reduced-saturation derivative).
- Optional audio layer (per-variant default; user opt-in always).

**Hard rule:** any change to the shared core requires updating this spec; any change to a variant only touches that variant's section.

### Aesthetic Variants

The aesthetic layer is **multi-variant by design** and must remain extensible. New variants can be added in the future without touching the shared core.

#### Variant Architecture

- All variants share the same gamification core defined above.
- Each variant is identified by a stable technical key and exposes ca/es/en visible labels via `i18next`.
- Variant choice is persisted at `UserConfig.aestheticVariant` (existing store, no new IDB schema).
- Adding a new variant must not require schema migrations: `aestheticVariant` is a free-form string with a documented allowlist.
- Each variant must ship: full surface coverage (no half-skinned states), guardrail cross-check sign-off, full i18n coverage, accessibility audit.

#### Initial Variants

| Technical key | Visible label (en) | Default tone | Notes |
|---|---|---|---|
| `retro-platformer` | Retro Platformer | Game-forward, side-scroll metaphor, parallax | Full description in the rest of this section |
| `classic-boring` | Classic Boring | App-forward, calendar metaphor, light retro accents | Full description in the next subsection |

> The list is **open**: future variants (e.g. `terminal`, `paper-journal`, `high-contrast-only`) can be added by appending a row here, providing a variant-specific section, and shipping the surfaces.

#### User Control

- Selector lives in **Settings → Aspecte / Apariencia / Appearance**, exposing all available variants with a short preview thumbnail.
- The onboarding flow includes an **optional** step letting the user pick a variant. Skippable: if skipped, the system applies `classic-boring` as the safer default for new users.
- The selector clarifies in copy: *"Només canvia l'aspecte. Els objectius, els totems, la planificació i la recuperació són exactament els mateixos."*
- Switching variants is instant, reversible, and never resets any progress, milestone, or session data.

#### Calm Mode (Orthogonal)

- Calm mode remains a separate, orthogonal toggle that disables motion-heavy effects and audio loops.
- Calm mode combines with **any** variant. It is not a variant itself.

#### `prefers-reduced-motion` Behavior

- When the OS reports `prefers-reduced-motion: reduce`, the app **forces** `classic-boring` as the active variant regardless of the persisted preference.
- The Settings selector clearly informs the user: *"Estàs en Classic Boring perquè el sistema té activada la reducció de moviment. Desactiva-la al sistema per poder triar una altra variant."*
- The user's previously persisted variant is preserved (not overwritten) and restored automatically when `prefers-reduced-motion` is no longer reported.

### Variant: Classic Boring

`classic-boring` is the app-forward variant. It keeps a discreet retro touch so it visually rhymes with the rest of the app, but drops the platformer metaphor entirely. It is the default for new users and the forced variant when reduced-motion is requested.

#### Visual Language

- **Style direction:** clean, app-like surfaces with a light retro accent. No parallax, no scrolling levels, no sprite-stage compositions.
- **Palette:** same master palette and per-week sub-palettes as `retro-platformer`, but with **reduced saturation** and **neutral backgrounds**. Sub-palettes appear as accent strips, header tints, and totem motif tones — never as full-bleed scenes.
- **Typography:** the pixel display face is used **only** in section titles and HUD numbers (volume, time-remaining, set counters, RPE). All body copy, labels, and form text use the existing system font for maximum legibility.
- **Iconography:** small retro pixel sprites for totems/milestones and for session state indicators (completed / in-progress / skipped / future). Tool surfaces and form controls keep Lucide icons.
- **Motion:** stepped micro-animations on HUD numbers (count-up in steps, never smooth tweens). Discrete fade/slide transitions between views. No parallax. No ambient loops. Respect `prefers-reduced-motion` everywhere — degrades to instant state changes.

#### Surface Treatments

| Surface | Treatment in Classic Boring |
|---|---|
| Dashboard | Weekly calendar view with one row per week and one cell per scheduled session; cells show state (future, available, in-progress, completed, skipped) with small pixel icons and a tinted accent from the week's sub-palette |
| Session execution (`/session`) | Vertical scroll. One card per exercise with timer and sets inline; compact HUD at top showing volume, elapsed time, and RPE summary using pixel-font numbers |
| Stats / progress | Card grid of totems and milestones; each card shows the pixel sprite, the totem name, the date earned, and a tap-to-inspect detail panel with the exact deterministic rule that granted it |
| Plan creator | Tool surface, app-clean (unchanged from current style) |
| Settings | Tool surface, app-clean; hosts the variant selector |
| Onboarding | Tool surface, app-clean; includes the optional variant-pick step |
| Data import/export | Tool surface, app-clean (unchanged) |

#### Navigation Metaphor — Calendar

- **Mesocycle = plan.** Page-level header shows preset name + cycle index.
- **Week = row.** One row per week with a label and the dominant accent color from the week's sub-palette.
- **Session = cell.** State indicators only; tap to open the session view. Future cells are visually muted (low contrast frame) but never blocked from interaction — same lock-as-storytelling rule applies.
- **Routing & data:** identical to `retro-platformer`, derived from existing `Mesocycle` state. Zero new persistence.

#### Session Execution Surface

- **Layout:** vertical scroll, one card per exercise. Each card contains the exercise name (system font), pixel-font set/rep counters, an inline rest timer, RPE input, and notes. Cards collapse once completed.
- **HUD (top sticky bar):** elapsed time, total volume, average RPE — all in pixel-font numbers with stepped count-up animation. No meters, no gems, no level-clear frame.
- **Rest timer:** compact pixel-font countdown inside the active card. SFX always disabled in this variant. No flashing or color-urgency states.
- **Completion:** end-of-session summary card listing sets completed, RPE summary, and the recovery indicator state. No celebratory frame; a single calm acknowledgment line passes the forbidden-pattern review.

#### Stats / Inventory Surface

- Totems and milestones render as a responsive card grid.
- Each card uses the pixel sprite from the shared totem catalog as the visual anchor; card body uses system font for the totem name, earned date, and family motif color.
- Tapping a card opens a detail panel with the deterministic eligibility rule, exactly as in `retro-platformer`.
- Recovery totems share the exact same card treatment as intensity totems (equal visual weight requirement is preserved).

#### Sound

- Audio layer is **disabled** in this variant. Both `sfx` and `music` channels are muted by default and the per-channel toggles are hidden from the Settings panel while `classic-boring` is active. No SFX during rest timer, no chime on session completion.
- This is intentional: `classic-boring` is the calm/silent path. Users who want optional audio choose `retro-platformer` (or another future audio-bearing variant).

#### Accessibility

- Inherits all shared accessibility contracts.
- Because motion is minimal and audio is disabled by default, this variant is the natural fit for `prefers-reduced-motion` and is forced in that scenario (with a Settings notice).
- Calendar cells are tab-focusable in chronological order. Arrow keys move focus across cells. Each cell exposes `role="link"` with name `"Setmana N · Sessió M · {state}"`.

#### Guardrail Cross-Check

| Guardrail | Classic Boring compliance |
|---|---|
| Health over engagement | Calendar reflects schedule + recovery state; no nudges |
| No punishment loops | Skipped cells are visually muted, never shamed |
| No artificial urgency | No countdowns, no flashing timers, no urgency colors |
| No exploitative monetization | No paid cosmetics, no paid variants |
| Transparency first | Tap any totem card or HUD readout to inspect the deterministic rule |
| Autonomy and control | Variant is user-selectable; Calm mode and audio toggles still apply where relevant |
| Accessibility and inclusion | Reduced-motion safe by design, AA contrast, full keyboard nav |
| Balanced copy | All summary copy reuses the shared copy pool |
| Protect cognitive load | No celebratory frames; one acknowledgment per session end |
| Data minimization | Zero new persisted state; aesthetic is derived |

### Phase B Shared Contracts (Dashboard) — added 2026-05-04

These contracts apply equally to every Phase B+ variant. They consolidate parity-critical details that were under-specified in the per-variant sections.

#### Canonical Session State Model (shared across all variants)

The shared dashboard model exposes exactly five session states:

| State | Meaning | Visual mapping (retro-platformer) | Visual mapping (classic-boring) |
|---|---|---|---|
| `future` | Scheduled but not yet the next pending session | Silhouetted node ("locked" storytelling, never blocking) | Muted cell with low-contrast frame |
| `available` | Next pending session per `weekNumber` then `dayOfWeek` ordering | Subtle highlight pulse | Accent-tinted cell with subtle outline |
| `in-progress` | Session currently being executed (`previewSession.id` matches) | Animated marker | Cell with active-state ring |
| `completed` | `SessionTemplate.completed === true` | Checkpoint flag with deterministic stamp | Cell with check pixel sprite |
| `skipped` | `SessionTemplate.skipped === true` | Greyed branch (never shamed) | Muted cell with strike pixel sprite (never shamed) |

The retro term "locked" is **presentation-only** for `future`; the model never emits a `locked` state. The lock-as-storytelling rule is preserved: every state is interactable in both variants — visual treatment never gates routing.

#### Shared Accessibility Contract

- Each session surface (node or cell) exposes `role="link"`.
- The accessible name is rendered via the i18n key `dashboard.session_aria` with placeholders `{{week}}`, `{{session}}`, `{{state}}`, where `{{state}}` is one of the five canonical states resolved through `dashboard.state.<state>` (ca/es/en).
- Tab order: chronological by `weekNumber` then `dayOfWeek`.
- Arrow keys: ←/→ move focus along the same week; ↑/↓ move focus across weeks.
- `prefers-reduced-motion` is honored at the variant-resolution layer (`useEffectiveAestheticVariant`); no Phase B code reads `matchMedia` directly.

#### Per-Week Sub-Palette Resolution

- Master palette tokens live under the CSS variable namespace `--theme-dashboard-*` (shared across variants).
- Each week resolves a sub-palette token (`--theme-dashboard-week-accent`) via deterministic mapping `weekIndex % palette.length` against the active variant's master palette.
- `classic-boring` uses the same mapping but renders the accent at reduced saturation (token `--theme-dashboard-week-accent-muted`).
- Sub-palette resolution is computed at render time from `weekNumber`; it is never persisted.

#### Token Namespaces

- `theme.dashboard.*` — shared dashboard tokens (state colors, week accents, spacing scale). Consumed by both renderers.
- `theme.game.*` — retro-platformer-only extras (parallax depth, sprite scale). Never read by `classic-boring`.

#### Persistence & Telemetry

- Phase B introduces **zero** new IDB stores and **zero** new telemetry events. The dashboard map is derived state recomputed from `Mesocycle`, `SessionTemplate.completed/skipped`, and the previewSession id.

---

### Phase C Shared Contracts (Session Execution) — added 2026-05-04

These contracts apply equally to every Phase C+ variant. They consolidate parity-critical details that were under-specified in the per-variant Session Execution Surface paragraphs.

#### Canonical Per-Set State Model (shared across all variants)

The shared session-execution model exposes exactly four set states:

| State | Meaning | Visual mapping (retro-platformer) | Visual mapping (classic-boring) |
|---|---|---|---|
| `pending` | Future set in the current or upcoming exercise | Dim platform tile | Muted card row |
| `active` | The set currently being logged | Highlighted platform with marker | Card row with accent ring |
| `completed` | A set with a logged `ExecutedSet` record | Coin-flag stamp | Card row with check pixel sprite |
| `skipped` | A set the user explicitly skipped | Greyed branch (never shamed) | Muted row with strike pixel sprite (never shamed) |

Per-set states derive deterministically from `executedSets`, `currentExerciseIndex`, and `currentSetIndex`. The model is read-only; renderers never derive state from `variant`.

#### Shared HUD Contract

Both variants render the same four HUD readouts at the top of the session execution surface: `elapsed`, `volume (kg)`, `sets completed / total`, `mean RPE`. Numbers animate in stepped count-up only (no smooth tweens). No meters, no gems, no level-clear frame in the HUD. `prefers-reduced-motion` collapses count-up to instant updates. HUD numbers live in a single `aria-live="polite"` region per readout.

#### Rest-Timer Contract

The rest timer is a monotonic seconds-remaining readout. **No color shift, no flashing, no escalation** as the timer approaches zero — in either variant. Retro may play an opt-in chime at exactly t=0; Classic is always silent. Both variants expose the same Skip Rest action with identical semantics.

#### Completion-Frame Contract

End-of-session derives a shared `SessionCompletionModel` (sets done, mean RPE, recovery hint, total volume, elapsed minutes). Classic renders a single calm acknowledgement line (`session.completion.calm.headline` + `.body`). Retro additionally renders a "level clear" frame using `session.completion.retro.*` keys. Classic MUST NOT reference any `session.completion.retro.*` key — enforced by review and by render-test assertion.

#### Shared Accessibility Contract

- Each set surface exposes `role="button"`, `aria-pressed={state === 'completed'}`, and an accessible name resolved via `common.session.set.aria` with placeholders `{{exercise}}`, `{{set}}`, `{{total}}`, `{{state}}` (state resolved through `common.session.set.state.<state>`).
- Tab order: top-down through HUD → current exercise card → set logger controls → rest timer (when active) → cancel/finish controls.
- Enter/Space on the active set triggers `actions.logSet`; non-active sets are read-only.
- HUD readouts are wrapped in `aria-live="polite"` regions; rest-timer countdown is `polite` (never `assertive`) to honor the no-urgency rule.
- `prefers-reduced-motion` is honored at the variant-resolution layer (`useEffectiveAestheticVariant`); both renderers also collapse internal step animations to instant updates when the OS reports reduced motion.

#### Token Namespaces

- `theme.session.*` — shared session tokens (set-state colors, rest-timer color, HUD numbers/labels, week accent reuse). Consumed by both renderers.
- `theme.game.session.*` — retro-platformer-only extras (platform color, sprite scale, checkpoint color). Never read by `classic-boring`.

#### Audio Gating Contract

`classic-boring` is silent. The audio service short-circuits at its public entrypoints when the effective variant is not `retro-platformer`. Audio toggles remain hidden from Settings while `classic-boring` is active (already specified). A render test asserts that no `<audio>` element mounts in `classic-boring`.

#### Persistence & Telemetry

Phase C introduces **zero** new IDB stores and **zero** new telemetry events. The session execution model is derived state recomputed each render from `generatedSession`, `executedSets`, and the current navigation slice of `sessionStore`.

---

### Variant: Retro Platformer

> The remainder of this section describes the `retro-platformer` variant in full. The shared core above and the variant architecture apply equally to all current and future variants.

### Visual Language

- **Style direction:** 8/16-bit pixel art (NES/SNES era — Mega Man, Super Mario World, Metroid). Crisp pixels, limited palette per scene, deliberate dithering allowed.
- **Palette:** scene-scoped 16-32 color sub-palettes derived from a master palette. Each "world" (week) gets a dominant hue family; sessions inherit it. Master palette and sub-palettes are tokens (CSS variables) so they can be themed without code changes.
- **Typography:** one bitmap/pixel display face for game surfaces (titles, level names, HUD numbers); the existing system font is retained for any body copy that demands legibility (long instructions, transparency disclosures, accessibility text).
- **Iconography:** existing Lucide icons stay in tool surfaces; game surfaces use pixel-sprite icons (SVG-based, no PNG raster required at v1).
- **Motion:** deliberate, low-frequency, easing-stepped (no smooth tweens for HUD numbers — count up in steps). Respect `prefers-reduced-motion` everywhere — when set, all game motion degrades to instant state changes with no parallax.

### Surface Classification

| Surface | Class | Treatment |
|---|---|---|
| Dashboard | `game` | World map (see Navigation Metaphor) |
| Session execution (`/session`) | `game` | Side-scroll level run with checkpoints per exercise |
| Stats / progress | `game` | Inventory + HUD-style readout |
| Plan creator | `tool` | Tailwind clean (current style) |
| Settings | `tool` | Tailwind clean |
| Onboarding | `tool` | Tailwind clean (consider a single pixel-art mascot intro card as bridge) |
| Data import/export | `tool` | Tailwind clean |

Tool surfaces must remain frictionless and high-readability. The aesthetic separation is intentional: configuration is a contract, training is a quest.

### Navigation Metaphor — World Map

- **Mesocycle = quest** — overall horizontal/vertical scroll map. Title above (preset name + cycle index).
- **Week = world** — a self-contained map region with its own dominant palette, parallax background and ambient micro-anims.
- **Session = level node** — a clickable node on the world's path. Visual states: locked (silhouetted), available (subtle highlight pulse, NEVER aggressive), in-progress (animated marker), completed (checkpoint flag with deterministic stamp), skipped (path branch greyed out, never visually shamed).
- **Routing:** map state derives from the existing `Mesocycle` data (no new persistence required for the aesthetic layer). Order matches `weekNumber` then `dayOfWeek`.
- **Lock/unlock rule:** the "lock" is **purely visual storytelling**, not a behavior gate. Users keep all current freedoms (skip session, jump session, restart). Locked appearance only signals "future" — never blocks the user from navigating to it.

### Session Execution Surface

- **Layout:** horizontal level strip (or vertical climb, decided per session). Each exercise is a visual checkpoint platform. Reps are coins, sets are sub-goals, RPE is a colored gem.
- **HUD:** energy / volume / time-remaining as pixel meters. Numbers count in stepped increments to feel arcade. Honest readouts only — no inflated counters.
- **Rest timer:** retro-styled pixel countdown with a chime SFX option (off by default). The timer never visually pressures (no flashing red urgency states).
- **Completion:** end-of-session "level clear" frame: deterministic recap (sets done, RPE summary, recovery suggestion). No randomized rewards. No surprise loot. Dynamic copy from a curated pool is allowed only if every line passes the forbidden-pattern review.

### Stats / Inventory Surface

- Earned milestones display as inventory items / pixel sprites organised by deterministic categories (consistency, recovery, technique, longevity).
- Each item has a tap-to-inspect detail card showing the exact rule that granted it (transparency requirement reused from existing Guardrail #5).
- No "rare" or "legendary" tiers driven by chance. Tiers, if any, are purely volume-of-evidence based and explicitly explained.

### Sound (Optional Layer)

- All audio is **opt-in**. Default state is muted across the entire app.
- Two channels: `sfx` (button presses, level clear, checkpoint) and `music` (ambient world loop). Each independently togglable.
- Files must be small (chiptune `.ogg`/`.mp3` <= 60 KB total per world). Music loops are optional per world; SFX is shared.
- Reduced-motion preference does **not** auto-mute audio (separate preference) but the Settings tool surface offers a single "Calm mode" master toggle that disables both motion-heavy effects and audio loops.

### Accessibility Requirements (additive)

- Pixel art must pass WCAG AA contrast for any text overlaid on it. Decorative pixel scenes do not need to pass contrast in isolation, but all functional text/icons rendered on top of them must.
- Every game surface must have an equivalent `aria-label` description. Map nodes expose `role="link"` with name "Week N · Session M · {state}".
- The `classic-boring` variant (see Aesthetic Variants) acts as the app-clean equivalent of every game surface and is the forced variant when `prefers-reduced-motion` is set. Implementation order can ship `retro-platformer` first if `classic-boring` is preserved as the parity target for the same data.
- Keyboard navigation: world map nodes are tab-focusable in chronological order. Arrow keys can move focus along the path.
- All animation respects `prefers-reduced-motion`. No essential information is conveyed by motion alone.

### Internationalization

- All in-game copy (level names, world titles, HUD labels, level-clear messages) flows through `i18next` keys in ca/es/en, same as the rest of the app.
- Pixel font must include extended Latin glyphs to support `à á è é í ï ó ò ú ü ç ñ`. If the chosen face does not, fall back to system font for those glyphs and document the limitation.

### Technical Strategy

- **Primary stack:** CSS + SVG + Tailwind utilities. Keyframe animations for parallax, sprite cycling, and node pulses. No additional runtime engine is added by default.
- **Optional secondary:** Lottie or Rive can be introduced **only** for high-impact micro-animations (e.g. level-clear celebration, totem reveal). Bundle impact must stay under +60 KB gzipped for the entire aesthetic layer including all assets.
- **No game engine** (Phaser/PixiJS) at v1. The metaphor is achieved by static composition + CSS motion, not real-time rendering.
- **Asset pipeline:** all sprites authored as SVG with explicit pixel grid (`shape-rendering: crispEdges`); raster fallback only if a particular sprite cannot be expressed cleanly in SVG.
- **Code splitting:** game surfaces lazy-loaded as a single chunk so tool surfaces (Settings/Onboarding/Plan creator) keep their current load cost.
- **Persistence:** the aesthetic layer adds **zero new IndexedDB stores**. All game state derives from existing `Mesocycle`, `Session`, milestone, and config data. Aesthetic preferences (`aestheticVariant`, sound on/off, calm mode, reduced motion override) live under existing `UserConfig`.

### Tokens & Theming

- Introduce a `theme.game.*` namespace in CSS variables (palette, sprite scale, parallax depth). Each world resolves its sub-palette via a single CSS variable swap on the world container.
- Tailwind continues to be the base utility layer; game surfaces consume tokens through CSS variables defined alongside Tailwind, **not** by replacing Tailwind.

### Guardrail Cross-Check (must remain true)

| Guardrail | Aesthetic layer compliance |
|---|---|
| Health over engagement | Map progression mirrors recovery state; no nudges to skip rest |
| No punishment loops | Skipped levels are visually neutral (greyed path), never shamed |
| No artificial urgency | Locked nodes show "future" framing, never countdowns |
| No exploitative monetization | No paid skins, no paid worlds, no cosmetic gating behind donation |
| Transparency first | Tap any node, badge or HUD readout to inspect the deterministic rule |
| Autonomy and control | Variant selector + Calm mode + per-channel audio toggles |
| Accessibility and inclusion | Reduced motion forces `classic-boring`, AA contrast, aria descriptions |
| Balanced copy | Level names and clear-screen messages reviewed against forbidden patterns |
| Protect cognitive load | Stepped HUD, no reward spam, max 1 celebration per session end |
| Data minimization | Zero new persisted events; aesthetic is derived state |

### Out of Scope for the Aesthetic Layer (v1)

- Real-time multiplayer or live leaderboards in any form.
- Procedurally generated worlds.
- 3D rendering or WebGL.
- Heavy game engines (Phaser, PixiJS) — revisit only if v1 metrics justify it.
- Custom sound editor or user-uploaded music.
- Paid cosmetic packs.

### Implementation Phasing (high-level — no estimates)

1. **Phase A — Tokens & primitives.** Master palette, world sub-palettes, pixel font, base sprite primitives, variant selector (`aestheticVariant`) + Calm mode toggle wired to existing `UserConfig`, and `prefers-reduced-motion` enforcement of `classic-boring`.
2. **Phase B — World map for Dashboard.** Render existing mesocycle as map nodes; lock/unlock states; tap node opens current session view.
3. **Phase C — Session execution skin.** Side-scroll layout, pixel HUD, rest timer styling, level-clear frame.
4. **Phase D — Stats inventory skin.** Milestones rendered as collectible sprites with inspect cards.
5. **Phase E — Optional polish.** Lottie/Rive micro-anims (level clear, totem reveal). Sound layer (off by default).

Each phase ships with: parity across every active variant (`retro-platformer` and `classic-boring` at v1), zero new persisted state, full i18n coverage, accessibility audit, guardrail cross-check sign-off.

### Extended Aesthetic Concepts

The following concepts extend the base aesthetic layer. Each has been validated against the Non-Negotiable Guardrails and Forbidden Patterns. None of them introduce randomness in rewards, progress loss, paid cosmetics, or social pressure.

#### 1. Mascot / Avatar Guide

- A single recurring pixel character (working name TBD) appears on game surfaces as a companion. Performs idle animations on the world map and matches the active exercise on the session screen with a contextual sprite (e.g. squat, push-up, bridge).
- Tone is **supportive, never instructive or judgmental**. Lines are pulled from a curated, reviewed copy pool that passes the forbidden-pattern review. No pop-up advice during exercises.
- Fully mutable: a single Settings toggle hides the mascot across the entire app. When hidden, no functional information is lost.
- The mascot is never used as a notification vector, never used to push the user to act, and never displays sad/disappointed states triggered by missed sessions.
- Implementation as a self-contained sprite primitive that respects `prefers-reduced-motion` (becomes a static portrait when set).

#### 2. Biome System (per Week)

- Each `world` (week) inherits a thematic biome (e.g. Forest, Cave, Sky, Volcano, Lab). The biome maps deterministically to the week's training character — for instance:
  - **Volcano** → high-intensity weeks
  - **Sky** → deload / recovery weeks
  - **Forest** → baseline / hypertrophy
  - **Cave** → technique / accessory focus
  - **Lab** → testing / reassessment weeks (when the engine introduces them)
- Biome assignment is computed from existing `Mesocycle.weeks[].sessions` characteristics (no new persistence). Mapping rules are documented and exposed via the same transparency surface as milestones.
- Biome influences only: background art, parallax layers, sub-palette, ambient SFX (when enabled). Biome **does not** change session difficulty, available exercises, or any functional behavior.
- A biome is never used to imply the user is "in trouble" (e.g. no Underworld biome triggered by missed sessions). Skipped or rescheduled weeks keep their original biome.

#### 3. Palette Swap Themes

- The user can choose between several master palettes that re-skin all game surfaces:
  - **Default** — full-color SNES style
  - **Game Boy** — 4-shade green monochrome
  - **NES** — limited 54-color subset
  - **Famicom** — alternate Japanese hue tilt
  - **CGA** — high-contrast 4-color
  - **High-Contrast** — accessibility-first palette guaranteed AA on all overlays
- Setting lives in `UserConfig.aestheticTheme`. Default value is `default`. No palette is gated behind any condition (no completion requirement, no payment, no streak).
  - The High-Contrast palette is recommended (and surfaced as a hint) when the user is on `classic-boring` or has `prefers-reduced-motion` active, but the user always has the final choice. Palette and aesthetic variant are independent axes.
- All palettes ship as static CSS variable bundles; no runtime color conversion. Tailwind tokens for tool surfaces remain unchanged across themes.

#### 5. Pixel Achievements / Sticker Book

- A dedicated stats sub-surface displays one-off recognitions (first time completing a given exercise, first deload, first full week, longest gap-recovery, etc.) as collectible pixel stickers.
- Every sticker is **deterministically earned** from existing event data — no probability, no hidden criteria. Tap any sticker to inspect the exact rule that granted it (transparency requirement reused from Guardrail #5).
- Stickers are personal-only by default. There is no leaderboard, no public profile, no share-by-default behavior.
- Sticker book never displays empty/locked silhouettes that imply scarcity or pressure ("collect them all!"). It only shows what the user has actually earned, with an optional "What can I earn?" link that explains all rules in plain text.

#### 6. Living World Map

- The world map evolves visually as sessions are completed. Completed nodes acquire a checkpoint flag and a small environmental detail (e.g. a tree fully grown, a torch lit, a fish in the pond). Skipped or rescheduled sessions do **not** trigger a negative visual change — they remain in their default state, never "wilted" or "broken".
- Visual evolution is purely additive and derived from existing `Session.completed` events (no new persistence).
- The map cap is reached at 100% completion of the mesocycle. Past mesocycles are archived as static map snapshots in the existing stats surface.
- Reduced-motion users see a static "completed" overlay instead of growth animations.

#### 9. Deload-Week Aesthetic Treatment

- Deload weeks (already a deterministic engine concept) get a deliberate, distinct aesthetic: muted palette, slower parallax, calm ambient music (when enabled), mascot in a resting/stretching idle.
- This is **active reinforcement that rest is part of the quest**, not a downgrade. Copy and visual cues frame deload as "the world breathes" rather than "you can't fight here".
- Deload sprites are never lower-fidelity than training sprites — they are **alternative**, not lesser.
- All other guardrails apply: no urgency to skip the deload, no shortcut to "unlock" intensity, no shaming if a deload is rescheduled.

### Extended Concepts — Guardrail Cross-Check

| Concept | Critical risk | Mitigation built in |
|---|---|---|
| Mascot | Could become a guilt vector | No sad states, single mute toggle, copy-pool review |
| Biome | Could imply punishment biomes | Skipped/missed weeks keep original biome; mapping is documented |
| Palette swap | Could become paid skin pack | No gating; all palettes free, deterministic, no completion requirement |
| Pixel achievements | Could trigger collect-em-all compulsion | No locked silhouettes; rules transparent; personal-only by default |
| Living world map | Could shame missed sessions | Skipped nodes never visually degrade; only additive growth |
| Deload aesthetic | Could read as "lower fidelity" | Deload sprites are equal-fidelity alternatives, not stripped versions |

## Out Of Scope For Step 16

- Competitive social ranking systems.
- Paid feature gating for core training capabilities.
- Third-party ad network engagement loops.
- Any mechanic that incentivizes unsafe training frequency.
