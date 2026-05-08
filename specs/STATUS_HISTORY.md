# Implementation Status — History Archive

> Detailed completion records, architecture decision rationale, and QA notes.
> For current status, see `specs/STATUS.md`.

---

## Recent Changes

### 2026-05-08 — Step 16 Phase E sub-phase E4f review + i18n blocker fix

**Reviewer verdict:** initial FAIL (one shipping blocker), now PASS-WITH-NOTES after fix.

**Blocker B1 (FIXED):** All 6 i18n keys (`stats.totem.first_rest_day_honored.{name,rule}` × 3 locales + `planning.rest_day.{label,mark_button,unmark_button,preview_description}` × 3 locales) were claimed-as-shipped in the implementation entry but were absent from every locale file. Reviewer caught this via direct file inspection. `npm run i18n:check` did not detect the gap because it only verifies symmetric parity across locales — when keys are missing identically in ALL three, parity holds. Tests passed because they assert on totem ids, not resolved copy.

**User-visible impact (had we shipped):** WeekView "+" affordance, rest-day card in SessionPreview, and the `first-rest-day-honored` totem in the inspect panel would all render literal i18n key strings (`planning:rest_day.label`, `stats:totem.first_rest_day_honored.name`, etc.) instead of localized copy. Catastrophic for the very feature E4f ships, and a direct guardrail violation.

**Fix applied (2026-05-08):**
- Added `first_rest_day_honored.{name,rule}` to all 3 `stats.json` after `triple_preparation` (idiomatic CA/ES copy, calm tone, no shame language).
- Added `rest_day.{label,mark_button,unmark_button,preview_description}` to all 3 `planning.json` (top-level). Dropped `short_label` per reviewer recommendation (no source consumer).
- Re-verified all 4 gates: i18n parity ✓ · lint 0 errors ✓ · 146/146 tests ✓ · build success ✓.
- Updated `/memories/repo/i18n-parity.md` to document the parity-only limitation and the new "grep source after adding keys" verification step.

**Reviewer non-blocking notes (carried forward):**
- W1 — `plannedSessionDateUTC` duplicates Monday-anchored math from `getSessionDate` (intentional: UTC vs local-time). Recommend back-reference JSDoc in `getSessionDate`.
- W2 — `WeekView` capture buttons gated by `activeMesocycle?.id === mesocycle.id`; if WeekView is ever rendered for the active meso in a read-only context, write affordances would leak. Optional `readOnly?: boolean` prop suggested. No current leak found.
- W3 — `unmarkRestDay` defensive guard is silent on non-rest-day ids. Acceptable per JSDoc rationale.
- I1 — No `exportImport.ts` round-trip tests exist (none before, none added). `version: 1 | 2` accept logic + `version: 2` emit unverified by tests. Recommended follow-up.
- I2 — `payload!` non-null assertions in `buildSessionCompletionTotemPayload.test.ts` confirmed style-only (each block precedes with `expect(payload).not.toBeNull()`).

**Outcome:** E4f closed cleanly after blocker fix. All warnings non-blocking; carried as known polish items.

---

### 2026-05-08 — Step 16 Phase E sub-phase E4f implementation (rest-day family — full scope)

**Scope:** First time-relative totem evaluator + first per-empty-slot planning capture surface. Ships ONE new totem (`first-rest-day-honored`) inside the existing `recovery` family. No `TotemFamily` / `FAMILY_ORDER` change. No IDB schema bump (additive optional field on embedded JSON record).

**Files modified — UI / planning plumbing (prior dispatch):**
- `src/types/planning.ts` — `SessionTemplate.isPlannedRestDay?: boolean` (additive optional).
- `src/stores/planningStore.ts` — `markRestDay` / `unmarkRestDay` actions (toggle by week/day, append minimal rest-day template or remove).
- `src/components/planning/WeekView.tsx` — per-empty-slot "Mark as rest day" capture surface (active mesocycle only, neutral non-red dot).
- `src/components/planning/SessionPreview.tsx` — distinct rest-day rendering (no shame copy).
- `src/services/db/database.ts` — comment clarification only (no v3 bump; baseline already at v2).
- `src/services/db/exportImport.ts` — bumped to `version: 2` with `1 | 2` accept type (backward-compat import).
- `src/i18n/locales/{ca,es,en}/planning.json` — `planning.rest_day.*` keys.
- `src/i18n/locales/{ca,es,en}/stats.json` — `stats.totem.first_rest_day_honored.*` keys.

**Files modified — catalog + evaluator + tests (this pass):**
- `src/services/stats/buildTotemInventoryModel.ts`:
  - Extended `TotemId` union with `'first-rest-day-honored'` (placed alphabetically/logically near other recovery totems).
  - Inserted catalog entry into `TOTEM_CATALOG_V2` AFTER `five-deloads-honored` and BEFORE the preparation band entries (preserves canonical family order Consistency → Recovery → Preparation → Reflection).
  - Added `evalFirstRestDayHonored(input)` — first time-relative evaluator. Honor predicate: `isPlannedRestDay === true` AND planned calendar date strictly past `todayISO` (UTC, today exclusive) AND no `ExecutedSession.date` matches that rest-day date. Returns the EARLIEST honored rest-day calendar date (chronological).
  - Added `plannedSessionDateUTC(startDate, weekNumber, dayOfWeek)` — UTC-pure analogue of `getSessionDate` from `@/utils/dateHelpers`. Mirrors the Monday-anchored ISO `dayOfWeek` math but operates entirely in UTC for determinism against `input.nowMs`. Inlined here (rather than importing the local-Date helper) to keep the evaluator a pure function with no timezone leakage.
  - Wired `'first-rest-day-honored': evalFirstRestDayHonored` into the `EVALUATORS` map.
- `src/services/stats/buildTotemInventoryModel.test.ts` — appended `Phase E4f — first-rest-day-honored` describe block with 7 cases (fixed `nowMs = Date.UTC(2025, 5, 15)` → `todayISO = '2025-06-15'`; mesocycle `startDate = 2025-06-02` Monday-anchored fixture):
  1. No planned rest days → `available`.
  2. One future planned rest day (tomorrow, 2025-06-16) → `available`.
  3. One planned rest day === today (2025-06-15) → `available` (today exclusive).
  4. One past planned rest day (2025-06-02), no executions → `earned`, date `'2025-06-02'`.
  5. One past planned rest day with `ExecutedSession.date` match → `available` (honor broken).
  6. Two past planned rest days (2025-06-02 + 2025-06-09), both honored → `earned`, returns the EARLIER (`'2025-06-02'`).
  7. Two past planned rest days, only the second honored → `earned`, returns the second (`'2025-06-09'`).
  - Also bumped the catalog-invariant test (`V2 == V1 + {five-deloads-honored, first-rest-day-honored, warm-up-habit, triple-preparation}`, length `+ 4`).
- `src/services/session/buildSessionCompletionTotemPayload.test.ts` — appended `Phase E4f — first-rest-day-honored earn-ack diff` describe with 1 case: before `available` + after `earned` → `newlyEarnedIds` contains `'first-rest-day-honored'` AND `primaryTotemId === 'first-rest-day-honored'` (only newly-earned totem in the diff). No selector change required — the id-driven diff already covers the new totem.

**Verification:**
- `npm run i18n:check` → ✅ 3 locales / 6 namespaces in parity.
- `npm run lint` (`tsc --noEmit`) → ✅ 0 errors.
- `npx vitest run` → ✅ 146/146 tests pass (was 138 → +8: 7 evaluator cases + 1 earn-ack diff).
- `npm run build` → ✅ success.

**Outcome:** Phase E sub-phase E4f closed. Locked Phase E order is now: E4g ✅ → E1 ✅ → E3 ✅ → E4a ✅ → E4f ✅ → E4b → E4c → E4d → E2 (E4e moved to Phase F).

---

### 2026-05-08 — Step 16 Phase E sub-phase E4f pre-execution mini-gate (rest-day family)

**Architect verdict:** GO with 3 Open Questions, all resolved by user.

**User-locked decisions:**
1. **Bump export version 1→2** (with backward-compat: import accepts both `1` and `2`).
2. **Ship ONLY `first-rest-day-honored`** (single-shot; defer cumulative/streak variants).
3. **WeekView per-empty-slot capture surface** (active mesocycle; not in PlanCreator wizard).

**Schema:** `SessionTemplate.isPlannedRestDay?: boolean` added. **No IDB version bump** — DB already at v2 (E4a covers all three E4 additive optional fields per spec baseline). Field is additive optional on an embedded JSON record (`Mesocycle.sessions[]`); IDB schemaless within object stores.

**Family:** Reuse existing `'recovery'` family (no `TotemFamily` / `FAMILY_ORDER` change). Catalog: ONE new entry `first-rest-day-honored`, inserted after `five-deloads-honored` in the recovery band.

**Capture surface:** Per-empty-slot "Mark as rest day" button in `WeekView`, materialising a minimal rest-day `SessionTemplate` with `isPlannedRestDay: true`. Distinct neutral dot color (NEVER red — "no shame copy" guardrail). Toggle action in `planningStore` (`markRestDay` / `unmarkRestDay`).

**Evaluator:** `evalFirstRestDayHonored` — earned when ≥1 `SessionTemplate` has `isPlannedRestDay === true` AND its calendar date is strictly past today (UTC) AND no `ExecutedSession.date` matches. Tipping = earliest honored rest-day calendar date. First time-relative evaluator (uses `input.nowMs`).

**Earn-ack:** Zero changes to `buildSessionCompletionTotemPayload` — diff-driven path already covers the new id. Earn-ack fires opportunistically on next session finish; no background trigger by design.

**Out-of-scope guardrails restated:** no `painFlag` (E4b), no notes UI (E4c), no `planningAuditLog` (E4d), no `Executed*` changes, no chart/dashboard/aggregation changes, no warm-up touch (E4a closed), no `MUSCLE_COLORS` change.

**Verdict:** GO. Implementer to dispatch with all 3 user decisions locked.

---

### 2026-05-07 — Step 16 Phase E sub-phase E4a fix pass (W1 + W3 + W4)

User-locked fixes for the three reviewer warnings (all confirmed via `vscode_askQuestions`):

**W1 — Totem name aligned with 5-streak threshold (id stable):**
- `src/i18n/locales/en/stats.json`: `triple_preparation.name` "Triple preparation" → "Five preparations in a row".
- `src/i18n/locales/ca/stats.json`: "Triple preparació" → "Cinc preparacions seguides".
- `src/i18n/locales/es/stats.json`: "Triple preparación" → "Cinco preparaciones seguidas".
- Totem id `triple-preparation` retained for catalog stability (Phase E is pre-launch, no migration cost; renaming just the user-facing copy is the cleaner scope).

**W2 — Misleading function name renamed:**
- `src/services/stats/buildTotemInventoryModel.ts`: `evalTriplePreparation` → `evalConsecutivePreparationStreak`. JSDoc updated to clarify the id retention. EVALUATORS map entry updated.

**W3 — A11y duplication removed:**
- `src/components/session/SetLogger.tsx`: dropped `aria-label` attribute from the warm-up `<input type="checkbox">`. The implicit `<label>` association via the visible `<span>` ("Warm-up") now names the control naturally for screen readers (consistent visible + accessible name).
- Removed now-unused `session.set_logger.warmup_toggle.aria_label` key from all three locale `common.json` files.

**W4 — Threshold constants extracted:**
- `src/services/stats/buildTotemInventoryModel.ts`: introduced `WARMUP_HABIT_SESSIONS = 10` and `PREPARATION_STREAK_REQUIRED = 5` named constants. Both evaluators now reference the constants instead of inline literals; `qualifying[9]` replaced with `qualifying[WARMUP_HABIT_SESSIONS - 1]`.

**Verification (final post-fix):**
- `npm run i18n:check` → ✅ 3 locales / 6 namespaces in parity
- `npm run lint` (`tsc --noEmit`) → ✅ 0 errors
- `npx vitest run` → ✅ 138/138 tests pass (no regression — tests reference only ids, not display copy)
- `npm run build` → ✅ success

**Outcome:** Phase E sub-phase E4a fully closed. All reviewer warnings resolved per user-locked decisions.

---

### 2026-05-07 — Step 16 Phase E sub-phase E4a review (warm-up family)

**Reviewer verdict:** PASS-WITH-NOTES. No blockers.

**Audit confirmed:**
- All 3 user-locked decisions correctly applied (volume/PR exclusion via strict `=== true` filter at 4 sites — `buildSessionExecutionModel.ts:190`, `statsAggregation.ts:102/140/195`; both totems shipped; thresholds 10/5).
- IDB v1→v2 migration safe (`oldVersion`-guarded blocks, additive optional field).
- Backward compatibility correct: existing rows with `isWarmup === undefined` fall through and count toward volume/PR.
- E1 selector picks up new totems with no code change (catalog + FAMILY_ORDER drive ranking).
- Family ordering invariant test passes; mirror constant in `totemInventoryShared.ts` updated.
- Scope minimal: every touched file has a clear E4a rationale (plumbing, family band CSS, fixture, renderer constants).
- i18n strict parity with idiomatic Catalan/Spanish copy (not transliterated).
- 138/138 tests green; lint 0 errors; build success; i18n parity.

**Warnings flagged (non-blocking):**
- **W1 — Totem name vs threshold dissonance.** Id `triple-preparation` and localized name "Triple preparation"/"Triple preparació"/"Triple preparación" imply 3, but rule + evaluator require 5. Rule body in all locales correctly says "5 sessions" — internal copy inconsistency. Surfaced to user for decision (rename to e.g. "Five-in-a-row preparation" / lower threshold to 3 / accept).
- **W2 — Function name `evalTriplePreparation` is misleading.** Same root cause as W1; internal naming only. Recommend rename to `evalConsecutivePreparationStreak` or extract `STREAK_REQUIRED = 5` constant.
- **W3 — A11y duplication on warm-up toggle.** `SetLogger.tsx:103-110` — `<input>` has both implicit `<label>` association (visible "Warm-up") and `aria-label` ("Mark this set as a warm-up"). `aria-label` overrides → screen readers announce the longer string. Both work; recommend dropping `aria-label` to let visible label name the control.
- **W4 — Magic numbers.** Thresholds inlined (`< 10`, `>= 5`, `qualifying[9]`). Extracting named constants would aid auditability. Style improvement, consistent with existing code.

**Info (no action required):**
- I1 — IDB migration test deferred (no jsdom IDB harness in repo). Backfill when E4d lands `planningAuditLog`.
- I2 — `exportImport.ts` v1→v2 deferred (forward-compatible since additive optional).
- I3 — `EVALUATOR_REGISTRY` vs `EVALUATORS` cosmetic identifier mismatch in task summary.
- I4 — `sessionHasWarmup` is O(N·M); fine for realistic history sizes.

**Outcome:** E4a closed pending user decision on W1+W2 naming dissonance. Whether to fix in this sub-phase or carry forward as a known issue is a user call.

---

### 2026-05-07 — Step 16 Phase E sub-phase E4a implementation (warm-up family)

**Scope:** First IDB schema bump (v1→v2, additive no-op), first `preparation` family entries in `TOTEM_CATALOG_V2`, per-set warm-up toggle in `SetLogger`, two new totems (`warm-up-habit` cumulative ≥10, `triple-preparation` streak ≥5). Warm-up sets are excluded from training-volume aggregation AND from PR / progression detection per user-locked decision.

**User-locked decisions applied:**
1. Warm-ups excluded from volume aggregation AND PR detection (`set.isWarmup === true` filtered out in HUD volume, weekly muscle volume, progression chart, and PR table).
2. Both totems shipped (`warm-up-habit` cumulative + `triple-preparation` streak).
3. Thresholds: `warm-up-habit` ≥ 10 qualifying sessions; `triple-preparation` = 5 consecutive qualifying sessions.

**Files modified:**
- [src/types/session.ts](src/types/session.ts) — added `ExecutedSet.isWarmup?: boolean` (additive optional).
- [src/services/db/database.ts](src/services/db/database.ts) — IDB version 1 → 2; `upgrade(db, oldVersion)` switch with `oldVersion < 1` baseline schema block and `oldVersion < 2` E4a no-op block (additive field needs no schema change).
- [src/stores/sessionStore.ts](src/stores/sessionStore.ts) — `logSet` signature extended to `(repsActual, weightActual?, isWarmup?)`; spreads `{ isWarmup: true }` onto the persisted `ExecutedSet` only when truthy (keeps stored rows minimal for non-warm-up sets).
- [src/components/session/SetLogger.tsx](src/components/session/SetLogger.tsx) — added warm-up checkbox toggle between weight input and complete-set CTA. Local `useState` (default `false`); resets after each logged set. `aria-label` from `common:session.set_logger.warmup_toggle.aria_label`. `onComplete` signature extended to forward `isWarmup`.
- [src/components/session/RetroLevelRun.tsx](src/components/session/RetroLevelRun.tsx) — `SessionExecutionActions.logSet` signature extended; `onComplete` callback forwards `isWarmup`.
- [src/components/session/ClassicSessionCards.tsx](src/components/session/ClassicSessionCards.tsx) — same signature/forwarding change as retro variant (strict parity).
- [src/services/session/buildSessionExecutionModel.ts](src/services/session/buildSessionExecutionModel.ts) — `computeHud` skips warm-up sets when summing `volumeKg` (RPE mean kept on all logged sets — RPE is a self-report independent of work-set classification).
- [src/services/stats/statsAggregation.ts](src/services/stats/statsAggregation.ts) — `aggregateVolume` (weekly muscle volume), `aggregateProgression` (per-exercise weight/volume series), and `aggregatePRs` (PR table) all filter out `isWarmup === true` sets.
- [src/services/stats/buildTotemInventoryModel.ts](src/services/stats/buildTotemInventoryModel.ts) — extended `TotemId` union with `'warm-up-habit'` + `'triple-preparation'`; extended `TotemFamily` union with `'preparation'`; appended both entries inside the new `preparation` band of `TOTEM_CATALOG_V2` (between `five-deloads-honored` and `rpe-awareness`); added exported `FAMILY_ORDER = ['consistency','recovery','preparation','reflection']`; added private `sessionHasWarmup` helper + `evalWarmupHabit` (10th qualifying-session date) + `evalTriplePreparation` (5th-of-streak date); registered both in `EVALUATORS`.
- [src/components/stats/totemInventoryShared.ts](src/components/stats/totemInventoryShared.ts) — extended `FAMILY_ORDER` and `FAMILY_VAR` to include `preparation` (renderers automatically pick up the new family band).
- [src/index.css](src/index.css) — added `--theme-stats-family-preparation: var(--theme-dashboard-week-accent-2, #c4b5fd)` token (violet-300, distinct from the other 3 family motifs; reused dashboard week-accent-2 to keep the visual vocabulary).
- [src/i18n/locales/{ca,es,en}/stats.json](src/i18n/locales/en/stats.json) — added `totem.family.preparation`, `totem.warm_up_habit.{name,rule}`, `totem.triple_preparation.{name,rule}` (3 locales × 5 keys = 15 strings).
- [src/i18n/locales/{ca,es,en}/common.json](src/i18n/locales/en/common.json) — added nested `session.set_logger.warmup_toggle.{label,aria_label}` (3 locales × 2 keys = 6 strings).

