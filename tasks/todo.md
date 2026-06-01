# Tasks — The Strength Period

> Active backlog below. Each task carries its own implementation notes
> (problem, affected files, steps, acceptance criteria). Keep this file in
> English (see `tasks/lessons.md`).

---

## DEPRECATED — Feature 17 "Progreso Jugable" Redesign (shipped)

> Archived 2026-06-01. The redesign rolled out in the dark single-skin
> identity (coral/mint/mustard/violet on `#1e1b2e`). The checklist below is
> kept for traceability only — do NOT action it. Source of truth for the
> shipped state is `specs/STATUS.md` and `specs/features/17-progreso-jugable.md`.

- [x] Foundations (tailwind + fonts + index.css) — orchestrator
- [x] Plan & dependency check
- [~] Delete dual-skin variant files + tests — superseded (dual-skin reverted)
- [~] userStore: drop `aestheticVariant`, add `audioOptIn` (default `false`) — shipped
- [~] Type updates: replace `aestheticVariant?` with `audioOptIn?` — shipped
- [~] Update migration + isValidUserConfig tests — shipped
- [~] Replace audio gate → `audioOptIn` — shipped
- [~] Simplify `ChartThemeProvider` (no variant) — shipped
- [~] Delete `useEffectiveAestheticVariant`, `AppearanceSelector` — shipped
- [~] Build new primitives — shipped
- [~] Collapse routers into single renderers — shipped
- [~] Restyle pages — shipped
- [~] Collapse i18n keys (CA/ES/EN parity) + add new keys — shipped
- [~] Replace deleted tests — shipped
- [~] Update STATUS.md + STATUS_HISTORY.md — shipped
- [~] Verify build + tests + i18n parity — shipped (91/91 unit, i18n parity OK)

---

# Active Backlog — Quality, Architecture & Usability

> Derived from the 2026-06-01 codebase audit. Baseline at audit time:
> `tsc --noEmit` clean, 91/91 unit tests green, i18n parity OK, but
> `biome lint` reports 40 errors / 61 warnings and the lint gate only runs
> `tsc`. Priorities: **P1** ship-blocking / real bugs, **P2** architecture &
> performance, **P3** docs & hardening.

## P1 — Correctness & quality gates

### [x] 1. Fix duplicate `rest` i18n key + detect duplicates in parity script

> Done 2026-06-01. Removed the dead `session.rest` object (the `skip_aria` key,
> unused in `src/`) from ca/es/en `common.json`, restoring `session.rest` as the
> string label consumed by `RestTimer`, `SessionPreview`, `SessionPreStart`.
> Added `scripts/findDuplicateKeys.ts` (string-aware tokenizer) + a pre-pass in
> `checkI18nParity.ts` and a `node:test` suite (`scripts/findDuplicateKeys.test.ts`);
> broadened the `test:ingestion` glob to `scripts/**/*.test.ts`. Verified:
> i18n parity OK, 0 Biome `noDuplicateObjectKeys`, tsc clean, 91 unit + 10 script
> tests green, regression guard confirmed (injected duplicate → non-zero exit).


**Problem.** The key `session.rest` is declared twice in `ca/common.json`,
`es/common.json`, and `en/common.json` (line 26). `JSON.parse` silently keeps
the last occurrence, so one translation is dead. `scripts/checkI18nParity.ts`
does not catch this because it compares keys *after* parsing, when the duplicate
is already gone.

**Affected files.**
- `src/i18n/locales/ca/common.json`
- `src/i18n/locales/es/common.json`
- `src/i18n/locales/en/common.json`
- `scripts/checkI18nParity.ts`

**Steps.**
1. Inspect both `session.rest` entries in each locale; decide which value is
   correct, delete the redundant one. Keep the three locales structurally
   identical.
2. Add a raw-text duplicate-key check to `checkI18nParity.ts`: read each JSON
   file as a string and parse with a reviver (or a lightweight scan) that flags
   a key appearing more than once within the same object scope.
3. Re-run `npm run i18n:check`.

**Acceptance criteria.**
- `biome lint` no longer reports `noDuplicateObjectKeys` for the locale files.
- `npm run i18n:check` fails if a duplicate key is reintroduced (add/confirm
  with a temporary duplicate, then revert).

---

### [ ] 2. Add Biome lint to the quality gate (`lint` script + CI)

**Problem.** `CONVENTIONS.md` declares Biome "the source of truth" for lint, but
`npm run lint` only runs `tsc --noEmit`. Biome currently reports 40 errors /
61 warnings that never block a commit or CI. The lint signal is effectively off.