**Tests added/changed:**
- [src/services/stats/buildTotemInventoryModel.test.ts](src/services/stats/buildTotemInventoryModel.test.ts) — updated catalog count assertion (V1 + 3); new `Phase E4a — preparation family` describe block with 8 tests covering family-band ordering invariant, `warm-up-habit` 9/10/mixed cases, `triple-preparation` 4/5/broken/6 cases.
- [src/services/session/buildSessionExecutionModel.test.ts](src/services/session/buildSessionExecutionModel.test.ts) — added `excludes warm-up sets from volumeKg (Phase E4a)` test (2 warm-up + 3 work sets → volume 1400, count 5).
- SetLogger render test deferred — there is no existing SetLogger.test.tsx in the repo (per user instructions: "only if SetLogger has existing tests; if none, defer").
- IDB migration test deferred — there is no existing jsdom IDB test harness; the additive-optional shape is exercised implicitly by every selector that filters `isWarmup === true`.

**Test counts:** 129 → 138 (+9 = 8 new totem tests + 1 new volume-filter test). All 25 test files pass.

**Verification (final, all four gates green):**
- `npm run i18n:check` → ✅ exit 0 (3 locales / 6 namespaces in parity)
- `npm run lint` (`tsc --noEmit`) → ✅ exit 0 (after adding `preparation` to `FAMILY_VAR` map to satisfy `Record<TotemFamily, string>` exhaustiveness)
- `npx vitest run` → ✅ exit 0, 138/138 tests pass across 25 files
- `npm run build` → ✅ exit 0, dist generated, PWA precache 7 entries / 1379.95 KiB

**Deviations from the user-approved plan:**
1. `exportImport.ts` version bump (E4a.8) **deferred** — not in user-locked scope and the additive-optional `isWarmup` field is forward-compatible: a v1 export round-tripped through v2 import (and vice versa) preserves all data; older records read as `isWarmup === undefined` → naturally classified as work-sets. Recorded as **DEFERRED** in [tasks/todo.md](tasks/todo.md).
2. PR detection — repo has no dedicated 1RM/personal-record service; PR semantics live in `aggregatePRs` + `aggregateProgression` (statsAggregation). Both received the warm-up filter with inline `// Warm-ups excluded per Phase E4a` comments. No "PR system" was invented.
3. SetLogger render test — no pre-existing `SetLogger.test.tsx` in repo, so the toggle UI is exercised indirectly via the parent renderer tests (which still pass post-edit). Followed user instruction "if none, defer".
4. IDB migration test — no existing jsdom IDB harness in `src/services/db/`; deferred per the same "additive-only schema, no behavioral migration code" rationale.

**Out of scope (preserved):** `MUSCLE_COLORS`, `planningAuditLog`, `painFlag`, `isPlannedRestDay`, recovery indicator, Rive wrapper, chart theming surfaces, dashboard map, planning surfaces. Zero new IDB stores. Zero `console.*` calls added.

**Outcome:** Phase E sub-phase E4a closed. Locked Phase E order is now: E4g ✅ → E1 ✅ → E3 ✅ → E4a ✅ → E4f → E4b → E4c → E4d → E2 (E4e moved to Phase F).

---

### 2026-05-07 — Step 16 Phase E sub-phase E4a pre-execution mini-gate (warm-up family)

**Scope:** First IDB schema bump (v1→v2, additive no-op), first `preparation` family entry in `TOTEM_CATALOG_V2`, per-set warm-up toggle in `SetLogger`, two new totems (`warm-up-habit`, `triple-preparation`).

**Architect mini-gate:** 🟡 GO (conditional). Source-verified:
- `FAMILY_ORDER` currently `['consistency','recovery','reflection']`; spec mandates insertion at index 2 → `['consistency','recovery','preparation','reflection']`.
- `TOTEM_CATALOG_V2` shape (E4g pattern) reusable; new entries appended in preparation band between `five-deloads-honored` (recovery) and `rpe-awareness` (reflection).
- IDB at version 1 in [src/services/db/database.ts](src/services/db/database.ts); bump to 2 with `oldVersion`-guarded upgrade and explicit no-op block for E4a.
- `SetLogger` has clean insertion point between weight input and complete-set CTA; `logSet` signature extended to `(reps, weight?, isWarmup?)`; default false on absence (back-compat).
- E1 selector `buildSessionCompletionTotemPayload` requires no code change — diff + ordering rules pick up new totems automatically once `FAMILY_ORDER` and catalog are extended.
- Volume aggregator at `buildSessionExecutionModel.ts:185-190` currently includes warm-up sets — flagged as Open Question.

**Open questions surfaced to user:**
1. Volume aggregator: include or exclude warm-up sets? (Architect recommends exclude — truthful-UX bias; expands manifest by ~3 files.)
2. Ship one totem or two? (Architect recommends both per spec — same primitive.)

**Out-of-scope guardrails restated:** no `planningAuditLog` (E4d), no `painFlag` (E4b), no `isPlannedRestDay` (E4f), no `MUSCLE_COLORS` change.

**Verdict:** GO pending Q1/Q2 answers before implementer dispatch.

---

### 2026-05-07 — Step 16 Phase E sub-phase E3 implementation (chart variant theming)

**Scope:** Lift the Phase D chart scope-lock with a wrapper-only theming layer for the three analytics charts (`VolumeChart`, `ProgressionChart`, `AdherenceChart`). Strict variant parity (retro-platformer ↔ classic-boring) with retro-only pixel-font on axis ticks and legend, system font everywhere else.

**Architect mini-gate:** GO. Hex tokens + AA audit ratios pre-cleared:
- Classic axis-fg `#64748b` vs `#ffffff` ≈ 4.82:1 (AA pass)
- Retro axis-fg `#1f2937` vs `#ffffff` ≈ 12.63:1 (AAA pass)
- Retro tooltip-fg `#0f172a` on tooltip-bg `#fef3c7` ≈ 17.4:1 (AAA pass)

**Implementation:**
- NEW [src/components/stats/ChartThemeProvider.tsx](src/components/stats/ChartThemeProvider.tsx) — variant-aware wrapper. Reads `useEffectiveAestheticVariant` (collapses to classic under reduced-motion) + `usePrefersReducedMotion`. Exposes `useChartTheme()` returning `{ isAnimationActive }`. Retro branch injects 11 CSS vars inline on a wrapper `<div>`. Classic branch relies on `:root` defaults.
- MODIFIED [src/index.css](src/index.css) — declared 11 classic-default `--theme-charts-*` tokens at `:root` scope (`axis-fg`, `grid`, `tooltip-bg`, `tooltip-fg`, `legend-fg`, `series-1..6`).
- MODIFIED [src/components/stats/VolumeChart.tsx](src/components/stats/VolumeChart.tsx), [ProgressionChart.tsx](src/components/stats/ProgressionChart.tsx), [AdherenceChart.tsx](src/components/stats/AdherenceChart.tsx) — axis ticks/stroke, `<CartesianGrid>`, `<Tooltip>` (with `fontFamily: 'inherit'` on `contentStyle`/`labelStyle`/`itemStyle`), and `<Legend>` wrapper now consume `--theme-charts-*` tokens. ProgressionChart series-1/2 + AdherenceChart series-3/1 use token vars. **VolumeChart `MUSCLE_COLORS` intentionally unchanged** (data identity per architect decision). All series read `isAnimationActive` from `useChartTheme()` and pass to `<Area>`/`<Line>`/`<Bar>`.
- MODIFIED [src/pages/Stats.tsx](src/pages/Stats.tsx) — wraps each of the three charts in `<ChartThemeProvider>`. PR table + export/import sections deliberately NOT wrapped.
- NEW tests:
  - [src/components/stats/ChartThemeProvider.test.tsx](src/components/stats/ChartThemeProvider.test.tsx) — classic vs retro CSS-var injection, reduced-motion `isAnimationActive=false`, reduced-motion+retro collapse to classic.
  - [src/components/stats/VolumeChart.test.tsx](src/components/stats/VolumeChart.test.tsx), [ProgressionChart.test.tsx](src/components/stats/ProgressionChart.test.tsx), [AdherenceChart.test.tsx](src/components/stats/AdherenceChart.test.tsx) — per-chart parity guards with `vi.mock('recharts', ...)` stubbing `ResponsiveContainer` to fixed 600×300 via `cloneElement` + typed cast.
  - [src/utils/contrast.test.ts](src/utils/contrast.test.ts) — inline WCAG 2.1 contrast helper + 6-ratio AA audit (all pass ≥ 4.5).

**Test-side adaptations:**
- AdherenceChart bar `<path>` rectangles render in jsdom but Recharts swallows the `fill` attribute on inactive bars (no layout/animation lifecycle), so `AdherenceChart.test.tsx` asserts series-3/series-1 fills via `path.recharts-legend-icon` (legend swatches do carry the resolved `fill="var(--theme-charts-series-N)"`). Inline comment in test explains the rationale. Reviewer flagged as W1 (coverage gap, non-blocking).
- Mock pattern uses `React.cloneElement(children as React.ReactElement<{ width?: number; height?: number }>, { width: 600, height: 300 })` to satisfy TS.

**Verification (final):**
- `npm run i18n:check` → ✅ 3 locales / 6 namespaces in parity (no copy added in E3)
- `npm run lint` (`tsc --noEmit`) → ✅ 0 errors
- `npx vitest run` → ✅ **129/129 tests pass** (was 113 pre-E3, +16 from E3: 4 ChartThemeProvider + 2 each VolumeChart/ProgressionChart/AdherenceChart + 6 contrast)
- `npm run build` → ✅ success

**Reviewer verdict:** PASS-WITH-NOTES (B1 — STATUS docs not yet updated — addressed in this commit). Warnings:
- W1 — Bar `fill` parity asserted via legend-icon proxy; recommend strengthening to actual bar `<path>` fills in a future pass (non-blocking; legend swatches do prove token wiring is correct).
- W2 — Spec phrase "axis fg vs grid bg ≥ 4.5:1" interpreted as card-bg `#ffffff` (the actual surface behind chart text), not grid-line color. Architect to confirm spec wording later.
- I1/I2/I3 — minor: double `matchMedia` read (behaviorally identical), `as string` cast pattern matches Phase B/C precedents, comment ratio `4.55:1` for `#64748b` vs `#ffffff` slightly off (actual ≈ 4.82, still ≥ 4.5).

**Out of scope (preserved):** PR table, export/import, dashboard, session, planning, MUSCLE_COLORS, Recharts version, i18n locale files. Zero new IDB stores. Zero copy added.

**Outcome:** Phase E sub-phase E3 closed. Locked Phase E order is now: E4g ✅ → E1 ✅ → E3 ✅ → E4a → E4f → E4b → E4c → E4d → E2 (E4e moved to Phase F).

---

### 2026-05-07 — Step 16 Phase E sub-phase E1 W4+W5 follow-up

Closes the two non-blocking warnings flagged on the previous E1 fix pass.
`tasks/todo.md` and `specs/STATUS.md` E1 boxes stay checked. No spec
changes, no i18n copy changes.

- **W4 (history-load race flicker).** The ack frame is now gated on a new
  `historyLoaded: boolean` local in [src/pages/Session.tsx](src/pages/Session.tsx).
  The `useEffect` that lazy-loads `listAllSessions()` + `listAllSets()` on
  the `isFinished` flip flips `historyLoaded` to `true` only AFTER both
  setters resolve, and back to `false` when `isFinished` returns to
  `false`. The `totemAckPayload` `useMemo` now early-returns `null` until
  `historyLoaded === true`, so returning users no longer see entry-tier
  totems (`first-session`, etc.) flicker as false-positive newly earned
  during the ~10–50 ms IDB fetch window.
- **W5 (synthesized completedAt = midnight UTC).** Added new state field
  `lastFinishedSessionCompletedAtISO: string | null` to
  [src/stores/sessionStore.ts](src/stores/sessionStore.ts), minted alongside
  `lastFinishedSessionId` inside `buildFinishMeta()` (covers `logSet`,
  `skipSet`, `finishEarly`) and again at end of `finishSession`, cleared
  in `reset()`. Re-exported via [src/hooks/useSession.ts](src/hooks/useSession.ts).
  `Session.tsx` now uses it as the synthesized session's `completedAt`,
  with the previous midnight-UTC string kept only as a defensive
  fallback. Future time-of-day evaluators get the actual mint moment.
- **Tests.** +1 file (`src/stores/sessionStore.test.ts`, 3 tests covering
  initial null, mint on flip, reset clear) + 2 W4 contract tests appended
  to [src/services/session/buildSessionCompletionTotemPayload.test.ts](src/services/session/buildSessionCompletionTotemPayload.test.ts).
  Total: 113 tests across 20 files (was 108 / 19).
- **Verification (all exit 0).** `npm run i18n:check` → OK 3 locales /
  6 namespaces. `npm run lint` → 0 errors. `npx vitest run` → 113 passed.
  `npm run build` → 0 errors, PWA precache 7 entries / 1373.64 KiB.

### 2026-05-04 — Step 16 Phase E sub-phase E1 fix pass (N1 timing + W1 tokens + W3 parity)

Reviewer raised a REJECT verdict on the initial E1 pass. Fix pass below;
`tasks/todo.md` and `specs/STATUS.md` E1 boxes stay checked. No spec changes.

**N1 — Earn-acknowledgement frame never displayed in production (lifecycle).**
Two coupled defects fixed together:

1. `lastFinishedSessionId` / `lastFinishedSessionDateISO` were only minted
   inside `finishSession()` (i.e. after the user tapped Save & close, which
   was immediately followed by `reset()` + `navigate('/dashboard')`). The
   ack frame therefore never had a chance to render with a non-null payload.
   Fix in `src/stores/sessionStore.ts`: introduced a private `buildFinishMeta()`
   helper that mints `pendingSessionDraft` + `lastFinishedSessionId` +
   `lastFinishedSessionDateISO` together at the moment `isFinished` flips.
   Helper is spread into the `set()` payload for the auto-finish branch of
   `logSet`, the auto-finish branch of `skipSet`, and `finishEarly`. The
   subsequent `finishSession()` reuses the existing draft so the persisted
   IDB row carries the same id the ack frame keyed off — no duplicate row,
   no id drift. `reset()` clears them back to `null` (unchanged).
2. `useEffect([isFinished, …])` in `Session.tsx` lazy-loads
   `allSessionsHistory` from IDB on the `isFinished` flip; at that instant
   the just-finished session is NOT yet persisted, so `totemsAfter` would
   still equal `totemsBefore`. Fix in `src/pages/Session.tsx`: synthesize an
   in-memory `ExecutedSession` from the live store state
   (`lastFinishedSessionId`, `lastFinishedSessionDateISO`, `generatedSession`,
   `sessionStartedAt`, `executedSets`) and merge it into the inputs of
   `buildTotemInventoryModel` for `totemsAfter` only. `totemsBefore` keeps
   the existing filter-by-id approach (no-op while the session is not in
   history yet, but still correct). Per-set `rpe` is preserved on the
   spread, so the V1 `evalRpeAwareness` evaluator sees the same data the
   eventually-persisted row will carry.

**W1 — undeclared CSS tokens in `EarnAcknowledgement.tsx`.** The retro
variant previously referenced `--theme-game-session-frame-{bg,border,fg}`
and `--theme-game-display-font`, none of which are declared in
`src/index.css`. Replaced with the existing Phase C retro tokens already
used by `RetroLevelRun` / `SessionHudReadouts`:
`--theme-game-session-checkpoint` (surface),
`--theme-game-session-platform` (border),
`--theme-session-hud-fg` (foreground). Display font reuses Tailwind
`font-mono` — the same convention as `RetroLevelRun`'s level-clear stamp,
so no new CSS variable was introduced (avoids growing the namespace for a
single component). Token grep confirms all three are declared in
`src/index.css`. Comment block at the head of `RetroEarnAcknowledgement`
documents the reuse rationale.

**W3 — strengthened render-parity test.** Added a new nested
`describe('key-isolation parity (W3)', …)` block in
`src/components/session/EarnAcknowledgement.test.tsx` (two tests, sentinel-key
approach via `vi.spyOn(i18next, 't')`). Each test asserts: (a) at least one
`session.completion.totem_ack.*` key was resolved in that variant, (b) every
resolved key includes the variant's segment (`.calm.` for classic, `.retro.`
for retro), and (c) zero keys include the opposite variant's segment. This
catches accidental cross-variant key resolution even if the rendered copy
between variants happens to share substrings in future translations. All
five pre-existing tests preserved as-is (no coverage weakening).

**Out of scope (per task constraints):** `<SessionSummary>` slot prop wiring,
`buildSessionCompletionTotemPayload` selector logic (only added the N1
regression-guard test), `<EarnAcknowledgement>` variant routing, Phase A/B/C/D
code, IDB schema, `exportImport`, type files. None of these were modified.

**N1 regression guard test.** Added a fresh
`describe('Regression N1 — synthesized in-memory session unlocks totems
pre-persist', …)` block in
`src/services/session/buildSessionCompletionTotemPayload.test.ts`. The test
constructs two `TotemInventoryModel` snapshots manually: `totemsBefore` from
empty history and `totemsAfter` from the synthesized just-finished session
alone. Asserts that the selector emits a non-null payload with
`primaryTotemId === 'first-session'` (the V1 catalog automatically unlocks
the consistency-family entry-tier totem on the very first session) and that
`sessionId` / `earnedDateISO` round-trip. Avoids mounting `<Session>` so the
test stays fast and decoupled from page-level effects.

**Files modified (fix pass):**
- `src/stores/sessionStore.ts` — added `buildFinishMeta()` helper; spread
  into `logSet` (auto-finish branch), `skipSet` (auto-finish branch), and
  `finishEarly`; `finishSession` now reuses the draft id when minting the
  IDB row.
- `src/pages/Session.tsx` — synthesized just-finished `ExecutedSession`
  merged into `totemsAfter` inputs; added `lastFinishedSessionDateISO` /
  `lastFinishedSessionId` consumption via `useSession`.
- `src/components/session/EarnAcknowledgement.tsx` — retro variant
  re-pointed at existing Phase C tokens + Tailwind `font-mono`; added
  `// TODO(E2): Rive autoplay hook will fire here on first-show per session.`
  immediately above the `useRef` latch line (W2 informational fix).
- `src/components/session/EarnAcknowledgement.test.tsx` — appended
  W3 key-isolation parity describe block (2 new tests).
- `src/services/session/buildSessionCompletionTotemPayload.test.ts` —
  appended N1 regression-guard describe block (1 new test).

**Test counts.** Before fix pass: 105 tests across 19 files (per the initial
E1 implementation entry). After fix pass: **108 tests across 19 files** (+3:
two W3 parity tests in `EarnAcknowledgement.test.tsx`, one N1 regression
guard in `buildSessionCompletionTotemPayload.test.ts`). The
`EarnAcknowledgement` file now reports 7 tests (was 5); the
`buildSessionCompletionTotemPayload` file now reports 7 tests (was 6).

**Verification (all exit 0):**

- `npm run i18n:check` — 3 locales × 6 namespaces in parity (`EXIT=0`).
- `npm run lint` — `tsc --noEmit` clean (`EXIT=0`).
- `npx vitest run` — 19 files / 108 tests passing (`EXIT=0`).
- `npm run build` — Vite + PWA build succeeded (`EXIT=0`).

**Constraints honored:** named exports only, ca/es/en strict parity, no
`console.warn` / `console.error`, no `<dialog>` / `role="dialog"` /
`aria-modal`, no Phase A/B/C/D regressions, no schema/type/exportImport
changes, real `ExecutedSession` shape (per `src/types/session.ts`) used for
the synthesized record (no invented fields).

---

### 2026-05-04 — Step 16 Phase E sub-phase E1 implementation (earn-acknowledgement frame)

Shipped the inline earn-acknowledgement frame surfaced after a session is
finished. Architect-confirmed deviations applied:

1. Mount point is `<SessionSummary>` via a new optional `topAccessory?: ReactNode`
   prop, injected from `Session.tsx`'s `if (isFinished)` early-return branch.
   `<SessionExecution>` is unmounted in the finished state in production, so the
   ack must live on the summary tree rather than inside the execution router.
2. No `SessionCompletionModel` extension. The payload is derived by a stand-alone
   pure selector `buildSessionCompletionTotemPayload({ totemsBefore, totemsAfter,
   sessionId, dateISO })` and passed in as a prop alongside pre-localized
   `primaryName` / `secondaryNames`.

**Files added:**

- `src/services/session/buildSessionCompletionTotemPayload.ts` — pure selector
  that diffs `TotemInventoryModel` snapshots and emits the ordered newly-earned
  list (sorted by `FAMILY_ORDER` then `TOTEM_CATALOG_V2` index). Returns `null`
  when zero new totems were earned.
- `src/services/session/buildSessionCompletionTotemPayload.test.ts` — six
  vitest cases: zero-new (states equal), zero-new (no earned in either),
  single-new echo of `sessionId`/`dateISO`, multi-family ordering by
  `FAMILY_ORDER`, intra-family ordering by V2 catalog index, and the
  defensive `null` for the impossible "after missing a before" case.
- `src/components/session/EarnAcknowledgement.tsx` — variant router using
  `useEffectiveAestheticVariant()`. Emits `null` when the payload is `null`
  (no shame copy on zero-new). Internal `RetroEarnAcknowledgement` /
  `ClassicEarnAcknowledgement` subcomponents share **no** i18n key tree:
  classic reads only `session.completion.totem_ack.calm.*` and retro reads
  only `session.completion.totem_ack.retro.*`. NEVER renders a `<dialog>`,
  `role="dialog"`, `role="alertdialog"`, or `aria-modal`. A `useRef` latched
  on `payload.sessionId` reserves the autoplay slot for the E2 Rive flash.
- `src/components/session/EarnAcknowledgement.test.tsx` — five RTL cases:
  null payload renders nothing; classic renders calm copy and never mounts a
  dialog; retro renders pixel copy and never mounts a dialog; multi-totem
  renders one frame with primary + `also_earned` line; idempotent re-render
  with the same payload produces identical output.

**Files modified:**

- `src/components/session/SessionSummary.tsx` — added optional
  `topAccessory?: ReactNode` slot rendered between the summary numbers card
  and the RPE/notes card. Default `undefined` preserves the pre-E1 layout.
- `src/stores/sessionStore.ts` — exposed `lastFinishedSessionId` and
  `lastFinishedSessionDateISO` on the public state. They are populated on
  `finishSession` success (derived from the existing draft cache) and
  cleared by `reset`.
- `src/hooks/useSession.ts` — re-exports the two new selectors via the
  shared shallow group.
- `src/pages/Session.tsx` — finished branch now lazy-loads the full
  `listAllSessions`/`listAllSets` history (and ensures `activeMesocycle` is
  loaded), builds `totemsBefore` (history minus the just-finished session)
  and `totemsAfter` (full history) via `buildTotemInventoryModel`, computes
  the payload, resolves the localized `primaryName` / `secondaryNames`, and
  passes them through to `<SessionSummary topAccessory={...}>`. Pre-start,
  in-progress, and error branches are unchanged.
- `src/i18n/locales/{en,ca,es}/common.json` — added
  `session.completion.totem_ack.{calm,retro}.{headline,body,also_earned}`
  in strict ca/es/en parity (`npm run i18n:check` exits 0).

**Verification (all exit 0):**

- `npm run i18n:check` — 3 locales × 6 namespaces in parity
- `npm run lint` — `tsc --noEmit` clean
- `npx vitest run` — 105 tests passing across 19 files (was 94 / 17; +11
  tests across 2 new files)
- `npm run build` — Vite + PWA build succeeded

---

### 2026-05-04 — Step 16 Phase E sub-phase E4g implementation (`five-deloads-honored`)

Implemented the deload-family expansion totem (evaluator-only, no schema or capture-UI changes).