**Affected files.**
- `package.json` (scripts)
- `.github/` workflow(s) that run checks
- `biome.json` (only if rule severities need tuning)

**Steps.**
1. Rename the current `tsc`-only script to `lint:types` (keep it callable).
2. Make `lint` run both: `biome lint . && tsc --noEmit` (or `biome check`).
3. Wire `npm run lint` and `npm test` into the CI workflow if not already gated.
4. Land this AFTER tasks 1, 3, 4, 5 so the gate starts green; otherwise stage
   it as warnings-only first, then flip to error.

**Acceptance criteria.**
- `npm run lint` runs Biome and TypeScript and exits non-zero on any violation.
- CI fails on a deliberately introduced lint error.

---

### [ ] 3. Remove non-null assertions (`!`) — restore strict type safety

**Problem.** 47 `lint/style/noNonNullAssertion` violations. `CONVENTIONS.md`
promises "no `any`, no implicit returns" strictness; each `!` is an unchecked
runtime-crash surface that bypasses that guarantee.

**Affected files.** Spread across `src/` — enumerate with:
`npx biome lint . --max-diagnostics=200 | grep -B3 noNonNullAssertion`.

**Steps.**
1. For each `!`, replace with one of: an explicit guard + early return, optional
   chaining + sensible default, or a narrowing type guard. Do NOT mass-suppress.
2. Where a value is a genuine invariant, add a tiny asserting helper
   (`function assertDefined<T>(v: T | null | undefined, msg: string): T`) so the
   failure mode is a thrown error with context, not a silent crash.
3. Tackle in small batches by directory; run `tsc --noEmit` after each batch.

**Acceptance criteria.**
- `biome lint` reports zero `noNonNullAssertion`.
- `tsc --noEmit` clean; 91/91 tests still green.

---

### [ ] 4. Fix `useExhaustiveDependencies` effects

**Problem.** Two effects declare more deps than they use, risking effects that
re-fire incorrectly or mask real missing deps.

**Affected files.**
- `src/components/planning/PlanCreator.tsx` (effect at ~line 174)
- `src/pages/Dashboard.tsx` (effect at ~line 73)

**Steps.**
1. For each effect, review what it actually reads vs. its dependency array.
2. Remove unnecessary deps; if a dep was intentionally excluded to avoid loops,
   refactor (e.g. move logic into an event handler, memoize the source, or use a
   ref) rather than silencing the rule.
3. Verify the dirty-tracking behaviour in PlanCreator and the mesocycle reload
   in Dashboard still behave correctly by manual run.

**Acceptance criteria.**
- `biome lint` reports zero `useExhaustiveDependencies`.
- No behavioural regression in the plan wizard or dashboard refresh.

---

### [ ] 5. Auto-fixable lint cleanup (mechanical)

**Problem.** Remaining low-risk violations: `noArrayIndexKey` (8),
`useTemplate` (5), `useNodejsImportProtocol` (4), `useOptionalChain` (4),
`useArrowFunction` (4), `noImportantStyles` (4), `useParseIntRadix` (2),
`noUnusedVariables` (2), `noRedundantRoles` (1), plus CSS `noUnknownAtRules` (3).

**Affected files.** Various; run `npx biome lint . --write` for safe fixes.

**Steps.**
1. Run `npx biome lint . --write` (safe fixes only), review the diff.
2. Manually fix `noArrayIndexKey` — replace array-index React keys with stable
   ids (most list items already have an `id`/`templateId`/`sessionId`).
3. For CSS `noUnknownAtRules` (Tailwind `@apply` etc.), confirm whether it's a
   false positive; if so, scope a Biome override for CSS rather than disabling
   globally.
4. `noImportantStyles`: audit each `!important`; keep only where Tailwind
   utility specificity genuinely requires it, document why inline.

**Acceptance criteria.**
- Only deliberately-kept violations remain, each with an inline justification.
- `tsc --noEmit` clean; tests green.

---

## P2 — Architecture & performance

### [ ] 6. Code-split routes with `React.lazy` + Vite manual chunks

**Problem.** Production build is a single `index.js` of ~1.3 MB (uncompressed)
with zero `lazy()`/`Suspense`, despite `CONVENTIONS.md` allowing default exports
on pages specifically "for lazy loading". Hurts first load on the mobile target.

**Affected files.**
- `src/App.tsx` (route definitions)
- `src/pages/*` (ensure each page has a lazy-friendly export)
- `vite.config.ts` (`build.rollupOptions.output.manualChunks`)

**Steps.**
1. Convert the 7 routes in `App.tsx` to `React.lazy(() => import('@/pages/...'))`
   and wrap `<Routes>` in `<Suspense fallback={<LoadingSpinner />}>`.