**Files modified:**
- `src/services/stats/buildTotemInventoryModel.ts` — extended `TotemId` with `'five-deloads-honored'`; added `TOTEM_CATALOG_V2` (V1 stays frozen, inserts the new entry inside the recovery family band to preserve canonical Consistency → Recovery → Reflection ordering); added `evalFiveDeloadsHonored` evaluator (mirrors `evalFirstDeloadHonored`'s template lookup, then aggregates earliest completion date per ISO-week ordinal via existing `isoWeekOrdinal` / `completedSessionsSorted` helpers, returns earliest date in the 5th distinct deload week chronologically); selector now maps over `TOTEM_CATALOG_V2`.
- `src/services/stats/buildTotemInventoryModel.test.ts` — added `describe('five-deloads-honored', …)` with 4 cases (5 distinct weeks → earned on tipping date; 4 weeks → available; all 5 sessions in same ISO week → available; 5 weeks across 2 mesocycles → earned) plus `describe('catalog ordering invariant (V2)', …)` (V1 ids preserved, new totem inside recovery band, count == V1 + 1). Existing V1 catalog-equality assertion updated to V2. Selector test count: 18 → 24.
- `src/components/stats/__fixtures__/totemFixture.ts` — switched fixture from `TOTEM_CATALOG_V1` to `TOTEM_CATALOG_V2` so the existing render parity tests in `RetroInventoryShelf.test.tsx` and `ClassicTotemGrid.test.tsx` automatically iterate the new totem (same earned/available branches, same `useEarnedOnLabel` + `aria-describedby` plumbing — no per-totem assertions needed).
- `src/i18n/locales/{en,ca,es}/stats.json` — inserted `totem.five_deloads_honored.{name,rule}` after `first_deload_honored` (English: "Five Deloads Honored"; Catalan: "Cinc Descàrrecs Honrats"; Spanish: "Cinco Descargas Honradas").
- `specs/STATUS.md`, `tasks/todo.md` — E4g items marked complete.

**Verification:** `npm run i18n:check` ✅ · `npm run lint` ✅ · `npm test` ✅ (94 unit tests + 3 ingestion) · `npm run build` ✅.

**Out of scope (per architect mini-gate):** no `src/types/**` changes, no IDB schema/migration, no export/import touch, no capture UI, no `FAMILY_ORDER` change, no dashboard touch, no `isDeloadSession` change, no Phase A/B/C/D file edits.

---

### 2026-05-04 — Step 16 Phase E pre-execution gates

Architect pass for Step 16 **Phase E** (final polish: earn-acknowledgement frame, Rive microanims, chart variant theming, all deferred totems). Phase A/B/C/D confirmed ✅ via `specs/STATUS.md`.

**Spec patches applied to `specs/features/16-ethical-gamification.md`:**
1. Phase D scope-lock for analytics charts **lifted** (Phase D §"Scope Lock" annotated; Phase E3 explicitly re-skins `VolumeChart`, `ProgressionChart`, `AdherenceChart`; PR table + export/import remain variant-agnostic).
2. "Zero new IDB stores" constraint **scoped to Phase A–D** (Shared Gamification Core bullet annotated; Phase E lifts it for `planningAuditLog` and three additive optional fields, all shared core / variant-agnostic).
3. New additive subsection **"Phase E Shared Contracts (Polish + Deferred Totems)"** appended right before `### Variant: Retro Platformer`. Covers:
   - E1 — `SessionCompletionTotemPayload` selector + `<EarnAcknowledgement>` renderer contract; max one inline frame per session-end; null on zero-earn (no shame); strict parity render-test contract.
   - E2 — `<RiveAnim>` wrapper contract: lazy-loaded `@rive-app/react-canvas` (~210KB) for retro only; static fallback when `prefers-reduced-motion` OR variant !== retro; mandatory adjacent `*.LICENSE.md` per `.riv` (CI grep guard); v1 anim list (`totem-earn`, `level-clear`, `dashboard-cell-appear`) flagged community-vs-custom.
   - E3 — `<ChartThemeProvider>` wrapper injecting `--theme-charts-*` (shared) + `--theme-game-charts-*` (retro-only) via CSS variables; pixel font restricted to axis ticks + legend (NEVER tooltip body / data labels) for readability; AA contrast audit required.
   - E4 — sub-divided by family (E4a warm-up, E4b pain-flag, E4c notes, E4d audit-trail, E4e recovery-read **DEFERRED to Phase F**, E4f rest-day, E4g deload-expansion). Schema migration baseline: IDB v1→v2, additive `planningAuditLog` store, three optional fields on existing record types, no destructive changes; export format v1→v2 with backward-compat import.
   - `TOTEM_CATALOG_V2` additive extension of V1; potential `TotemFamily` union extension to add `'preparation'`.
   - Phase E forbidden renderings (additive to Phase D's list).

**UI/UX gate decisions per sub-phase:**

| Sub-phase | Decision | Rationale |
|---|---|---|
| E1 | INCREMENTAL with shared adapter | Extend existing `SessionCompletionModel`; no IA change |
| E2 | INCREMENTAL (additive primitive) | Single `<RiveAnim>` wrapper, retro-only consumers, lazy-loaded |
| E3 | INCREMENTAL with shared adapter | `<ChartThemeProvider>` wraps existing chart components; no fork |
| E4a–g | INCREMENTAL per family | `TOTEM_CATALOG_V2` appends to V1; selector grows branches; capture UIs are local optional inputs |

**Behavioral risk brief (condensed):**
- E1 medium (spam/popup-creep/FOMO) → max 1 inline ack per session-end; null on zero-earn.
- E2 high (motion-sickness, license violations) → wrapper short-circuits on reduced-motion + classic; mandatory `*.LICENSE.md` adjacent per `.riv`.
- E3 medium (readability, AA contrast) → pixel font restricted to axis/legend; AA audit gate.
- E4a medium (warm-up compliance theater) → optional toggle, no shame copy.
- E4b high (shame on pain flag) → totem rewards *act of flagging+adjusting*, never mentions pain in name/copy; no aggregated pain-history surface.
- E4c low → any non-empty note qualifies.
- E4d medium (audit-log bloat) → 365-day retention pruning on app start; dedup per (mesocycle, template, day, type); no user-facing log surface.
- E4e blocked on Phase F → recovery indicator unimplemented in `src/` (verified by grep `recoveryIndicator|recoveryState|RecoveryState|recoveryHint` → 0 matches).
- E4f, E4g low.

**Recovery indicator codebase verification:** confirmed not implemented. New **Phase F — Recovery Indicator (volume-based)** is required as prerequisite to E4e; Phase F implements the existing §"Volume-Based Recovery Estimation" spec section (selector, capture point, advisory surfacing, transparency doc). E4e's `recovery-read` totem ships in Phase F, not Phase E.

**Recommended sub-phase order (easiest → biggest unknown):** E4g → E1 → E3 → E4a → E4f → E4b → E4c → E4d → E2 → (Phase F) → E4e. Each sub-phase runs its own architect pre-execution mini-gate, implementer pass, reviewer pass, and warnings-fix cycle.

**No source code modified.** Deliverables are spec patches + plan; implementer passes to follow per sub-phase.

### 2026-05-04 — Step 16 Phase D implementation

Implementer pass closing out the D1–D11 checklist for Phase D (Stats / Inventory parity: `RetroInventoryShelf` + `ClassicTotemGrid` ship together off the same `TotemInventoryModel`). Strict parity from day one; no new IDB; no new telemetry; no `matchMedia` outside Phase A hooks; ca/es/en parity; named exports only.

**Files created:**
- `src/services/stats/buildTotemInventoryModel.ts` (D3) — pure deterministic selector, `TOTEM_CATALOG_V1` (8 entries: `first_session`, `first_week`, `three_weeks_present`, `eight_week_rhythm`, `return_after_break`, `first_mesocycle_complete`, `first_deload_honored`, `rpe_awareness`), grouped by family (Consistency → Recovery → Reflection), `nowMs` injected.
- `src/services/stats/buildTotemInventoryModel.test.ts` (D4) — eligibility edges, ordering invariant, `nowMs` determinism.
- `src/components/stats/totemInventoryShared.ts` — shared a11y/copy/aria helpers consumed by both renderers off the same model.
- `src/components/stats/RetroInventoryShelf.tsx` (D5) — pixel-art shelf, unexplored-terrain treatment for unearned totems, inline non-modal inspect, optional pickup chime via `statsAudio.playTotemInspect()`.
- `src/components/stats/ClassicTotemGrid.tsx` (D6) — responsive card grid, family stripe, "What can I earn?" disclosure for unearned, no `<audio>` mount, no `statsAudio` import.
- `src/components/stats/TotemInventory.tsx` (D7) — variant router via `useEffectiveAestheticVariant()`.
- `src/components/stats/RetroInventoryShelf.test.tsx`, `src/components/stats/ClassicTotemGrid.test.tsx`, `src/components/stats/TotemInventory.test.tsx` (D10) — per-renderer + cross-variant parity tests with forbidden-rendering guards (no streak counter, no locked silhouettes for available totems, no time-window selector inside totem section, no peer comparison, no rarity tiers).
- `src/services/audio/statsAudio.ts` (D9) — single-fire `playTotemInspect()`, gated on effective variant; mirrors `sessionAudio` structure.
- `src/services/audio/statsAudio.test.ts` (D9) — variant gating + single-fire latch + re-arm after `resetTotemInspect()`.

**Files modified:**
- `src/pages/Stats.tsx` (D8) — inserted `<TotemInventory>` section between the period selector and `VolumeChart`, fed by `buildTotemInventoryModel({ executedSessions, executedSets, mesocycles, nowMs })` over the FULL history (totems are cumulative; period selector still scopes only the analytics sections). Memoized on `[allSessions, allSets, activeMesocycle]`.
- `src/index.css` (D1) — added `--theme-stats-*` shared tokens (totem-state colors with NO red, family motif colors reusing dashboard week-accent palette, slot bg, empty-state muted, inspect-panel surface) and retro-only `--theme-game-stats-*` (shelf bg, slot border thickness, sprite scale, pickup-chime envelope params).
- `src/i18n/locales/{ca,es,en}/stats.json` (D2) — new `totem.*` keys (`section_title`, `family.*`, `state.*`, `aria`, `empty.calm`, `reachable_link`, `earned_on`, plus per-totem `<id>.name` + `<id>.rule` for the eight catalog entries) — verified by `npm run i18n:check`.
- `src/services/audio/statsAudio.ts` + `src/services/audio/statsAudio.test.ts` (post-impl fix) — Option B applied: added a non-barrel-exported `__resetStatsAudioForTests()` that clears both the single-fire latch AND the cached `AudioContext`. Production `resetTotemInspect()` keeps cache-preservation semantics (no resource churn between inspect-opens within a Stats session). Test `beforeEach`/`afterEach` now call `__resetStatsAudioForTests()` so the cached mock context from a prior test does not leak into the next, fixing the `re-arms after resetTotemInspect` failure (`createOscillator` undefined access). All 86 unit tests pass.

**Final test count:** `Test Files  17 passed (17)` / `Tests  86 passed (86)` (vitest) plus 3/3 in `test:ingestion`.

**D11 grep guard results** (`src/components/stats/ClassicTotemGrid.tsx`):
- `grep -n -- '--theme-game-stats' src/components/stats/ClassicTotemGrid.tsx` → 1 match on line 37, **inside the file's contract doc-comment block** (`"This renderer NEVER reads any --theme-game-stats-* token (verified by D11 grep guard)"`). No production code matches. Acceptable per spec ("0 matches excluding doc comments").
- `grep -n 'statsAudio' src/components/stats/ClassicTotemGrid.tsx` → 1 match on line 38, same doc-comment block (`"NEVER imports / calls statsAudio"`). No `import` and no call site. Acceptable per spec.

**Verification gates — last 3 lines each:**

`npm run i18n:check`:
```
> tsx scripts/checkI18nParity.ts

[i18n:check] OK — 3 locales, 6 namespaces in parity.
```

`npm run lint`:
```
> the-strength-period@0.1.0 lint
> tsc --noEmit
```
(zero output ⇒ zero TypeScript errors)

`npm run build`:
```
files generated
  dist/sw.js
  dist/workbox-cee25bd0.js
```

`npm test`:
```
 Test Files  17 passed (17)
      Tests  86 passed (86)
   Duration  2.34s
```
plus `test:ingestion`: `tests 3 / pass 3 / fail 0`.

Phase D parity decision honored: every Phase D surface ships `retro-platformer` and `classic-boring` together off the same `TotemInventoryModel`. Existing quantitative analytics in `Stats.tsx` remain variant-agnostic and unchanged in Phase D.

#### Reviewer follow-up 2026-05-04: W1 aria-describedby fixed

Addressed the single warning from the Phase D reviewer audit (W1 — Shared Accessibility Contract: earned-date must be exposed via `aria-describedby` pointing at a hidden span).

**Files modified:**
- `src/components/stats/RetroInventoryShelf.tsx` — totem `<button>` now sets `aria-describedby={isEarned && earnedOnLabel ? 'totem-date-<id>' : undefined}`; renders an adjacent `sr-only` `<span id="totem-date-<id>">` with the formatted earned-date (reusing the existing `useEarnedOnLabel()` shared helper, no duplicated formatting). Unearned totems get neither the attribute nor the span.
- `src/components/stats/ClassicTotemGrid.tsx` — same pattern on the earned-card `<button>`. Unearned totems are not rendered as buttons in the main grid (they live only in the "What can I earn?" disclosure), so they trivially carry no `aria-describedby`. Visible footer date kept as-is — the hidden span is purely additive for screen-reader users who don't traverse into the inspect panel.
- `src/components/stats/RetroInventoryShelf.test.tsx`, `src/components/stats/ClassicTotemGrid.test.tsx` — added assertions that earned buttons have `aria-describedby="totem-date-<id>"` matching a hidden `sr-only` span with non-empty text, and that unearned totems carry no such attribute / span.

No new translation keys (the existing `totem.earned_on` key is reused via `useEarnedOnLabel()`); no new IDB; no new telemetry; no `matchMedia` outside Phase A hooks; named exports only.

**Verification gates — last 3 lines each:**

`npm run i18n:check`:
```
> tsx scripts/checkI18nParity.ts

[i18n:check] OK — 3 locales, 6 namespaces in parity.
```

`npm run lint`:
```
> the-strength-period@0.1.0 lint
> tsc --noEmit
```
(zero output ⇒ zero TypeScript errors)

`npm run build`:
```
✓ built in 7.16s
…
  dist/sw.js
  dist/workbox-cee25bd0.js
```

`npm test`:
```
 Test Files  17 passed (17)
      Tests  88 passed (88)
   Duration  8.58s
```
plus `test:ingestion`: `tests 3 / pass 3 / fail 0`. Test count rose from 86 → 88 (one new earned-date a11y assertion in each of the two renderer suites).

### 2026-05-04 — Step 16 Phase D pre-execution gates

Architect pass running the four pre-execution gates for Phase D (Stats / Inventory skin parity: `retro-platformer` Inventory Shelf + `classic-boring` Totem Card Grid). Implementer-touchable artefacts only — no source code changes.

**Phase 0.** Confirmed Phase A, B, C ✅. Locked Phase D scope to the **totem inventory surface only**, embedded in the existing `/stats` page; the existing quantitative analytics (volume / progression / adherence / PR table) stay variant-agnostic and out of Phase D scope. Identified ten spec gaps in the per-variant "Stats / Inventory Surface" paragraphs (no v1 totem enumeration, no evaluator signature, no inventory taxonomy lock, no empty-state contract, no `--theme-stats-*` token namespace, no explicit forbidden-renderings list, no audio gating for inspect chime, no a11y contract for the inspect panel, no deferred-totem list, no zero-IDB / zero-telemetry confirmation). Patched the spec with an additive "Phase D Shared Contracts (Stats / Inventory) — added 2026-05-04" subsection at the same nesting level as the existing "Phase B Shared Contracts (Dashboard)" and "Phase C Shared Contracts (Session Execution)" blocks.

**Phase 1.** Behavioral risk brief: zero high-risk mechanics; six medium-risk mechanics with explicit mitigations (collect-them-all compulsion → no locked silhouettes; streak-as-pressure → no current-streak counter, totems are permanent; comparison framing → zero peer signal anywhere on the surface; shame-on-empty → `stats:totem.empty.calm` calm copy; randomized rewards → deterministic eligibility only, rule visible in inspect panel; retro audio nag → opt-in chime on inspect activation only, single-fire).

**Phase 2.** UI/UX Integrity Gate: **INCREMENTAL with shared adapter** (Phase B/C template). Existing `Stats.tsx` IA preserved (header → period selector → analytics sections → export/import). A new totem-inventory section is slotted between the period selector and the `VolumeChart` section via a `<TotemInventory model={...} />` router that selects `RetroInventoryShelf` or `ClassicTotemGrid` via `useEffectiveAestheticVariant`. Period selector is scoped only to the analytics charts (totems are time-window-agnostic by spec).

**Phase 3.** Defined shared `TotemInventoryModel` (pure selector in `src/services/stats/buildTotemInventoryModel.ts`); variant renderer contract `TotemInventoryProps = { model }`; new CSS token namespace `--theme-stats-*` (with retro-only `--theme-game-stats-*` extras); a11y contract for totem surfaces (`role="button"`, `aria-pressed`, non-modal inline disclosure for inspect panel, no `aria-live`); i18n surface under `stats:totem.*` with the v1 catalog locked at eight deterministic totems (first-session, first-week, three-weeks-present, eight-week-rhythm, return-after-break, first-mesocycle-complete, first-deload-honored, rpe-awareness); audio gating contract via a new `statsAudio` module mirroring Phase C's `sessionAudio` short-circuit pattern; explicit deferred-to-Phase-E totem list. Zero new IDB stores, zero new telemetry confirmed.

**Phase 4.** Wrote ordered Phase D checklist D1–D11 to `tasks/todo.md` with ACs per item and explicit verification gates.

**Spec patches**
- `specs/features/16-ethical-gamification.md`: appended "Phase D Shared Contracts (Stats / Inventory) — added 2026-05-04" subsection between the existing Phase C contracts block and the `### Variant: Retro Platformer` heading. Additive only; no existing copy modified.

**Files touched**
- `specs/features/16-ethical-gamification.md` (additive subsection)
- `specs/STATUS.md` (Phase D sub-bullets under Step 16)
- `tasks/todo.md` (Phase D checklist D1–D11)
- `specs/STATUS_HISTORY.md` (this entry)

**Verdict.** Phase D is pre-cleared for the Implementer. Strict parity rule reaffirmed: `RetroInventoryShelf` and `ClassicTotemGrid` ship together off the same `TotemInventoryModel`; no temporary single-variant releases. Existing analytics sections in `Stats.tsx` remain unchanged in Phase D.

---

### 2026-05-04 — Step 16 Phase C implementation

Implementer pass shipping Phase C end-to-end (Session Execution skin parity: `retro-platformer` Level Run + `classic-boring` Cards). Strict parity preserved — both variants render off the same `SessionExecutionModel` and the same `actions`.

**Files created**
- `src/services/session/buildSessionExecutionModel.ts` — pure selector (C3); exports `SessionExecutionModel`, `ExerciseBlock`, `SetNode`, `SetExecutionState`, `RestState`, `BuildSessionExecutionInput`. No React, no IO, no `matchMedia`. `nowMs` injected.
- `src/services/session/buildSessionExecutionModel.test.ts` — 11 cases covering empty / all-pending / single-active / with-rest / some-completed / skipped derivation / circuit-mode round counter passthrough / HUD volume math / `meanRpe = null` when no per-set RPE / `nowMs` determinism / finished state (C4).
- `src/services/audio/sessionAudio.ts` — single-entry audio API; both `playRestEndChime()` and `playSetCompleteBlip()` short-circuit when the effective variant ≠ `retro-platformer` or when user opt-in is off (C9). No new persistence channel.
- `src/components/session/SessionHudReadouts.tsx` — shared HUD readout primitive consumed by both renderers.
- `src/components/session/RetroLevelRun.tsx` (C5) and `src/components/session/ClassicSessionCards.tsx` (C6) — variant renderers off the same model + actions; identical click/keyboard semantics; identical `data-set-state` ordering; classic NEVER reads `--theme-game-session-*` and NEVER references `session.completion.retro.*` (verified by C11 grep guard, see below).
- `src/components/session/SessionExecution.tsx` — variant router (C7); 1:1 mirror of `DashboardMap` from Phase B.
- `src/components/session/RetroLevelRun.test.tsx` (4 tests) and `src/components/session/ClassicSessionCards.test.tsx` (4 tests) — per-renderer assertions: every set surface is a `<button>` with `aria-pressed`, exposes `session.set.aria` with the correct state token; click on active set invokes `actions.logSet`; SetLogger Skip → `actions.skipSet`; RestTimer Skip → `actions.skipRest`. Classic test asserts zero `<audio>` mounts and zero retro-completion-copy leakage.
- `src/components/session/SessionExecution.test.tsx` — **C10 cross-variant parity test (added in this pass)**. Renders the router twice off the same `SessionExecutionModel` (once per persisted aesthetic variant), asserts: identical `[data-set-state]` orderings and identical session-id orderings across variants; click on the active set in BOTH variants invokes `actions.logSet`; `JSON.stringify(model)` is byte-identical before/after each render (no mutation); switching variant flips the rendered subtree (`retro-set-*`/`retro-platform-*` present in retro pass and absent in classic pass; `classic-set-*`/`classic-card-*` vice versa). Forbidden-pattern guard: `session.completion.retro.*` copy ("Level clear" / "Nivell completat") never appears in the classic tree, neither in-progress nor finished.

**Files modified**
- `src/index.css` — added `--theme-session-*` shared tokens and retro-only `--theme-game-session-*` tokens (C1); rest-timer color tokens have NO red/urgency variant.
- `src/i18n/locales/{ca,es,en}/common.json` — added `session.set.aria`, `session.set.state.{pending,active,completed,skipped}`, `session.hud.label.{elapsed,volume,sets,rpe}`, `session.rest.skip_aria`, `session.completion.calm.{headline,body}`, `session.completion.retro.level_clear` to all three locales (C2). Parity verified by `npm run i18n:check`.
- `src/pages/Session.tsx` — replaced the inline `<ActiveExercise> + ({isResting ? <RestTimer/> : <SetLogger/>})` block with `<SessionExecution model={buildSessionExecutionModel({...store slice, nowMs: Date.now()})} actions={...} />` (C8). Pre-start, finished (`SessionSummary`), cancel-confirm dialog and error rendering branches unchanged. Model memoized on the relevant store-slice keys.

**Type-fix patch applied to the renderer test fixtures (this pass)**
- `GeneratedSession` fixture now includes the required `mesocycleId: 'm-1'` and `estimatedDurationMinutes: 30` fields and drops the `as GeneratedSession` cast.
- `ExecutedSet` literal in the test fixture replaced its phantom `timestamp` field with the real `completedAt` field (and adds the required `id`, `sessionId`, `sessionTemplateId`, `date` fields per `src/types/session.ts`). Same fix mirrored in `RetroLevelRun.test.tsx`, `ClassicSessionCards.test.tsx`, and the new `SessionExecution.test.tsx`.

**C11 grep guards** (forbidden-pattern checks against `src/components/session/ClassicSessionCards.tsx`)
- `grep -n -- '--theme-game-session' src/components/session/ClassicSessionCards.tsx` → **1 match, line 60** — inside the file-header doc comment block (`* - Reads exclusively --theme-session-* tokens. NEVER reads any --theme-game-session-* token (verified by C11 grep guard).`). NOT a code reference; doc-comment match only. ✅
- `grep -n 'completion\.retro' src/components/session/ClassicSessionCards.tsx` → **1 match, line 61** — same doc-comment block (`* - NEVER references session.completion.retro.* keys (Completion-Frame Contract); ...`). NOT a code reference; doc-comment match only. ✅
- Both matches are explicitly the documented C11 guard sentinels living in the JSDoc header. The actual rendering code uses only `--theme-session-*` and only `session.completion.calm.*` keys.

**Verification gates (last lines of each command)**
- `npm run i18n:check` → `[i18n:check] OK — 3 locales, 6 namespaces in parity.` ✅
- `npm run lint` → `tsc --noEmit` (no output, exit 0) ✅
- `npm run build` →
  ```
  PWA v1.2.0
  mode      generateSW
  precache  7 entries (1347.41 KiB)
  ```
  exit 0 ✅
- `npm test` → `Test Files  11 passed (11) / Tests  47 passed (47)` (unit) + `tests 3 / pass 3 / fail 0` (ingestion) ✅

**Test counts**
- Phase C unit suites added/touched in this pass:
  - `src/services/session/buildSessionExecutionModel.test.ts` — 11 tests
  - `src/components/session/RetroLevelRun.test.tsx` — 4 tests
  - `src/components/session/ClassicSessionCards.test.tsx` — 4 tests
  - `src/components/session/SessionExecution.test.tsx` — 2 tests (cross-variant parity + forbidden-pattern guard)
- Total project unit tests: **47 passed across 11 files**; ingestion: **3 passed**.

**Hard-rule compliance** — strict variant parity off the same model, zero new IDB stores, zero new telemetry, no `matchMedia` outside Phase A's `useEffectiveAestheticVariant` hook, ca/es/en parity, named exports throughout, no urgency colors on the rest timer, no shame copy on skipped sets, no retro tokens or retro completion keys leaking into classic.

#### Reviewer follow-up 2026-05-04: warnings + N1 fixed

- **W1 — `playSetCompleteBlip` gated away from `ClassicSessionCards`.** Removed the two cosmetic invocations (and the now-unused import) from `src/components/session/ClassicSessionCards.tsx`. Parity contract is on model + actions, not on mirroring no-op audio calls. `src/components/session/ClassicSessionCards.test.tsx` now mocks `@/services/audio/sessionAudio` and asserts `playSetCompleteBlip` is invoked **0 times** across a full set/rest cycle (per-card click → SetLogger complete → enter rest → skip rest).
- **W2 — C9 retro positive-fire audio test added.** New `src/services/audio/sessionAudio.test.ts` (focused unit test) asserts `playRestEndChime` constructs the `AudioContext` exactly once when the persisted variant is `retro-platformer`, and is a no-op (zero `AudioContext` constructions) when the variant is `classic-boring`. Same gating verified for `playSetCompleteBlip`. Tests against the audio module's gating logic directly — strongest invariant, no renderer plumbing.
- **N1 — Dead Catalan regex fixed.** `src/components/session/SessionExecution.test.tsx` updated: the cross-variant guard now matches the actual ca copy `Nivell superat!` (regex `/nivell superat/i`) instead of the non-existent `nivell completat`. Both assertion sites (in-progress + finished states) updated.

**Verification (all green)** — `npm run i18n:check` (3 locales, 6 namespaces in parity), `npm run lint` (clean), `npm run build` (clean), `npm test` → **51 passed across 12 files** (was 47 across 11; +1 file `sessionAudio.test.ts` with 3 tests, +1 test in `ClassicSessionCards.test.tsx`).

---

### 2026-05-04 — Step 16 Phase C pre-execution gates

Architect pass running the four pre-execution gates for Phase C (Session Execution skin parity: `retro-platformer` Level Run + `classic-boring` Cards). Implementer-touchable artefacts only — no source code changes.

**Phase 0.** Confirmed Phase A and Phase B ✅; identified seven spec gaps in the per-variant Session Execution Surface paragraphs (per-set state taxonomy, HUD readout names, rest-timer state contract, completion-frame contract, audio gating contract, shared CSS token namespace, set-advancement a11y contract). Patched the spec with an additive "Phase C Shared Contracts (Session Execution) — added 2026-05-04" subsection at the same nesting level as the existing "Phase B Shared Contracts (Dashboard)" block.

**Phase 1.** Behavioral risk brief: zero high-risk mechanics; four medium-risk mechanics with explicit mitigations (rest-timer no-urgency rule, completion-frame strict separation, skip-not-shame copy, audio gating short-circuit in `classic-boring`).

**Phase 2.** UI/UX Integrity Gate: **INCREMENTAL with shared adapter** (Phase B template). `Session.tsx` IA (pre-start → active → finished) is preserved; the inline `<ActiveExercise> + <SetLogger>/<RestTimer>` block will be replaced by a `<SessionExecution model={...} actions={...} />` router that selects `RetroLevelRun` or `ClassicSessionCards` via `useEffectiveAestheticVariant`. Existing primitives (`ActiveExercise`, `SetLogger`, `RestTimer`, `SessionSummary`) are composed unchanged. Cancel-confirm dialog, finished branch, error rendering, and pre-start branch stay as-is.

**Phase 3.** Defined shared `SessionExecutionModel` (pure selector in `src/services/session/buildSessionExecutionModel.ts`); variant renderer contract `SessionExecutionProps = { model, actions }`; new CSS token namespace `--theme-session-*` (with retro-only `--theme-game-session-*` extras); a11y contract for set surfaces (`role="button"`, `aria-pressed`, `aria-live="polite"` HUD regions, `polite` rest-timer countdown); i18n surface under `common.session.*` with strict separation between `session.completion.calm.*` (both variants) and `session.completion.retro.*` (retro only); audio gating contract (single entrypoint, short-circuits when effective variant ≠ `retro-platformer`). Zero new IDB stores, zero new telemetry confirmed.

**Phase 4.** Wrote ordered Phase C checklist C1–C12 to `tasks/todo.md` with ACs per item and explicit verification gates.

**Spec patches**
- `specs/features/16-ethical-gamification.md`: appended "Phase C Shared Contracts (Session Execution) — added 2026-05-04" subsection between the existing Phase B contracts block and the `### Variant: Retro Platformer` heading. Additive only; no existing copy modified.

**Files touched**
- `specs/features/16-ethical-gamification.md` (additive subsection)
- `specs/STATUS.md` (Phase C sub-bullets under Step 16)
- `tasks/todo.md` (Phase C checklist C1–C12)
- `specs/STATUS_HISTORY.md` (this entry)

**Verdict.** Phase C is pre-cleared for the Implementer. Strict parity rule reaffirmed: `RetroLevelRun` and `ClassicSessionCards` ship together off the same `SessionExecutionModel`; no temporary single-variant releases.

---

### 2026-05-04 — Step 16 Phase B warning fixes

Implementer pass closing the four non-blocking warnings from the 2026-05-04 Phase B reviewer audit. Spec untouched; no new IDB stores, no telemetry, no `matchMedia` reads outside Phase A hooks.

**Warning 1 — cross-variant parity test.** Added `src/components/dashboard/DashboardMap.test.tsx`. Renders `<DashboardMap />` against the same `buildDashboardMap` fixture twice (once per persisted `aestheticVariant`), mocks `matchMedia` like the other Phase B tests, and asserts: identical `[data-state]` order, identical `sessionId` routing across variants, that switching the variant flips the rendered subtree (`retro-node-*` vs `classic-cell-*`), and that the underlying model object is byte-identical (JSON snapshot) before and after each render.

**Warning 2 — localized week aria-label.** Added `dashboard.week_label` to `src/i18n/locales/{ca,es,en}/common.json` (ca "Setmana {{week}}", es "Semana {{week}}", en "Week {{week}}"). Replaced the hardcoded English `aria-label` on the per-week `role="list"` wrappers in `src/components/dashboard/RetroWorldMap.tsx` and `src/components/dashboard/ClassicCalendar.tsx` with `t('dashboard.week_label', { week: week.weekNumber })`. Dropped the "world" suffix per spec.

**Warning 3 — in-progress color via CSS token.** In `src/components/dashboard/ClassicCalendar.tsx`, removed the hardcoded `ring-amber-500/60` Tailwind utility from the cell className. The ring width (`ring-2`) stays in className; the ring color is now driven by `--tw-ring-color: var(--theme-dashboard-state-in-progress)` via inline style (typed via a `React.CSSProperties & Record<string, string>` cast for the custom property). Replaced the `Pause` icon's `text-amber-700` with `style={{ color: 'var(--theme-dashboard-state-in-progress)' }}`. Visual result is equivalent (the token resolves to the same amber).

**Warning 4 — B2 surface documentation drift.** Updated `tasks/todo.md` → "Step 16 — Phase B" → B2 to list `deload_label` and the new `week_label` alongside the previously documented keys, and ticked B2 as done.

**Files touched**
- `src/components/dashboard/DashboardMap.test.tsx` (new)
- `src/components/dashboard/RetroWorldMap.tsx`
- `src/components/dashboard/ClassicCalendar.tsx`
- `src/i18n/locales/ca/common.json`
- `src/i18n/locales/es/common.json`
- `src/i18n/locales/en/common.json`
- `tasks/todo.md`
- `specs/STATUS.md`
- `specs/STATUS_HISTORY.md` (this entry)

**Verification (last lines)**
- `npm run i18n:check` → `[i18n:check] OK — 3 locales, 6 namespaces in parity.`
- `npm run lint` → exit 0, no output.
- `npm run build` → `✓ built in 6.42s` + PWA precache regenerated.
- `npm test` → unit `Test Files  7 passed (7) / Tests  26 passed (26)`; ingestion `tests 3 / pass 3 / fail 0`.

**Verdict:** All four warnings closed. Phase B remains complete; Step 16 row stays "🚧 In Progress" pending Phases C–E.

### 2026-05-04 — Step 16 Phase B review

Reviewer pass on Phase B implementation. No source code modified.

**✅ Pass (13)** — tokens, i18n parity, pure selector with deterministic state derivation, 9 selector test cases, both variant renderers (`RetroWorldMap`, `ClassicCalendar`) with `role="link"` + canonical aria + identical routing + arrow-key matrix nav, `DashboardMap` router consuming `useEffectiveAestheticVariant`, Block 2 wired without touching Blocks 1/3, per-variant render tests, gates green, test infra (`src/test-setup.ts` with jest-dom + `afterEach(cleanup)` referenced from `vitest.config.ts setupFiles`), hard rules upheld (zero new IDB, zero new telemetry, no `matchMedia` outside Phase A hooks), strict parity preserved.

**⚠️ Warnings (4, non-blocking)**
- Missing third B9 parity test (`<DashboardMap />` rendered twice across variants asserting tree parity). Fix: add `src/components/dashboard/DashboardMap.test.tsx`.
- Hardcoded English aria-label on per-week wrappers (`RetroWorldMap.tsx:131`, `ClassicCalendar.tsx:123`). Fix: add `dashboard.week_label` with `{{week}}` placeholder.
- Hardcoded Tailwind amber utilities in `ClassicCalendar.tsx:148` (`ring-amber-500/60`) and `:160` (`text-amber-700`) bypass `--theme-dashboard-state-in-progress`. Fix: drive via inline CSS var.
- `dashboard.deload_label` consumed by both renderers without being declared in the B2 i18n surface. Parity holds; flagged for traceability.

**❌ Blockers (0)**

**Verdict:** PASS WITH MINOR. Phase B complete. Phases C–E pending; Step 16 row stays "🚧 In Progress".

### 2026-05-04 — Step 16 Phase B pre-execution gates

Architect pass for Phase B (Dashboard reskin under strict parity: `retro-platformer` world map + `classic-boring` calendar). No source code modified.

**Phase 0 — Source-Of-Truth & Dependency Check.** Phase A confirmed complete. Steps 8/9/14 met. Two spec gaps detected and patched in `specs/features/16-ethical-gamification.md` via a single additive "Phase B Shared Contracts (Dashboard)" subsection appended after the Classic Boring "Guardrail Cross-Check" table:
1. Session-state name parity — declared canonical model `future | available | in-progress | completed | skipped`; the retro "locked" term is presentation-only for `future`.
2. Under-specified parity details — added shared a11y contract (`dashboard.session_aria` template, keyboard nav), per-week sub-palette resolution (`weekIndex % palette.length`, muted token for `classic-boring`), token namespaces (`theme.dashboard.*` shared, `theme.game.*` retro-only), and explicit zero-IDB / zero-telemetry confirmation.

**Phase 1 — Behavioral Risk Brief.** No high-risk Phase B mechanic. Two medium risks (lock-as-storytelling visual confusion in retro; muted future cells reading as blocked in calendar) mitigated by keeping the actionable target identical across variants and explicit i18n copy. Reduced-motion and keyboard nav inherit from Phase A.

**Phase 2 — UI/UX Integrity Gate.** Decision: **INCREMENTAL with a thin shared adapter** (not a full refactor). Architecture: shared selector `buildDashboardMap` + two variant renderers (`RetroWorldMap`, `ClassicCalendar`) selected at runtime by `useEffectiveAestheticVariant()`. Both variants ship together off the same model.

**Phase 3 — Mechanic Design.**
- Shared model: `DashboardMapModel = { weeks: WeekRow[] }`, `WeekRow = { weekNumber, isDeload, sessions: SessionNode[] }`, `SessionNode = { id, weekNumber, dayOfWeek, state, muscleGroups }`.
- Builder: `buildDashboardMap(mesocycle, previewSessionId?)` at `src/services/dashboard/buildDashboardMap.ts` — pure, deterministic.
- Renderers: `src/components/dashboard/{DashboardMap,RetroWorldMap,ClassicCalendar}.tsx`.
- Tokens: `--theme-dashboard-*` shared, `--theme-game-*` retro-only.
- i18n surface (namespace `common`): `dashboard.session_aria`, `dashboard.state.*` (5 keys), `dashboard.future_hint`.
- Zero new IDB stores; zero new telemetry events.

**Phase 4 — Implementation Plan Gate.** Ordered B1–B11 plan with acceptance criteria appended to `tasks/todo.md`.

**Files modified by this pass**
- `specs/features/16-ethical-gamification.md` — additive "Phase B Shared Contracts (Dashboard)" subsection.
- `specs/STATUS.md` — Phase B sub-bullets appended under Step 16.
- `specs/STATUS_HISTORY.md` — this entry.
- `tasks/todo.md` — Phase B checklist appended.

### 2026-05-04 — Step 16 Phase A re-review

Reviewer re-audit after Implementer's blocker fixes. Source of truth: `specs/features/16-ethical-gamification.md` ("Shared Gamification Core", "Aesthetic Variants", "Variant: Classic Boring"). No source code modified.

**✅ Pass (6)**
- Blocker 1 closed: `src/i18n/locales/{ca,es,en}/onboarding.json` ship `appearance.variant.{classic_boring,retro_platformer}.{label,description}` (12 leaves) verbatim from `common:settings.appearance.variant.*`. `AppearanceSelector` resolves them via the `onboarding` namespace + `appearance` keyPrefix — no raw key strings rendered.
- Blocker 2 closed: `vitest.config.ts` (jsdom, scoped to `src/**/*.test.{ts,tsx}`); devDeps `vitest`/`jsdom`/`@testing-library/{react,jest-dom}`; `package.json` scripts `test`, `test:unit`, `test:ingestion` wired. The 3 mandated tests (`userStore.migration`, `useEffectiveAestheticVariant`, `userStore.isValidUserConfig`) are present and structurally valid.
- Warning 1 closed: `●` badge removed from `AppearanceSelector.tsx`; `effectiveVariant` prop dropped from API and call sites.
- Warning 2 closed: Onboarding `handleSkip` explicitly calls `setAestheticVariant(DEFAULT_AESTHETIC_VARIANT)` before `goNext()`.
- No regressions: shared-core invariants intact; reduced-motion override remains runtime-only and never written; a11y, security, conventions preserved.
- Gates wiring verified for `i18n:check`, `lint`, `build`, `test`.

**⚠️ Warnings (1, non-blocking)**
- Onboarding `appearance.subtitle` and `appearance.reduced_motion_forced` are intentionally shorter than the Settings counterparts. By design — flagged only for future cross-surface copy parity if desired.

**❌ Blockers (0)**

**Verdict:** PASS. Phase A implementation complete. Phases B–E remain pending; Step 16 row stays "🚧 In Progress".

### 2026-05-04 — Step 16 Phase A blocker fixes

Implementer pass addressing the two blockers and two selected warnings from the 2026-05-04 reviewer audit. Spec untouched.

**Blocker 1 — onboarding i18n parity for `variant.*` subtree.** Mirrored `common:settings.appearance.variant.{classic_boring,retro_platformer}.{label,description}` into `onboarding:appearance.variant.*` for ca/es/en (12 leaves). Copy is verbatim from the corresponding `common.json` keys; no new strings invented. `AppearanceSelector` keeps reading `appearance.variant.<key>.{label,description}` from the namespace passed in by its caller (`onboarding` for the optional onboarding step, `common` for Settings).

**Blocker 2 — A8 unit tests + Vitest infra.** Added Vitest + jsdom + `@testing-library/react` + `@testing-library/jest-dom`. New `vitest.config.ts` scopes the runner to `src/**/*.test.{ts,tsx}` so the existing Node-test ingestion suite is untouched. Scripts: `test:unit` runs Vitest, `test:ingestion` keeps the Node runner, and `test` runs both sequentially.

Tests (all passing):
- `src/stores/userStore.isValidUserConfig.test.ts` — 6 cases. Accepts string and `undefined`, rejects number/object/null/boolean for `aestheticVariant`.
- `src/stores/userStore.migration.test.ts` — mocks `@/services/db/configRepository`, calls `loadUserConfig` with a legacy `UserConfig` lacking `aestheticVariant`, asserts the store hydrates to `DEFAULT_AESTHETIC_VARIANT` and the rest of the fields round-trip cleanly.
- `src/hooks/useEffectiveAestheticVariant.test.tsx` — `renderHook` against a stubbed `window.matchMedia`. Asserts (a) reduced-motion → returns `'classic-boring'` while persisted `'retro-platformer'` is preserved and `setAestheticVariant` is never called, and (b) the no-override path returns the persisted variant.

**Warning 1 — redundant `●` badge.** Removed the amber dot from `AppearanceSelector` (the radio's `checked` state already conveys "active"). Dropped the now-unused `effectiveVariant` prop from the component and from both call sites (`Settings`, `Onboarding`), plus the dead `useEffectiveAestheticVariant` import in those pages.

**Warning 2 — explicit Skip intent.** Onboarding's Skip button now calls `setAestheticVariant(DEFAULT_AESTHETIC_VARIANT)` before advancing, so the persisted choice reflects the user's (implicit) decision rather than relying on a pre-existing default. Imported `DEFAULT_AESTHETIC_VARIANT` from `@/types/user`.

**Files added**
- `vitest.config.ts`
- `src/stores/userStore.isValidUserConfig.test.ts`
- `src/stores/userStore.migration.test.ts`
- `src/hooks/useEffectiveAestheticVariant.test.tsx`

**Files modified**
- `src/i18n/locales/{ca,es,en}/onboarding.json` — added `appearance.variant.*` subtree
- `src/components/ui/AppearanceSelector.tsx` — removed `●` badge and `effectiveVariant` prop
- `src/pages/Onboarding/index.tsx` — explicit `handleSkip`, dropped dead hook import + prop
- `src/pages/Settings.tsx` — dropped dead hook import + `effectiveVariant` prop
- `package.json` — added `vitest`/`@testing-library/react`/`@testing-library/jest-dom`/`jsdom` devDeps; `test` runs both suites; new `test:unit`
- `tasks/todo.md` — A8 ticked
- `specs/STATUS.md` — Phase A entry updated to "awaiting re-review" (FAIL annotation removed)

**Verification**
- `npm run i18n:check` → `[i18n:check] OK — 3 locales, 6 namespaces in parity.`
- `npm run lint` → exit 0 (no output)
- `npm run build` → `✓ built in 7.57s` then PWA `precache 7 entries`
- `npm test` → `Test Files 3 passed (3) / Tests 9 passed (9)` for `test:unit`; `tests 3 / pass 3 / fail 0` for `test:ingestion`

**Deviations from brief**
- Added 6 cases (not just 1) to `isValidUserConfig` to exhaustively cover the contract — same file, no extra surface area.
- Removed `effectiveVariant` from the `AppearanceSelector` API rather than leaving it as a dead prop, since the `●` badge was its only consumer. This eliminates two unused imports and keeps `noUnusedParameters` honest.
- Did not install `@testing-library/jest-dom`'s matchers via a setup file (no DOM matchers needed by these three tests). The package is installed per the brief but no global setup is wired; future tests can add it as needed.

### 2026-05-04 — Step 16 Phase A review

Reviewer pass against `specs/features/16-ethical-gamification.md` ("Shared Gamification Core", "Aesthetic Variants", "Variant: Classic Boring") and `tasks/todo.md` → "Step 16 — Phase A". No source code modified.

**✅ Pass**
- Shared core: single `aestheticVariant` field on existing `UserConfig`; zero variant-specific logic; zero new IDB stores.
- `AestheticVariant` is an open string type; default `DEFAULT_AESTHETIC_VARIANT = 'classic-boring'`.
- `prefers-reduced-motion` enforcement is purely runtime (`useEffectiveAestheticVariant` derives, never writes); persisted preference is preserved across toggles.
- `userStore`: legacy configs without `aestheticVariant` hydrate to default; `setAestheticVariant`, `completeOnboarding`, `reset` round-trip the field; `isValidUserConfig` accepts optional string only.
- `usePrefersReducedMotion`: SSR-safe, syncs after mount, `addEventListener('change', …)` with `addListener` fallback, full cleanup.
- Settings: dedicated "Aspecte" section with reduced-motion banner (`role="status"`); selector disabled while persisted choice remains visible.
- Onboarding: optional first step with Skip/Back/Next; default-on-skip behavior is `classic-boring`.
- Guardrails: no guilt/urgency/shame copy; no paid gating; no telemetry.
- Accessibility: radio-group semantics, `aria-labelledby`/`aria-describedby`, AA-friendly amber banner, 44px+ tap targets.
- Security: no `any`, no `innerHTML`/`eval`, no logged secrets.

**❌ Blockers**
- `src/i18n/locales/{ca,es,en}/onboarding.json`: missing keys `appearance.variant.classic_boring.{label,description}` and `appearance.variant.retro_platformer.{label,description}` (12 leaves). `AppearanceSelector` reads from the `onboarding` namespace at the optional onboarding step; `npm run i18n:check` does not catch it because parity holds and no namespace fallback is configured. **Fix:** mirror the `variant.*` subtree from `common:settings.appearance` into `onboarding:appearance` for ca/es/en.
- A8 unit tests not delivered. No frontend test runner is configured in `package.json` (`test` only runs ingestion). Missing: (1) `userStore` migration without `aestheticVariant`, (2) `useEffectiveAestheticVariant` does not mutate the store under reduced-motion override, (3) `isValidUserConfig` rejects non-string `aestheticVariant`. **Fix:** add Vitest + jsdom and the three tests, or formally descope A8.

**⚠️ Warnings (non-blocking)**
- `AppearanceSelector` "active now" `●` badge has no accessible name. Either remove or label.
- Onboarding Skip and Next call the same handler. Recommend Skip explicitly call `setAestheticVariant(DEFAULT_AESTHETIC_VARIANT)` so intent is encoded, not implicit.
- A8 manual smoke (toggle OS reduced-motion) not recorded. Add note on re-verification.

**Verdict:** FAIL. Implementer to address blockers and re-request review.

### 2026-05-04 — Step 16 pre-execution gates

Pre-execution phases for Step 16 (Ethical Gamification) executed by the Architect agent. No source code touched. Source of truth: `specs/features/16-ethical-gamification.md` (recently extended with "Shared Gamification Core", "Aesthetic Variants", and "Variant: Classic Boring" sections).

**Phase 0 — Source-Of-Truth & Dependency Check.** Steps 8, 9, 14 confirmed ✅ in `specs/STATUS.md`. The feature spec has no internal contradictions. `tasks/todo.md` had no Step 16 items prior to this gate; no contradictions introduced.

**Phase 1 — Behavioral Risk Brief (Phase A only).** Mechanics evaluated: `aestheticVariant` field (low), Settings selector (low), onboarding optional step (low–medium — mitigated by skippable + default-on-skip + descriptive copy), `prefers-reduced-motion` enforcement (medium — mitigated by deriving the effective variant at runtime and never writing the forced value to IDB, plus a Settings notice). No high-risk mechanic in Phase A.

**Phase 2 — UI/UX Integrity Gate. Decision: INCREMENTAL.** Phase A only adds plumbing (one persisted field, one selector section, one optional onboarding step, one reduced-motion hook). It reskins no surface. Existing `UserConfig`, `userStore`, `Settings.tsx`, and `Onboarding/index.tsx` support these additions cleanly without IA refactor. The full UI/UX refactor policy is deferred to Phase B (Dashboard map/calendar reskin) where the IA actually changes.

**Phase 3 — Mechanic Design & Event Model (Phase A).**
- `UserConfig.aestheticVariant?: 'retro-platformer' | 'classic-boring' | string`, default `'classic-boring'`, exported as `DEFAULT_AESTHETIC_VARIANT`.
- Migration for existing users: optional field; on read, missing values fall back to `'classic-boring'`. No write-back pass.
- Settings UI: new "Aspecte / Apariencia / Appearance" section with radio cards, shared-core clarification copy, and a reduced-motion banner.
- Onboarding contract: optional appearance step inserted before Step3Context; "Omet" leaves default `'classic-boring'`.
- Reduced-motion detection: `usePrefersReducedMotion` hook subscribed to `matchMedia('(prefers-reduced-motion: reduce)')`; effective variant resolved by `useEffectiveAestheticVariant`. The persisted value is never overwritten by the override.
- i18n keys added to ca/es/en under `common:settings.appearance.*` and `onboarding:appearance.*` (shared-core notice and reduced-motion forced notice copy verbatim from the spec).
- Event model: zero new telemetry, zero new IDB stores (Guardrail #10).

**Phase 4 — Implementation Plan Gate.** Ordered Phase A plan with acceptance criteria recorded in `tasks/todo.md` (steps A1–A10, including unit tests and verification gates).

**Open questions / blockers:** none. Implementer agent may proceed with Phase A as written. Phases B–E remain blocked behind their respective design gates.

---

### Comprehensive Code Review Pass — 30+ Fixes (2026-04-30)

End-to-end review of `src/` plus targeted ingestion follow-ups. Performed in
four rounds (initial sweep → user-selected refactors → regression repair →
remaining items). All rounds end with `npm run build`, `npm run lint`,
`npm run i18n:check`, and `npm test` (ingestion suite) green.

**Critical bug fixes**

- Date/UTC drift: `toDateStr` rewritten to use local components; new
  `parseLocalYMD` helper; `getISOWeek` reimplemented per ISO 8601 (Thursday
  pivot, Jan-4 anchor) — eliminates wrong week labels at year boundaries and
  in non-UTC timezones.
- `aggregateAdherence` now walks ISO weeks via `listISOWeeksBetween`, filling
  empty weeks with `completed: 0` instead of skipping them.
- Planning engine: 1-week deload guard; `resolveWeekMultiplier` reordered so
  per-week rates apply on the deload week too; sets/reps/weight all honour
  `weeklyProgressionRates` consistently when present (legacy slider mode
  retains the constant `rule.deloadPercentage`).
- `mesocycleRepository.saveActiveMesocycle` performs the
  swap-active-flag-then-put inside a single `readwrite` transaction.
- `exportImport.importData` validates every record before clearing IDB stores;
  `exportData` revokes the object URL in `finally`.
- `sessionStore.finishSession` now caches `{ sessionId, completedAt }` in
  `pendingSessionDraft` so a retry after a partial save reuses the same row
  rather than inserting a duplicate.
- `userStore.isValidUserConfig` validates `trainingDays` (array of numbers) and
  `availableWeights` (object) — not just equipment + minutesPerSession.

**UX/perf refactors**

- `RestTimer` self-subscribes to `restSecondsRemaining` + `tickRest`; removed
  from `useSession` API to stop the per-second tick re-rendering the whole
  Session page tree. `useSession` slice uses `useShallow` excluding
  tick-frequency fields.
- `sessionStore` exposes `skipRest` and `finishEarly` actions (replacing
  `useSessionStore.setState({...})` from the page).
- `BottomNav` hides itself during an active session.
- `WeightSelector` accepts comma decimal separator (`'1,5' → 1.5`).
- `useExercises` exposes a `retry()` action so consumers can recover from a
  failed initial catalog load without a full page reload.
- `Modal` and `Settings` defensive cleanup of timers/refs to avoid
  use-after-unmount.
- `Onboarding` finish button disabled until equipment + trainingDays selected.
- `WeightSelector` and `weightSnapping` use a small epsilon for floating-point
  weight comparisons.

**Catalog & validation hardening**

- `exerciseCatalog` URL uses `import.meta.env.BASE_URL`; new `isValidExercise`
  type guard filters malformed records (DEV-gated `console.warn`).
- `Card`/`LoadingSpinner` props interfaces exported.
- `LLMAssistant` and `llmAssistantService` size and CSV-injection guards
  tightened.
- `userStore.detectLanguage` whitelists `ca/es/en`.

**Ingestion**

- Removed `autoRestrictions` from `Preset` interface and downstream consumers
  (`src/data/presets.ts`), as well as from ingestion `CanonicalPreset`,
  `PresetCandidateInput`, `normalizers`, `validators`, `presetGenerator`
  (including the LLM prompt example schema), and `llmJsonAdapter`. Existing
  preset JSON files in `data/ingestion/presets/*.json` retain the field as a
  no-op (silently ignored) for backward compatibility.

**Tooling**

- New `scripts/checkI18nParity.ts` + `npm run i18n:check` script: flattens
  every locale namespace and reports missing/extra keys against `ca`.

### Step 19 — QA Pass Build Repair (2026-04-28)

A previous implementer began the Round-2 QA Pass for Feature 17 but left the
TypeScript build with 20 errors. Restored a green build and finished the two
QA tracks that were already mid-flight:

- **QA-5 (equipment overhaul, partial)**: removed every `'pilates'` literal
  from runtime code (`PlanCreator`'s local `ALL_EQUIPMENT`, `Settings.tsx`,
  `Onboarding/Step3Context.tsx`, `llmAssistantService` `EQUIPMENT_LABELS`
  map). `PlanCreator`, `Settings`, and `Step3Context` now consume
  `EQUIPMENT_CATALOG`/`ALL_EQUIPMENT` from `src/data/equipmentCatalog.ts`
  via the existing `EquipmentChipSelector`. Equipment label map now covers
  the full extended `Equipment` enum.
- **QA-6 (remove user restrictions)**: dropped `activeRestrictions` from all
  call sites — `UserConfig` literals in `PlanCreator`, store selectors in
  `PlanCreator`/`Dashboard`/`Settings`/`Step3Context`, `LLMAssistant`
  prompt params, `convertToMesocycle` (parameter removed), and
  `exerciseFilter`'s `excludeRestrictions` field removed from filter calls.
  Removed the restrictions UI section in both `Step3Context.tsx` and
  `Settings.tsx`. Removed obsolete `step3.restrictions` and
  `step3.restrictionOptions` keys from `ca/es/en` `onboarding.json`.
  `Dashboard.tsx` `generateSession(...)` call sites trimmed to the
  4-argument signature.

Verified: `npm run build` and `npm run lint` both green.

Outstanding QA items (still open after this fix-up): QA-1 sparkline copy
+ tooltip, QA-2 translated save errors, QA-3 wizard reorder, QA-4
`PresetPreviewModal` wiring (component file exists but is not yet
imported by `PlanCreator`), QA-5 i18n keys for new equipment values,
QA-7 faithful-only enforcement + runtime validator + autofill CTA,
and faithful regeneration of `data/ingestion/presets/catalog.json`.

### Step 19 — Preset & Session Template Redesign (2026-04-24)

Implementation of Feature 17 (`specs/features/17-preset-sessions-redesign.md`), tracked as Step 19 in STATUS.md.

**Phases completed:**
1. Types + DATA_MODEL stub — `TemplateKey`, `WeekProgressionRate`, updated `PresetSessionTemplate` (`templateKey` + `name`, no `label`), `initialLoadKg` on `PresetExerciseEntry`, `weeklyProgressionRates` on `CustomPreset` and `Preset`.
2. Planning engine — `resolveWeekMultiplier` helper; both `generateFaithfulMesocycle` and `generateGeneratorMesocycle` consume per-week rates with absolute multiplier semantics; faithful mode uses `entry.initialLoadKg` when defined and > 0.
3. A/B/C/D tabs in `FaithfulExercisesStep.tsx` — always-4 templates, inline name field, copy-to dropdown, reps fixed/range toggle, initial load input, up/down reorder.
4. `WeekProgressionTable` component + PlanCreator configure step — slider replaced by per-week table; gray dashed "Custom" grid card removed; `weeks` change preserves edited rows and pads with defaults.
5. Auto-fork built-in presets → CustomPreset on "Save as preset" only; inline name field in wizard header (required, non-empty); legacy `weeklyProgression` write-back migration on first IndexedDB load; unsaved-changes guard via `dirty` flag and confirmation prompt on `guardedNavigate`.
6. i18n — added template/preset keys to `ca/es/en` planning namespace; removed `planning:custom` and `planning:custom_desc`; all three locales synced (107 keys each); DATA_MODEL.md updated with full final type definitions.

**Key decisions baked in:**
- Auto-fork is explicit-only: triggered by "Save as preset", never on intermediate edits.
- Required inline name field gates the save action for built-in working copies and from-scratch presets.
- Legacy `weeklyProgression` is migrated by writing back per-week rates (`progressionPct = weeklyProgression`, `-40` for `week % 4 === 0`) to IndexedDB on first load — no further reliance on the slider.
- Default rates: `+5%` per week, `-40%` for `week % 4 === 0`.
- `weeklyProgressionRates` semantics are absolute per week (`1 + pct/100`), not cumulative — explicit per-week control.
- Reps stored as `number | [number, number]` with a UI toggle for fixed vs range.
- Reorder via up/down arrow buttons only (no drag-and-drop).
- Existing exercise picker reused as-is from `FaithfulExercisesStep`.
- Unsaved-changes confirmation uses `window.confirm` with i18n strings (minimal footprint; can be upgraded to a Tailwind modal as a future polish).

**Files created:**
- `src/components/planning/WeekProgressionTable.tsx`
- `src/services/planning/presetTemplates.ts`

**Files modified:**
- `src/types/planning.ts`
- `src/data/presets.ts`
- `src/services/planning/planningEngine.ts`
- `src/stores/planningStore.ts`
- `src/components/planning/PlanCreator.tsx`
- `src/components/planning/FaithfulExercisesStep.tsx`
- `src/i18n/locales/{ca,es,en}/planning.json`
- `specs/STATUS.md`, `specs/STATUS_HISTORY.md`, `specs/DATA_MODEL.md`

**Verification:** `npm run build` passes (TypeScript + Vite + PWA generation). i18n key parity confirmed across `ca/es/en` (107 keys). Removed legacy keys (`custom`, `custom_desc`) absent from all locale files.

**Out of scope (intentional):** Step 16 (Ethical Gamification) deferred per user request.

---

### Step 18 Review Fixes — Ingestion Pipeline Consistency (2026-04-10)

**4 issues fixed:**
1. `data/ingestion/llm-example.json`: Migrated preset from `exerciseIds` array to `sessions[]` format
2. `scripts/ingestion/presetGenerator.ts`: Split inline Claude contract into two separate examples (generator-mode with muscleDistribution only, faithful-mode with sessions only)
3. `scripts/ingestion/validators.ts`: Made `muscleDistribution` non-empty check conditional — skipped when `sessions` is present and non-empty
4. `scripts/ingestion/adapters/llmJsonAdapter.ts`: Enforced reps tuple shape — array with exactly 2 elements becomes `[number, number]`, otherwise falls back to single number

**6 warnings resolved:**
1. `data/ingestion/prompts/presets-llm-chat.prompt.txt`: Aligned sets (1–10), restSeconds (0–600) ranges with validator
2. `scripts/ingestion/presetGenerator.ts`: Changed `weeklyProgression: 2.5` to integer `3`
3. `data/ingestion/prompts/presets-llm-chat.prompt.txt`: Documented reps as integer or `[min, max]` range array
4. `data/ingestion/prompts/presets-output.json`: Changed Plank `reps: 1` to `reps: 45` (seconds-based)
5. `scripts/ingestion/presetGenerator.ts`: Added comment referencing prompt file near inline contract
6. `scripts/ingestion/contracts.ts`: Added sync comments to `PresetExerciseEntry` and `PresetSessionTemplate`

**Build:** `npm run build` passes with zero errors.

### Tooling Support — Catalog-Driven Preset + Exercise UI Sources (2026-04-09)
- **Changed**: `src/data/presets.ts` runtime preset building now renders directly from `data/ingestion/presets/catalog.json` parsed entries, removing hardcoded fallback merges from the UI data path.
- **Verified**: Existing built-in presets rendered by UI are present in the ingestion preset catalog (`corredor_general`, `pujada`, `rehab_tendinitis_anserina`, `forca_general`, `mobilitat_prevencio`).
- **Added**: `src/services/exercises/exerciseCatalog.ts` as a minimal adapter for exercise catalog source configuration and payload parsing.
- **Changed**: `src/services/exercises/exerciseLoader.ts` now consumes the exercise catalog through the adapter (`EXERCISE_CATALOG_URL` + parser) to keep runtime source explicit and catalog-driven.
- **Changed**: `scripts/buildExercises.ts` now writes using `EXERCISE_CATALOG_PATH` from `scripts/ingestion/paths.ts`, keeping build-time exercise output aligned with ingestion merge targets.
- **Verification**:
  - `npm run ingest -- --config data/ingestion/sources.example.json --dry-run` passes (run `ingestion-20260409-203225-5402c6`: accepted 557, skipped 218, duplicate 100, rejected 0)
  - `npm run build` passes (TypeScript + Vite + PWA generation)

### Tooling Support — Focused Ingestion Tests + Artifact Hygiene (2026-04-09)
- **Added**: Minimal deterministic ingestion test command in `package.json` (`test:ingestion`) powered by the existing `tsx` toolchain.
- **Added**: Focused tests in `scripts/ingestion/i18nMerge.test.ts` covering:
  - grouped update precedence for canonical exercise i18n merges (deterministic source ordering, first non-empty locale value resolution, deterministic tag sorting)
  - `validateLlmExerciseI18nContract(...)` failures for missing locale blocks, missing localized names (`sourceExternalId`/`canonicalExerciseId`), and missing `preset_tags` labels
- **Refined**: `mergeExerciseI18nIntoLocales(...)` in `scripts/ingestion/i18nMerge.ts` now accepts optional injected file I/O dependencies (default behavior unchanged) to enable safe unit testing without mutating real locale files.
- **Cleaned**: Runtime-generated ingestion artifacts removed from `data/ingestion/reports/` and `data/ingestion/queues/`; only `.gitkeep` placeholders remain tracked.
- **Verification**:
  - `npm run test:ingestion` passes (3 tests, 0 failures)
  - `npm run ingest -- --config data/ingestion/sources.example.json --dry-run` passes (run `ingestion-20260409-192431-d638c9`: accepted 557, skipped 218, duplicate 100, rejected 0)
  - `npm run build` passes (TypeScript + Vite + PWA generation)

### Tooling Support — Exercise i18n Contract Gating + Deterministic Multi-Candidate Merge (2026-04-09)
- **Fixed**: High-severity i18n merge collapse in `scripts/ingestion/i18nMerge.ts` where updates were reduced to one record per canonical id and could drop valid localized values.
- **Implemented**: Deterministic grouped merge resolution per canonical exercise id:
  - preserve all update candidates per canonical id
  - keep deterministic candidate order (`sourceId` + `sourceExternalId`)
  - resolve localized name/instructions/tag labels by scanning candidates and taking the first non-empty value
  - preserve tag union behavior with deterministic sorting
- **Implemented**: `validateLlmExerciseI18nContract(...)` in `scripts/ingestion/i18nMerge.ts` and wired it into `scripts/runIngestion.ts` for `llm-json` exercise candidates.
  - enforces visibility of prompt-contract gaps for `ca/es/en` locale blocks, localized exercise names, and required `preset_tags` labels
  - emits explicit reasons in ingestion items (review/duplicate/rejected paths) instead of relying on silent fallback only
- **Refactored**: Removed llm-json double-fetch in `scripts/runIngestion.ts`.
  - payload is now loaded once per source and reused for both candidate parsing (`buildLlmJsonCandidatesFromPayload`) and i18n parsing (`parseLlmIngestionI18n`)
- **Updated**: `data/ingestion/llm-example.json` now includes top-level `i18n` with valid `ca/es/en` contract values and canonical exercise enum values, ensuring example verification runs exercise the i18n path.
- **Verification**:
  - `npm run ingest -- --config data/ingestion/sources.example.json --dry-run` passes (run `ingestion-20260409-191146-256c58`: accepted 557, skipped 218, duplicate 100, rejected 0).
  - report confirms llm-json source candidates processed (`Split_Squat_Iso_Hold` + `rehab_knee_stability`) with successful ingestion.
  - `npm run build` passes (TypeScript + Vite build + PWA generation).

### Tooling Support — Exercise Ingestion i18n Automation + Duplicate-Safe Refresh (2026-04-09)
- **Added**: `scripts/ingestion/i18nMerge.ts` to centralize ingestion-time locale merges for exercises/planning with rollback-safe writes.
- **Implemented**: Top-level `i18n` payload parsing for `llm-json` source inputs during `npm run ingest`, including localized exercise names/instructions and localized tag labels.
- **Implemented**: Exercise locale writes to `src/i18n/locales/{ca,es,en}/exercises.json` using canonical exercise id keys.
  - writes exercise names at `exercises.<canonicalExerciseId>`
  - writes optional instructions at `exercises.instructions.<canonicalExerciseId>`
  - keeps deterministic key sorting for stable reruns
- **Implemented**: Tag localization merge into `src/i18n/locales/{ca,es,en}/planning.json` under `planning.preset_tags.<tag>` using ingested exercise tags.
- **Implemented**: Locale fallback chain for all ingestion-managed values:
  - locale payload value -> English payload value -> existing locale value -> humanized fallback
- **Implemented**: Duplicate-safe rerun behavior in `scripts/runIngestion.ts`:
  - duplicate exercise candidates still produce i18n refresh updates for the matched canonical exercise id when schema validation succeeds
  - dedup/report statuses remain unchanged (`duplicate` still reported as duplicate)
- **Updated**: `scripts/runIngestion.ts` to append i18n write paths to report `filesWritten` while preserving existing console summary format.
- **Updated**: `data/ingestion/prompts/exercises-llm-chat.prompt.txt` to explicitly require `i18n.<locale>.preset_tags.<tag>` labels for tags used by generated exercises (ca/es/en).
- **Verification**: `npm run ingest -- --config data/ingestion/sources.example.json --dry-run` passes (run `ingestion-20260409-173248-bf5cbd`: accepted 557, skipped 218, duplicate 100, rejected 0).
- **Verification**: `npm run build` passes (TypeScript + Vite build + PWA generation).

### Tooling Support — Preset Batch i18n Split + Hardcoded Preset Seeding (2026-04-09)
- **Updated**: `data/ingestion/prompts/presets-llm-chat.prompt.txt` to require strict top-level JSON with both `presets` and `i18n` payloads, fixed ATTACHED typo, and added explicit schema/validation requirements for `ca/es/en` preset name/description plus `preset_tags` labels.
- **Updated**: `data/ingestion/prompts/exercises-llm-chat.prompt.txt` to require strict top-level JSON with both `exercises` and `i18n` payloads, including localized exercise names (`ca/es/en`) and optional localized instructions.
- **Implemented**: `scripts/ingestion/presetGenerator.ts` now supports all response shapes: legacy array, legacy `{ presets: [...] }`, and new `{ presets: [...], i18n: {...} }`.
- **Implemented**: Preset i18n merge/write flow to `src/i18n/locales/{ca,es,en}/planning.json`:
  - writes names/descriptions under `planning.ingested_presets.<canonicalPresetId>.name|description`
  - writes tag labels under `planning.preset_tags.<tag>`
  - applies fallback chain per locale: locale payload -> English payload -> existing locale value -> humanized id/tag fallback
  - guarantees `requiredTags` from accepted presets are represented across all 3 locales
  - allows reruns with duplicate preset IDs to still refresh i18n values when schema validation passes
- **Implemented**: Automatic hardcoded preset seeding from `src/data/presets.ts` into ingestion catalog output (default `data/ingestion/presets/catalog.json`) without duplicate IDs, preserving existing entries and deterministic id sorting.
- **Implemented**: Stable ingestion metadata for seeded hardcoded presets to keep repeated runs consistent.
- **Verification**: `npm run build` passes (TypeScript + Vite production build).
- **Verification**: `npm run presets -- --response-file <tmp> --output <tmp>` preserves expected summary lines (`Report`, `Accepted presets`, `Rejected presets`, `Catalog updated`) and seeds hardcoded preset IDs.

### Tooling Support — Manual LLM Prompt Templates for Ingestion (2026-04-09)
- **Added**: `data/ingestion/prompts/presets-llm-chat.prompt.txt` for manual chat usage that targets the preset batch contract consumed by `scripts/generatePresetBatch.ts` / `scripts/ingestion/presetGenerator.ts`.
- **Added**: `data/ingestion/prompts/exercises-llm-chat.prompt.txt` for manual chat usage that targets the LLM JSON ingestion contract consumed by `scripts/runIngestion.ts` via `scripts/ingestion/adapters/llmJsonAdapter.ts`.
- **Implemented**: Clearly marked variable sections for custom exercise-type instructions in both templates.
- **Implemented**: Strict JSON-only output requirement and explicit schema/enums/constraints aligned with ingestion validators.

### Tooling Maintenance — Step 18 CLI Environment Loading (2026-04-09)
- **Fixed**: `npm run presets` and related Step 18 CLIs could not read `CLAUDE_API_KEY` (and other provider keys) from `.env` because Node entrypoints did not load dotenv.
- **Changed**: Added `import 'dotenv/config'` to `scripts/generatePresetBatch.ts`, `scripts/runIngestion.ts`, and `scripts/generateExercisePhotos.ts`.
- **Changed**: Added `dotenv` as a dev dependency in `package.json` and regenerated `package-lock.json`.
- **Verification**: `npm run presets -- --prompt "test prompt"` now passes the missing-key check and correctly reaches free-tier gating.
- **Verification**: `npm run build` passes (TypeScript + Vite production build + PWA generation).

### Tooling Maintenance — npm Peer Dependency Resolution (2026-04-09)
- **Fixed**: `npm i` ERESOLVE conflict between `vite@8` and `vite-plugin-pwa@1.2.0` peer range.
- **Changed**: Aligned toolchain versions in `package.json` to `vite@^7.3.2` and `@vitejs/plugin-react@^5.2.0`.
- **Updated**: Regenerated lockfile via successful `npm i`.
- **Verification**: `npm i` succeeds without peer errors.
- **Verification**: `npm run build` passes (TypeScript + Vite production build + PWA generation).
- **Verification**: `npm run lint` passes (`tsc --noEmit`).

### Step 16 Planning — Ethical Gamification Documentation Foundation (2026-04-09)
- **Added**: `specs/features/16-ethical-gamification.md` as the Step 16 source-of-truth spec with guardrails, forbidden patterns, Duolingo reference boundaries, pre-execution phases, explicit UI/UX refactor policy, metrics, and completion checklists.
- **Updated**: `specs/STATUS.md` Step 16 checklist with two prerequisite gates: source-of-truth read requirement and pre-execution UI/UX refactor decision gate.
- **Updated**: `tasks/todo.md` with a completed Step 16 documentation foundation checklist to track restoration work.
- **Verification**: `npm run build` passes (TypeScript + Vite production build).

### Step 18 — Multi-Source Content Ingestion Pipeline (2026-04-09)
- **Added**: Core ingestion modules under `scripts/ingestion/` (contracts, adapters, normalizers, validators, dedup, review queue, reports, merge, photo pipeline, preset generator, and shared CLI/path utilities).
- **Added**: Step 18 CLI entrypoints (`scripts/runIngestion.ts`, `scripts/generateExercisePhotos.ts`, `scripts/generatePresetBatch.ts`) and npm scripts (`ingest`, `photos`, `presets`).
- **Added**: Ingestion artifacts/config roots (`data/ingestion/*`) and exercise image placeholder root (`public/exercises/images/.gitkeep`).
- **Implemented**: Deterministic flow with source-license validation, canonical normalization + schema validation, dedup guardrails (registry/slug/similarity/alias map), review gating, dry-run support, and rollback-safe writes.
- **Implemented**: Photo-generation integration from ingestion accepted IDs plus mode-based photo generation (`all`, `missing`, `single`, `from-report`) with free-tier-first provider selection and one-model-per-run metadata locking.
- **Implemented**: Claude preset batch generation flow with output validation and available-exercise ID constraints.
- **Verification**: `npm run build` passes (TypeScript + Vite production build).
- **Verification**: `npm run ingest -- --config data/ingestion/sources.example.json --dry-run` passes (run `ingestion-20260409-115055-a84a7a`: accepted 557, skipped 218, duplicate 100, rejected 0).
- **Verification**: `npm run photos -- --help` and `npm run presets -- --help` both pass offline and print expected CLI usage.

### Step 17 — Formatter + Session Hooks (2026-04-09)
- **Added**: `@biomejs/biome` as the repository formatter/linter baseline.
- **Added**: Biome scripts in `package.json` (`format`, `format:check`, `lint:biome`).
- **Added**: `biome.json` generated from Biome v2 and tuned to project style (2-space indentation, single quotes, semicolons as needed, trailing commas, 100-char line width).
- **Updated**: `.vscode/settings.json` with Biome default formatter + format-on-save and Biome organize-import actions.
- **Added**: `.agents/hooks/hooks.json` with a `session-end` hook that runs `npm run format`.
- **Executed**: Initial repository normalization via `npm run format` (104 files scanned, 58 files fixed).
- **Verification**: `npm run build` passes (TypeScript + Vite production build).

### Step 18 Planning — Multi-Source Content Ingestion Pipeline (2026-04-08)
- **Planned**: New Step 18 to ingest exercises, presets, and media from multiple sources through provider adapters (external APIs + LLM responses).
- **Planned**: Canonical transformation layer for exercise/preset payloads with strict schema validation before merge.
- **Planned**: Dedup guardrails combining source IDs, slug checks, title+muscle similarity, and alias mapping to avoid duplicate exercises.
- **Planned**: Node image pipeline for one representative photo per exercise with free-tier-first provider abstraction (use Nanobanana only if its free tier is available, otherwise auto-select the best free provider), supporting full regen and incremental generation.
- **Planned**: Image consistency guardrails include passing a style reference image in prompts and using one single model for all exercise images in a generation cycle.
- **Planned**: Preset-batch generation workflow using Claude prompt-in/preset-JSON-out, constrained to currently available exercise IDs.
- **Planned**: Operational safeguards (dry-run, ingest reports, manual review queue, rollback-safe merge process).
- **Added TODO**: Follow-up product item to manually edit LLM-imported plans before import and optionally save them as user presets.

### Weight Selector One-Time Cascade Normalization (2026-04-08)
- **Changed**: Hierarchical inferior-weight auto-selection now triggers only once per equipment group (`manueles`, `barra`) on the first selection-like action.
- **Changed**: After that first cascade, all chip interactions are normalized to isolated per-weight toggle behavior (select/deselect only the clicked weight).
- **Changed**: Custom weight add flow follows the same rule: first add can cascade once, later adds are isolated.
- **Kept**: Defaults remain unselected (`DEFAULT_AVAILABLE_WEIGHTS` empty arrays) and existing i18n usage unchanged.
- **Verification**: `npm run build` passes with zero errors.

### Weight Selector Hierarchical Selection Update (2026-04-08)
- **Changed**: `DEFAULT_AVAILABLE_WEIGHTS` now initializes `manueles` and `barra` with empty arrays, so weights are never preselected by default.
- **Changed**: `WeightSelector` now auto-selects all inferior weights (same equipment) when selecting an unselected weight chip.
- **Changed**: Custom weight add flow now follows the same hierarchy rule: adding/selecting a custom value also selects all inferior preset/custom weights.
- **Kept**: Deselection remains non-destructive; tapping a selected chip only deselects that chip.
- **Verification**: `npm run build` passes with zero errors.

### Onboarding & UserConfig Refactor (2026-04-09)
- **Removed**: `UserProfile` type and profile step from onboarding — was only used for preset filtering with minimal impact
- **Removed**: `weeklyProgression` from UserConfig — was always overridden by PlanCreator slider
- **Removed**: `availableDaysPerWeek: number` — replaced with `trainingDays: DayOfWeek[]` for specific weekday selection
- **Removed**: Free-text restriction textarea — moved idea to Step 15 (LLM free-form context)
- **Fixed**: Restriction key mismatch — old keys (`knee`, `ankle`, `back`, `shoulder`, `hip`, `wrist`) matched nothing in enrichment data. Now uses `RestrictionCondition` type: `rehab_genoll | rehab_lumbar | rehab_turmell | tendinitis_rotuliana`
- **Fixed**: WeightSelector custom weight UX — custom weights now appear in the toggleable grid after being added
- **Expanded**: Default weight presets — manueles 1-40kg, barra 20-120kg (was 2-32 / 20-100)
- **Changed**: Dashboard session logic — from "today by day-of-week" to "next consecutive uncompleted session"
- **Changed**: PlanCreator — shows all presets (not profile-filtered) with text search and tag filter
- **Changed**: Onboarding — single step instead of 2 (removed Step1Profile), weekday toggle buttons instead of numeric day count
- **Updated**: Settings page — removed profile section, added weekday toggles, uses real restriction conditions
- **Updated**: i18n (ca/es/en) — new restriction labels, weekday names, preset search/tag keys
- **Files changed**: 20+ files across types, data, services, stores, components, pages, i18n

### Pre-Built Exercise Pipeline (2026-04-08)
- **Architecture change:** Exercises are now pre-built at development time instead of enriched at runtime.
- **Added**: `data/raw/free-exercise-db.json` — archived raw source (873 exercises from free-exercise-db)
- **Added**: `scripts/buildExercises.ts` — build-time pipeline that merges raw data + enrichment map + muscle/equipment mappings → produces `public/exercises/exercises.json` (100 enriched exercises)
- **Added**: `npm run build:exercises` script
- **Simplified**: `exerciseLoader.ts` — reduced from 80 lines of runtime processing to 6 lines (fetch + return)
- **Bundle impact**: `exerciseEnrichment.ts` (~960 lines) and mapping tables from `muscleGroups.ts` are now tree-shaken out of the client bundle (no longer imported at runtime)
- **Updated**: `verify.cjs` — now validates against the enriched JSON (source of truth) instead of cross-referencing raw + enrichment
- **Updated**: specs (OVERVIEW.md, STATUS.md, 02-exercises.md) to reflect new data pipeline
- **Data flow**: `data/raw/free-exercise-db.json` + `src/data/exerciseEnrichment.ts` + `src/data/muscleGroups.ts` → `scripts/buildExercises.ts` → `public/exercises/exercises.json`
- **Rationale**: Client no longer downloads 873 raw exercises only to keep 100; no runtime muscle/equipment mapping or enrichment merging. Simpler loader, smaller bundle, faster client startup. Our enriched JSON becomes the true source of truth. Future remote source updates go through the build script.

### Decision 7 — Pre-Built Exercise Pipeline
- **Decided:** `public/exercises/exercises.json` is our source of truth — already enriched, mapped, and ready for client consumption.
- **Build-time script** (`scripts/buildExercises.ts`) takes raw free-exercise-db + enrichment map + muscle/equipment mappings and produces the final JSON.
- **Raw remote data** archived at `data/raw/free-exercise-db.json` for rebuild capability and future source updates.
- **Client loader** is a simple fetch + type assertion — zero processing.
- **Rationale:** The previous model fetched 873 raw exercises, filtered to ~100, applied muscle mappings, equipment mappings, and enrichment merges on every page load. This is wasteful since the data only changes when developers modify enrichment. Moving processing to build-time eliminates runtime cost, reduces bundle size (enrichment map tree-shaken), and establishes our JSON as the canonical source — important when we add custom exercises or additional remote sources in the future.

### Skip Set Button (2026-04-07)
- **Replaced**: `skipExercise` action with `skipSet` in sessionStore — advances one set (not entire exercise), no ExecutedSet record, no rest timer; handles both standard and circuit modes
- **Updated**: useSession hook — exports `skipSet` instead of `skipExercise`
- **Updated**: SetLogger component — added `onSkipSet` prop with secondary-style button inside the component
- **Updated**: Session page — removed standalone skip-exercise button, passes `skipSet` to SetLogger
- **Updated**: i18n keys in all 3 languages — replaced `session.skip_exercise` with `session.skip_set` (ca: "Saltar sèrie", es: "Omitir serie", en: "Skip set")

### Exercise Data Quality Audit (2026-04-07)
- **Added**: `primaryMusclesExtra` and `secondaryMusclesExtra` optional fields to `EnrichmentData` type — allows enrichment to add our custom taxonomy muscles (e.g. `oblics`, `psoes`, `mobilitat_cadera`) that don't exist in free-exercise-db vocabulary
- **Updated**: `exerciseLoader.ts` merges extra muscles with auto-mapped muscles from raw data (with deduplication)
- **Added**: Muscle extras to 37 existing enriched exercises covering all 8 previously empty custom muscle groups: `tibial_anterior`, `psoes`, `oblics`, `estabilitzadors_cadera`, `mobilitat_cadera`, `mobilitat_turmell`, `mobilitat_toracica`, `fascies`
- **Added**: 3 new enriched exercises: `Anterior_Tibialis-SMR`, `Decline_Oblique_Crunch`, `Dumbbell_Side_Bend` (total: 83 enriched)
- **Added**: ca/es/en translations for 3 new exercises
- **Fixed**: EN instruction translations added for 10 exercises (were only in CA/ES)
- **Result**: All 23 muscle groups now have ≥ 3 enriched exercises (previously 8 groups had zero); all 83 exercise name translations complete in 3 languages; 10 exercises have instruction translations in all 3 languages
- **Noted**: `trx` Equipment type has 0 exercises in raw data (candidate for future cleanup)

### Available Weights Configuration and Snapping (2026-04-07)
- **Added**: `AvailableWeights` type and `availableWeights` field to `UserConfig` (per equipment type: `manueles`, `barra`)
- **Added**: `DEFAULT_AVAILABLE_WEIGHTS` constant with sensible defaults for dumbbells and barbell
- **Added**: `snapToAvailableWeight()` pure function in `src/services/planning/weightSnapping.ts` — supports `up`, `down`, `nearest` directions
- **Added**: `getAdjacentWeights()` helper for session UI weight navigation
- **Integrated**: Planning engine (`computeLoadTarget`) now computes and snaps `weightKg` for weight-metric exercises based on user's available weights
- **Added**: `WeightSelector` reusable component — chip-toggle UI for common weights + custom weight input
- **Added**: Available weights section in Settings page (visible when dumbbells or barbell selected)
- **Added**: Available weights section in Onboarding Step 3 (visible when dumbbells or barbell selected)
- **Added**: Weight up/down controls in `ActiveExercise` during session execution using adjacent available weights
- **Added**: `updateCurrentExerciseWeight` action in sessionStore for runtime weight adjustment
- **Added**: i18n keys in all 3 languages (ca/es/en) for available weights UI, onboarding weights, and session weight navigation
- **Updated**: `useUserStore` with `availableWeights` state and `setAvailableWeights` action
- **Updated**: `PlanCreator` passes `availableWeights` when generating plans

### QA Pass (2026-04-05) — Session, Full Plan, and Gemini Prompt
- **Improved**: Pre-session exercise list uses derived (useMemo) list based on executionMode for reactive reordering
- **Fixed**: Circuit mode description — removed "short rest" / "poc descans" / "poco descanso" references from ca/es/en
- **Removed**: Second skip button (skipBlock / "next exercise") — single "skip exercise" button remains in active session
- **Removed**: `skipBlock` action from sessionStore, useSession, and i18n keys
- **Added**: Expandable per-session detail in plan view — compact SessionPreview rows expand to show muscle group targets with sets, reps, RPE, rest
- **Added**: Weekly progression field (0-10 scale) in plan creation configure step with range slider
- **Updated**: Gemini SYSTEM_PROMPT — progression rules tied to 0-10 scale, deload at multiples of 4 weeks at 60%, conservative rehab behavior
- **Updated**: buildUserMessage — includes progression level and deload schedule in prompt
- **Updated**: All progression rules — deload percentage standardized to 60% across linear/undulating/block types
- **Propagated**: weeklyProgression through UserConfig → PlanCreator → planningStore → planningEngine → /api/generate-plan

### QA Pass (2026-04-03) — UX, Language, Planning, Session
- **Improved**: Language selector — replaced button grid with native `<select>` dropdown in BottomNav for mobile scalability
- **Fixed**: Language persistence — added LanguageSelector to Landing and Onboarding pages so language choice persists through the full flow
- **Improved**: Planning muscle-group UX — replaced cycle-click with per-group `<select>` dropdowns in 2-col responsive grid
- **Added**: "Let AI decide" toggle for muscle group priorities in plan creation
- **Added**: Explanation and helper microcopy for muscle group weighting step
- **Added**: Deterministic preset → muscle group preselection (≥25% → High, 10-24% → Medium, <10% → Low)
- **Fixed**: Muscle group selector completeness — replaced hardcoded 13-group `MAIN_MUSCLE_GROUPS` with full 23-group `ALL_MUSCLE_GROUPS` from `muscleGroups.ts` so all groups (including secondary-only like `avantbras`, `oblics`, `trapezi`, `mobilitat_turmell`) are selectable in PlanCreator
- **Added**: Custom presets — save, load, and delete user-created presets from IndexedDB
- **Added**: Pre-session preview page (SessionPreStart) — shows exercises, sets/reps/weights before session starts
- **Added**: Delete exercises from pre-session preview
- **Added**: Execution mode selector (Standard/Circuit) moved to pre-session preview only
- **Locked**: Execution mode cannot be changed once session is active (read-only circuit indicator)
- **Added**: Exercise instruction i18n — component-level fallback from translated instructions to raw English
- **Added**: Catalan and Spanish translations for 10 representative exercise instructions
- **Added**: Exercise image architecture — ExerciseImage type, placeholder SVG, representative image in session and pre-start views
- **Updated**: UX reviewer agent — added "Language as dropdown" criterion

### QA Pass (2026-03-31) — Complete
- **Fixed**: Exercise title translation bug — `nameKey` had double namespace prefix (`exercises:exercises:...`)
- **Fixed**: Session viewport overlap — buttons hidden under sticky bottom nav when instructions expanded (pb-8 → pb-24)
- **Added**: Session cancel/pause/discard — cancel button, save partial progress, or discard entirely
- **Added**: Execution mode toggle (Standard vs Circuit) — circuit mode cycles through exercises one set at a time
- **Moved**: Language selector from fixed top-right position into "More" menu in bottom nav bar
- **Added**: Settings page (`/settings`) — edit profile, equipment, restrictions, days/week, minutes/session
- **Removed**: Weekly view from Planning tab — only month view remains
- **Improved**: Quick session — expandable muscle group selector with duration picker
- **Added**: Muscle group pre-selection with priority weights (high/medium/low) in plan creation
- **Fixed**: Plan view compact mode — shows all muscle groups instead of 3 + ellipsis

---

## Architecture Decisions — Full Rationale

### Decision 1 — Remove Server-Side AI (Gemini API)
- **Decided:** `api/generate-plan.ts` and the `planningEngine.ts` API client are removed.
- Replaced by two user-facing paths: Deterministic Planning and User-Owned LLM Assistant (see below).
- Rationale: eliminates infrastructure cost and API key management; shifts control to the user.

### Decision 2 — Deterministic Planning Engine
The new plan creation wizard lets the user configure everything manually; an on-device algorithm builds the plan.

**User inputs (wizard steps):**
1. Sessions per week + available minutes per session.
2. Muscle groups to target.
3. Specific exercises per muscle group — catalog is pre-filtered by the user's owned equipment/restrictions (from onboarding).
4. Option to start from a **preset** (built-in or user-saved) and adjust from there.

**Algorithm rules:**
- Each exercise in the catalog declares a `progressionMetric: 'weight' | 'reps' | 'seconds'`. The algorithm increments the relevant metric over the mesocycle.
- Random selection within the filtered exercise pool per muscle group.
- Anti-repeat: no exercise may appear in session N *and* session N+1 (two consecutive sessions).
- No exercise from the same muscle group is repeated within the same session.
- Duration constraint: total estimated sets × average set time ≤ user's available minutes.

### Decision 3 — User-Owned LLM Assistant Path ("Let AI do the job")
An alternative to the wizard for users who prefer AI-assisted configuration.

**Flow:**
1. App generates a **prompt template** describing the task and JSON contract, plus a **CSV attachment** containing:
   - Exercise catalog filtered by user's equipment (id, name, muscles, progressionMetric, equipment).
   - User's owned equipment and restrictions.
   - The expected JSON schema the app will validate against.
2. Numbered step-by-step instructions are shown so the user knows exactly how to proceed.
3. User copies the prompt + attaches the CSV into their LLM of choice (ChatGPT, Claude, Gemini, etc.).
4. User copies the LLM's JSON output and pastes it back into the app.
5. App validates the JSON against the schema before importing; shows clear errors if invalid.
- **Note (idea):** for any large reference data that would bloat the prompt but is stable, pack it into the CSV instead of inline text to avoid clipboard size limits.

### Decision 4 — Presets
- Built-in presets cover the most common training profiles (already partially implemented).
- User can load a preset as a starting point and modify it before saving.
- User-saved presets persist in IndexedDB (already implemented); extend to cover the full new wizard configuration shape.

### Decision 5 — Static Data Serving (exercises, presets, i18n)
- **Decided:** Keep static files served directly from Vercel's edge CDN. No serverless function endpoints.
- Exercises: `/public/exercises/exercises.json` fetched at runtime, merged with enrichment client-side.
- Presets + i18n: bundled in the JS bundle (tiny, change infrequently).
- **Rationale:** Serverless functions incur cold-start latency + function invocation costs. Static files on Vercel CDN are free, faster (no compute), and sufficient for this app's data size (~97 exercises, 5 presets, 3 locales). A Vercel Function approach only pays off at scale (thousands of exercises, frequent data updates, multiple external consumers).
- **Reverted:** A prior implementation (Step 13) added `api/exercises.ts`, `api/presets.ts`, `api/i18n/[locale].ts` with ETag/Cache-Control + client-side localStorage cache — removed because it increased infra cost with no real benefit at this scale.

### Decision 6 — Ethical Gamification (kept, scope defined)
- Achievements tied exclusively to sustainable habits: consistency streaks, deload compliance, warm-up completion, injury-safe progression.
- Non-speculative points/tokens used only for in-app milestones and reflection prompts — never for pay-to-win or pressure mechanics.
- Streak recovery safeguards so missing a session does not trigger guilt loops.
- Optional patronage model (tips, supporter badge) with no paywalled core functionality.
- Anti-addictive guardrails defined before any engagement mechanic ships.

---

## Architecture Migration — Fase 1 (Complete)
- Migrated from user-provided Claude API key (browser-side) to server-side Gemini 2.5 Flash via Vercel Serverless Function
- Onboarding simplified from 3 steps to 2 (removed Claude API key step)
- Removed crypto-js dependency (no longer needed)
- Created `api/generate-plan.ts` — Vercel Serverless Function (POST, Gemini 2.5 Flash, rate limiting)
- Created `src/services/planning/planningEngine.ts` — frontend service (calls /api/generate-plan)
- Updated all specs, i18n, and agent configs to reflect new architecture

---

## Completed Work Per Step

### Step 14 — ✅ Complete (2026-04-06)
- [x] `ProgressionMetric` type added to `src/types/exercise.ts` + `progressionMetric` field on `Exercise`
- [x] `ExerciseAssignment` type and optional `exerciseAssignments` field added to `SessionTemplate` in `src/types/planning.ts`
- [x] `weeklyProgression` made required in `UserConfig` (`src/types/user.ts`)
- [x] `progressionMetric` added to all 97 entries in `src/data/exerciseEnrichment.ts` (weight/reps/seconds per exercise)
- [x] `exerciseLoader.ts` merges `progressionMetric` from enrichment
- [x] `planningEngine.ts` fully rewritten: deterministic synchronous algorithm, no network calls
  - Anti-repeat constraint (no exercise in consecutive sessions)
  - In-session muscle group uniqueness
  - Duration check + trim (removes lowest-priority targets if over budget)
  - Progression rules applied: weekly volume scaled by `weeklyProgression` (0–10), deload at week % 4
  - Undulating variation (odd/even session multipliers)
- [x] `planningStore.ts` `generate()` made synchronous, accepts `exerciseSelections` option
- [x] `PlanCreator.tsx` wizard updated:
  - Removed `generating` spinner step, removed `aiDecides` toggle
  - Added `exercises` step with auto/manual exercise selection
  - Per-muscle-group accordion with exercise checkboxes when manual
  - Instant plan generation on button click
- [x] i18n keys added/updated in ca/es/en (12 new keys, 3 updated keys)
- [x] AI references replaced with algorithm references in all i18n strings
- [x] `npm run build` passes with zero errors

### Step 1 — ✅ Complete
- [x] `specs/OVERVIEW.md` — product vision, architecture, stack
- [x] `specs/CONVENTIONS.md` — code style, imports, patterns
- [x] `specs/DATA_MODEL.md` — all TypeScript types + IndexedDB schema
- [x] `specs/AGENT_GUIDE.md` — agent roles and workflow
- [x] `specs/STATUS.md` — this file
- [x] `specs/features/01-scaffold.md` through `10-polish.md` — all 10 feature specs
- [x] `specs/prompts/planning-system.md` — LLM system prompt
- [x] Vite 5 + React 18 + TypeScript 5 project initialized
- [x] Dependencies: react-router-dom, zustand, i18next, recharts, lucide-react, tailwindcss
- [x] Tailwind CSS v3 configured (tailwind.config.js, postcss.config.js, index.css)
- [x] React Router v6 with route shells (Landing, Onboarding, Dashboard, Planning, Session, Stats)
- [x] i18next configured with ca/es/en common.json files
- [x] Path alias `@/` → `src/` configured (tsconfig.json + vite.config.ts)
- [x] Landing page with 3 value propositions + CTA
- [x] `vercel.json`, `favicon.svg`
- [x] `npm run build` passes with zero errors

#### Files Created (Step 1)
```
specs/OVERVIEW.md, CONVENTIONS.md, DATA_MODEL.md, AGENT_GUIDE.md, STATUS.md
specs/features/01-scaffold.md through 10-polish.md
specs/prompts/planning-system.md
index.html, vite.config.ts, tsconfig.json, tsconfig.app.json, tsconfig.node.json
tailwind.config.js, postcss.config.js, vercel.json
public/favicon.svg
src/main.tsx, src/App.tsx, src/index.css, src/vite-env.d.ts
src/i18n/index.ts
src/i18n/locales/{ca,es,en}/common.json
src/pages/Landing.tsx, Dashboard.tsx, Planning.tsx, Session.tsx, Stats.tsx
src/pages/Onboarding/index.tsx
```

### Step 2 — ✅ Complete
- [x] `src/types/exercise.ts` — MuscleGroup, Equipment, ExerciseTag, Restriction, Exercise types
- [x] `public/exercises/exercises.json` — free-exercise-db (873 exercises)
- [x] `src/data/muscleGroups.ts` — muscle taxonomy + free-exercise-db mapping
- [x] `src/data/exerciseEnrichment.ts` — 97 exercises enriched with tags, restrictions, categories
- [x] `src/services/exercises/exerciseLoader.ts` — loads JSON, merges enrichment
- [x] `src/services/exercises/exerciseFilter.ts` — multi-criteria filter
- [x] `src/stores/exerciseStore.ts` — Zustand store
- [x] `src/hooks/useExercises.ts` — auto-fetch hook
- [x] `src/i18n/locales/{ca,es,en}/exercises.json` — 97 exercise names × 3 languages
- [x] `src/i18n/locales/{ca,es,en}/muscles.json` — 23 muscle groups × 3 languages
- [x] `src/i18n/index.ts` — exercises + muscles namespaces registered

### Step 4 — ✅ Complete
- [x] `src/types/planning.ts` — Mesocycle, SessionTemplate, LoadTarget types
- [x] `src/types/session.ts` — ExecutedSet, ExecutedSession types
- [x] `src/types/user.ts` — UserProfile, UserConfig types
- [x] `src/services/db/database.ts` — IndexedDB init with idb, 4 object stores, versioned schema
- [x] `src/services/db/configRepository.ts` — get/set/getAll config CRUD
- [x] `src/services/db/mesocycleRepository.ts` — save/get/getActive/list/update mesocycle CRUD
- [x] `src/services/db/sessionRepository.ts` — atomic session+sets save, queries by date/exercise
- [x] `src/hooks/useDB.ts` — React hook wrapping all repositories
- [x] `idb` dependency added to package.json

### Step 5 — ✅ Complete (updated in Fase 1 migration)
- [x] `src/stores/userStore.ts` — Zustand store for onboarding state, IndexedDB persistence (Claude key code removed in Fase 1)
- [x] `src/pages/Onboarding/index.tsx` — 2-step stepper container with progress indicator and navigation
- [x] `src/pages/Onboarding/Step1Profile.tsx` — Profile type selection (athlete/rehab/general)
- [x] ~~`src/pages/Onboarding/Step2ClaudeKey.tsx`~~ — Removed in Fase 1 migration

### Step 6 — ✅ Complete
- [x] `src/services/exercises/sessionGenerator.ts` — Pure session generation algorithm (filter, anti-repeat, weighted random, duration)
- [x] `src/data/progressionRules.ts` — Linear, undulating, block progression rules

### Step 7 — ✅ Complete
- [x] `src/data/presets.ts` — 5 training presets with muscle distribution, tags, profiles
- [x] `src/services/planning/planningAdjuster.ts` — Skip/unskip session, adjust load
- [x] `src/stores/planningStore.ts` — Zustand store for planning (generate, save, load, skip, adjust, deactivate)
- [x] `src/i18n/locales/{ca,es,en}/planning.json` — Planning namespace (3 languages)
- [x] `src/i18n/index.ts` — Planning namespace registered

### Step 8 — ✅ Complete
- [x] `src/stores/sessionStore.ts` — Zustand store for execution (start, logSet, skip, rest timer, finish, save to IndexedDB)
- [x] `src/components/session/ActiveExercise.tsx` — Exercise display: name, muscles, targets, instructions
- [x] `src/components/session/SetLogger.tsx` — Per-set input: reps actual + weight actual with +/- controls
- [x] `src/components/session/RestTimer.tsx` — Countdown timer with skip button
- [x] `src/components/session/SessionSummary.tsx` — Post-session: exercises done, volume, time, RPE slider, notes
- [x] `src/hooks/useSession.ts` — React hook composing session store
- [x] `src/pages/Session.tsx` — Full session page: active exercise → set logger → rest timer → summary → save
- [x] `src/i18n/locales/{ca,es,en}/common.json` — Expanded session namespace (20+ new keys × 3 languages)
- [x] `npm run build` passes with zero errors

### Step 9 — ✅ Complete
- [x] `src/i18n/locales/{ca,es,en}/stats.json` — Stats namespace (3 languages)
- [x] `src/i18n/locales/{ca,es,en}/common.json` — Dashboard keys added (3 languages)
- [x] `src/i18n/locales/{ca,es,en}/planning.json` — Plan creator keys added (3 languages)
- [x] `src/i18n/index.ts` — Stats namespace registered
- [x] `src/stores/userStore.ts` — Added loadUserConfig action
- [x] `src/services/db/sessionRepository.ts` — Added listSetsByDateRange, listAllSessions, listAllSets
- [x] `src/hooks/useDB.ts` — Added new session repository methods
- [x] `src/components/ui/BottomNav.tsx` — Bottom navigation bar (Dashboard/Planning/Session/Stats)
- [x] `src/components/ui/LanguageSelector.tsx` — Moved from bottom-right to top-right
- [x] `src/components/planning/PlanCreator.tsx` — Multi-step plan creation wizard (preset → config → generate → preview → save)
- [x] `src/components/planning/WeekView.tsx` — Weekly view with 7-day strip and session details
- [x] `src/components/planning/MonthView.tsx` — Monthly view with week navigation
- [x] `src/components/planning/SessionPreview.tsx` — Session template preview (compact and full modes)
- [x] `src/components/stats/VolumeChart.tsx` — Stacked area chart by muscle group (Recharts)
- [x] `src/components/stats/ProgressionChart.tsx` — Line chart for exercise progression (Recharts)
- [x] `src/components/stats/AdherenceChart.tsx` — Bar chart for weekly adherence (Recharts)
- [x] `src/pages/Dashboard.tsx` — Full dashboard: greeting, streak, today's session, weekly load, plan view, 4-week summary
- [x] `src/pages/Planning.tsx` — Plan management: create new plan or view active plan (week/month toggle)
- [x] `src/pages/Stats.tsx` — Stats page: period selector, volume/progression/adherence charts, PR table, export/import placeholders
- [x] `src/App.tsx` — Added BottomNav
- [x] `npm run build` passes with zero errors

### Step 10 — ✅ Complete
- [x] `vite-plugin-pwa` installed and configured in `vite.config.ts` (autoUpdate, manifest, workbox caching for exercises.json)
- [x] `src/services/db/exportImport.ts` — Export all IndexedDB data as versioned JSON, import with validation and replace
- [x] `src/components/data/ExportButton.tsx` — Export button with loading/error states
- [x] `src/components/data/ImportButton.tsx` — Import button with file picker, confirm dialog, loading/success/error states
- [x] `src/components/ui/Button.tsx` — Reusable button (primary/secondary/danger/ghost, sm/md/lg, loading)
- [x] `src/components/ui/Card.tsx` — Card wrapper component
- [x] `src/components/ui/Modal.tsx` — Portal-based modal with Escape key support
- [x] `src/components/ui/LoadingSpinner.tsx` — Animated SVG spinner
- [x] `src/pages/Stats.tsx` — Replaced placeholder export/import buttons with real components
- [x] `src/i18n/locales/{ca,es,en}/common.json` — Added data.exporting, data.importing, data.importConfirm, data.exportError, data.importError, data.importSuccess keys
- [x] `vercel.json` — Added CSP headers (script-src, style-src, connect-src for Gemini API, img-src, font-src)
- [x] `npm run build` passes with zero errors

### Step 11 — ✅ Complete
- [x] `package.json` — `npm run dev` now routes to `dev:api` (full-stack local mode)
- [x] `package.json` — Added `dev:frontend` script (`VITE_MOCK_API=false vite`) for frontend-only dev without mocked requests
- [x] `package.json` — Added `"dev:api": "vercel dev"` script
- [x] `msw@^2` installed as devDependency, `public/mockServiceWorker.js` generated via `npx msw init`
- [x] `src/mocks/fixtures/mesocycle.ts` — Realistic 4-week strength mesocycle fixture (push/pull/legs, 3 days/week, linear progression + deload week 4)
- [x] `src/mocks/handlers.ts` — MSW POST handler for `/api/generate-plan` with 300ms delay
- [x] `src/mocks/browser.ts` — MSW browser worker setup
- [x] `src/main.tsx` — Conditional MSW init: `DEV && VITE_MOCK_API === 'true'`
- [x] Env/docs alignment: `.env.example` and `README.md` updated for Gemini server-side flow, required `GEMINI_API_KEY`, optional `GEMINI_MODEL`, and default real API-first local behavior (`VITE_MOCK_API=false`)
- [x] `npm run build` passes with zero errors

### Step 12 — ✅ Complete
- [x] `.gitignore` — verified (node_modules, dist, .env, .vercel, IDE, OS files)
- [x] `git init` — repository initialized
- [x] Local git user — `uri-ustrell` / `uri.ustrell@gmail.com` (repo-level config)
- [x] Initial commit — 132 files, 43k lines (steps 1–11)
- [x] `develop` branch — created from `main` (git flow model: main/develop/feature/release/hotfix)
- [x] Remote — `git@github-personal:uri-ustrell/the-strength-period.git` (SSH alias for personal account)
- [x] Push `main` + `develop` to GitHub (user completes after repo creation)

### Step 13 — ❌ Reverted (Static Data API)
- Implemented and then reverted. Serverless function endpoints (`api/exercises.ts`, `api/presets.ts`, `api/i18n/[locale].ts`) + client-side localStorage cache added unnecessary infra cost.
- Static files on Vercel CDN are free and faster (no cold start, no function invocations).
- Exercise data (~97 enriched exercises), presets (5), and i18n (3 locales) are too small to justify serverless endpoints.
- Decision documented in Decision 5 above.

---

## Known Issues — Resolved

### Fixed — IndexedDB boolean index bug (2026-03-31)
- `getActiveMesocycle()` used `IDBKeyRange.only(true)` on the `by-active` index, but IndexedDB does not support boolean values as index keys (valid types: number, string, Date, ArrayBuffer, Array).
- `IDBKeyRange.only(true)` throws `DataError`, causing `saveGenerated()` to fail silently (caught by try/catch) — nothing saved to IDB and UI never updated.
- **Fix:** Changed `getActiveMesocycle()` to use `getAll()` + `find()` instead of the boolean index query. The `by-active` index remains in the schema (harmless, removing would require DB migration).

---

## Step 15 — User-Owned LLM Assistant (2026-04-08)

### Summary
Implemented the full LLM Assistant feature as an alternative plan creation path in the PlanCreator wizard. Users can generate a prompt + CSV exercise catalog, paste it into their own LLM (ChatGPT, Claude, Gemini), and import the resulting JSON plan back into the app.

### Files Created
- `src/services/planning/llmAssistantService.ts` — Service layer: LLM types, prompt template generation, CSV catalog generation, JSON validation with markdown-fence stripping, conversion to Mesocycle
- `src/components/planning/LLMAssistant.tsx` — UI component: personal notes (persisted in IndexedDB), prompt display with copy, CSV download, JSON paste textarea, validation results display, import button

### Files Modified
- `src/stores/planningStore.ts` — Added `setGeneratedPreview` action for direct mesocycle injection
- `src/components/planning/PlanCreator.tsx` — Added `'llm-assistant'` to Step union, "Use LLM Assistant" button on configure step, LLMAssistant rendering
- `src/i18n/locales/ca/planning.json` — Added `llm.*` keys (38 keys)
- `src/i18n/locales/es/planning.json` — Added `llm.*` keys (38 keys)
- `src/i18n/locales/en/planning.json` — Added `llm.*` keys (38 keys)

### Key Decisions
- Prompt template is always English (best LLM performance); UI chrome is i18n'd
- Personal notes persisted via existing `configRepository` KV store (`llmPersonalNotes` key)
- Validation includes 7 structural error rules and 4 warning rules per spec
- Markdown code fence stripping handles ```json and plain ``` fences
- CSV uses RFC 4180 format with proper escaping