2. Split heavy non-route deps into their own chunks via `manualChunks`
   (e.g. `recharts`, `canvas-confetti`, `@fontsource/*`, `i18next`).
3. Run `npm run build` and inspect chunk sizes; confirm the main entry shrinks
   substantially and charts/confetti load only on the relevant pages.

**Acceptance criteria.**
- Main entry chunk is materially smaller (target: charts/confetti excluded from
  initial load).
- Navigation still works; spinner shows during route chunk fetch.

---

### [ ] 7. Add a root Error Boundary with recovery + data export

**Problem.** No `ErrorBoundary` exists anywhere. A render error on any route
produces a blank screen. For a no-backend, local-first app this can strand the
user with locally-stored data and no escape hatch.

**Affected files.**
- New `src/components/ui/ErrorBoundary.tsx`
- `src/App.tsx` (wrap the router/routes)
- Reuse `src/components/data/ExportButton.tsx`

**Steps.**
1. Implement a class-based `ErrorBoundary` (only React class allowed; note the
   exception against `CONVENTIONS.md` "functional components only" inline).
2. Fallback UI: i18n'd error message, "Reload" action, and an "Export my data"
   action so the user can back up IndexedDB before recovery.
3. Wrap `<OnboardingGuard>`/`<Routes>` in `App.tsx`.
4. Add i18n keys to `common` across ca/es/en (keep parity).

**Acceptance criteria.**
- Throwing inside a page renders the fallback, not a blank screen.
- Export works from the fallback; i18n parity preserved.

---

### [ ] 8. Refactor `PlanCreator.tsx` (1,049 lines, ~20 `useState`)

**Problem.** The plan-creation wizard holds its entire multi-step state machine
inline, making it hard to reason about and test. It is the largest component in
the codebase.

**Affected files.**
- `src/components/planning/PlanCreator.tsx`
- New step subcomponents under `src/components/planning/steps/`
- Possibly a new `src/stores/planCreatorStore.ts` or a local `useReducer`

**Steps.**
1. Extract each `Step` (`preset` | `exercises` | `configure` | `preview` |
   `llm-assistant`) into its own component receiving typed props.
2. Replace the ~20 `useState` calls with a single `useReducer` (or a scoped
   Zustand store) modelling the wizard state and transitions explicitly.
3. Keep `PlanCreator` as a thin orchestrator: current step + transitions.
4. Add unit tests for the reducer/transition logic (no DOM needed).

**Acceptance criteria.**
- `PlanCreator.tsx` is significantly smaller; step logic lives in focused units.
- Wizard behaviour unchanged (manual walkthrough of all steps + faithful mode).
- New reducer/transition tests pass.

---

### [ ] 9. Shared runtime schema validation for the LLM plan (client + API)

**Problem.** The trust boundary is a non-deterministic Gemini response, yet
`api/generate-plan.ts` only checks that `parsed.mesocycle` exists, and the client
relies on a hand-written `validateLLMResponse`. Malformed muscle groups, reps, or
rpe can flow into IndexedDB.

**Affected files.**
- `api/generate-plan.ts`
- `src/services/planning/llmAssistantService.ts` (`validateLLMResponse`)
- New shared schema module (e.g. `src/types/planSchema.ts`) importable by both
- `package.json` (add `zod`)

**Steps.**
1. Add `zod`. Define a `MesocycleSchema` capturing the contract the system
   prompt promises: valid `MuscleGroup` enum, `reps` as `[min,max]`, `rpe` 5–10,
   `restSeconds` 30–180, session percentages summing to ~100.
2. Validate in `api/generate-plan.ts` before returning 200; on failure return
   the existing 502 "Invalid plan structure" path with the zod issue logged
   (never log the API key).
3. Replace the hand-written client guard with `Schema.safeParse`, surfacing a
   user-facing i18n error on failure.
4. Add unit tests with a few malformed fixtures.

**Acceptance criteria.**
- Malformed AI responses are rejected at the API and never persisted.
- Tests cover at least: bad muscle group, scalar reps, out-of-range rpe.

---

### [ ] 10. Move task-history comments out of production code

**Problem.** Stores carry long narrative docblocks referencing process
artifacts (e.g. "Step 16 Phase E sub-phase E1 (W5 fix)") in
`src/stores/sessionStore.ts`. This couples code to the task tracker and will
rot.

**Affected files.**
- `src/stores/sessionStore.ts` (and any similarly annotated files found via
  `grep -rn "Step 1[0-9] Phase" src/`)

**Steps.**
1. Keep concise comments explaining *why* the code works the way it does (e.g.
   the background-safe countdown rationale is worth keeping, trimmed).
2. Remove step/phase/PR references; move that history to `specs/STATUS_HISTORY.md`
   if not already captured.

**Acceptance criteria.**
- No `Step N Phase` / `sub-phase` references remain in `src/`.
- Remaining comments are intent-focused and self-contained.

---

## P3 — Documentation, a11y & hardening

### [ ] 11. Trim `STATUS.md` and archive `STATUS_HISTORY.md`

**Problem.** `STATUS.md` (~25 KB) mixes current state with chronology;
`STATUS_HISTORY.md` is ~152 KB. Neither is realistically read end-to-end.

**Affected files.** `specs/STATUS.md`, `specs/STATUS_HISTORY.md`.

**Steps.**
1. Reduce `STATUS.md` to *current* state only: phase, step table, known gaps,
   links. Move dated narrative entries to `STATUS_HISTORY.md`.
2. Add a short "How to read these docs" header to both.

**Acceptance criteria.** `STATUS.md` is a quick-scan snapshot; history lives in
`STATUS_HISTORY.md`.

---

### [ ] 12. Reconcile `tasks/todo.md` ↔ `STATUS.md` ↔ code

**Problem.** Before this rewrite, `todo.md` showed Feature 17 fully unchecked
while `STATUS.md` and the code showed it shipped — contradictory sources of
truth.

**Affected files.** `tasks/todo.md`, `specs/STATUS.md`.

**Steps.**
1. Confirm the deprecation block above matches `STATUS.md`.
2. Establish the rule (record in `tasks/lessons.md`): when a feature ships,
   update `STATUS.md` and move/close its `todo.md` items in the same change.

**Acceptance criteria.** No contradiction between the three sources for any
shipped feature.

---

### [ ] 13. Update `README.md` to match actual stack & scripts

**Problem.** README says "Vite 5 / React 18" but `package.json` has Vite 7 and
React 19 typings; it also frames `npm run lint` as "TypeScript check only" while
CONVENTIONS calls Biome the source of truth.

**Affected files.** `README.md` (Tech Stack + Development Commands sections).

**Steps.**
1. Correct versions (Vite 7, React 18 runtime / React 19 types — state precisely
   what `package.json` pins).
2. Update the lint command description after task 2 lands.

**Acceptance criteria.** README versions and commands match `package.json`.

---

### [ ] 14. Accessibility pass (session-critical surfaces first)

**Problem.** a11y lint warnings plus interaction-heavy timer UI used mid-workout.

**Affected files.**
- `src/components/session/RestTimer.tsx`
- `src/components/dashboard/DashboardMap.tsx` (`noRedundantRoles`)
- Touch-target / contrast review across session + dashboard

**Steps.**
1. Add `aria-live="polite"` (or `assertive` near zero) to the rest countdown so
   screen readers announce remaining time; respect `usePrefersReducedMotion`.
2. Remove redundant `role="list"`; fix array-index keys (overlaps task 5).
3. Verify tap targets ≥ 44px and reuse the existing `contrast.test.ts` approach
   for any new token pairings.

**Acceptance criteria.** No a11y lint warnings; timer announces updates; targets
meet size guidance.

---

### [ ] 15. Durable / honest rate limiting for `api/generate-plan.ts`

**Problem.** `rateLimitMap` is in-memory per serverless cold-start; it resets per
instance, so it neither reliably protects the project key nor limits users
consistently.

**Affected files.** `api/generate-plan.ts`.

**Steps.**
1. Decide: integrate a shared store (e.g. Upstash/Vercel KV) for real
   cross-instance limiting, OR keep in-memory but document it as best-effort
   only and add a hard upstream safeguard (budget/quota alert on the Gemini key).
2. If KV: key by IP + sliding window; return existing 429 shape on limit.

**Acceptance criteria.** Limiting behaviour is either durable or explicitly
documented as best-effort with a real backstop.

---

### [ ] 16. Verify PWA installability & offline behaviour

**Problem.** `vite-plugin-pwa` is a dependency and "local-first / works offline"
is the core promise, but installability/offline isn't verified in this audit.

**Affected files.** `vite.config.ts` (PWA plugin config), `public/` assets,
service worker output.

**Steps.**
1. Build + preview; confirm the app is installable (valid manifest, icons) and
   that core flows (dashboard, session, stats) work with the network offline.
2. Confirm the AI generation path degrades gracefully offline (offline banner
   per `CONVENTIONS.md` error handling) rather than hanging.

**Acceptance criteria.** App installs as a PWA; non-AI flows work offline; AI
path shows a clear offline state.
