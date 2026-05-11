# Feature 17 — "Progreso Jugable" Redesign

> **Status:** PLANNING — pending user validation before implementation begins.
>
> **Origin:** rolls back Step 16 (Ethical Gamification dual aesthetic skin) and replaces it with a single, dark-only, custom-feeling visual identity called "Progreso Jugable".

---

## 1. Goal

1. **Remove every dual-skin (classic vs retro) variant surface** introduced in Step 16. After this feature, there is only ONE design — no aesthetic variant chooser, no `prefers-reduced-motion` variant override, no "classic-boring" / "retro-platformer" forks.
2. **Adopt a single new visual identity** ("Progreso Jugable") across the whole app: dark mode only, purple background + coral accent + mustard highlight + mint success, Space Grotesk display + Inter body + Fira Code achievement badges, large rounded-2xl blocks, tactile microinteractions.
3. **Preserve the functional gamification layer** (totems catalog, earn-acknowledgement payload, totem inventory model). Only the renderers change — pure services / models stay.
4. **Preserve all existing data & behavior contracts** (no IDB schema change, no new persisted preferences, no new auth, no breakage of i18n parity).

---

## 2. What gets removed (rollback of dual-skin Step 16 surfaces)

These are deletions or substantial rewrites:

### 2.1 User store
- `userStore.aestheticVariant` field + `setAestheticVariant` action.
- Migration that wrote a default `aestheticVariant`.
- `userStore.migration.test.ts` cases related to it.

### 2.2 Hooks
- [`useEffectiveAestheticVariant`](src/hooks/useEffectiveAestheticVariant.tsx) — the whole hook + its `resolveEffectiveAestheticVariant` pure helper. No more variant resolution.
- Its test file.

### 2.3 Variant routers
- [`SessionExecution`](src/components/session/SessionExecution.tsx) router collapses into ONE renderer (the new design). The router pattern goes away.
- [`DashboardMap`](src/components/dashboard/DashboardMap.tsx) (or wherever the Phase B router lives) — same.
- [`TotemInventory`](src/components/stats/TotemInventory.tsx) router — same.
- [`EarnAcknowledgement`](src/components/session/EarnAcknowledgement.tsx) — collapses to a single inline acknowledgement frame.

### 2.4 Variant renderers (deleted)
- `RetroLevelRun.tsx` + test
- `ClassicSessionCards.tsx` + test
- `ClassicCalendar.tsx` (if separate) + test
- `RetroWorldMap.tsx` + test
- `ClassicTotemGrid.tsx` + test
- `RetroInventoryShelf.tsx` + test
- `RetroEarnAcknowledgement` + `ClassicEarnAcknowledgement` (the two subtrees inside `EarnAcknowledgement.tsx`)
- Shared helpers limited to variant parity contracts: `sessionExecutionShared.ts`, `dashboardMapShared.ts`, `totemInventoryShared.ts` — kept ONLY if their helpers are still useful to the new single design (most likely a11y label hooks survive; the rest is deleted).

### 2.5 Audio gating
The current `sessionAudio` and `statsAudio` services short-circuit when variant ≠ `retro-platformer`. With variants gone, we replace the gate with an explicit `userStore.audioOptIn` flag (default `false`) and a Settings toggle.

### 2.6 i18n keys (in 3 locales)
Remove every `*.retro.*` key tree (e.g. `session.completion.retro.*`, `session.completion.totem_ack.retro.*`, `session.completion.totem_ack.calm.*` collapses to a single non-suffixed key, dashboard map retro/calm copy, etc.). Single key tree per copy slot. **i18n parity script must stay green.**

### 2.7 Step 16 CSS variables
The `--theme-game-session-*` token tree dies entirely. The `--theme-session-*`, `--theme-stats-*`, `--theme-stats-family-*` token trees are renamed and re-tuned for the new dark theme (see §4).

### 2.8 Settings UI
- Remove the aesthetic-variant chooser.
- Add the audio opt-in toggle.

### 2.9 Tests
Every test that asserts cross-variant parity (`SessionExecution.test.tsx`, `DashboardMap.test.tsx`, `TotemInventory.test.tsx`, `EarnAcknowledgement.test.tsx`) is deleted and replaced by single-renderer tests.

---

## 3. What stays (no behavior change)

- `buildSessionExecutionModel`, `buildDashboardMap`, `buildTotemInventoryModel`, `buildSessionCompletionTotemPayload` — pure services, untouched.
- `TOTEM_CATALOG_V2`, `FAMILY_ORDER`, evaluators — untouched.
- `sessionStore` (rest chime fix from prior round stays), `planningStore`, `userStore` (minus `aestheticVariant`), `sessionRepository`, etc.
- All ingestion scripts.
- All Feature 1–15 surfaces (Landing, Onboarding, Dashboard non-map parts, Planning, Settings except variant chooser, Stats charts, Export/Import).
- All i18n parity discipline.

---

## 4. New visual identity — "Progreso Jugable"

**Authoritative source:** the design proposal pasted by the product owner (paste is reproduced inline in the feature spec section §11 below).

### 4.1 Color tokens (CSS variables on `:root`, dark only)

| Token                    | Hex        | Use                                                         |
|--------------------------|------------|-------------------------------------------------------------|
| `--bg`                   | `#1E1B2E`  | App background                                              |
| `--surface`              | `#2D2A3F`  | Cards, modals                                               |
| `--surface-elevated`     | `#3A3654`  | Elevated cards, dock                                        |
| `--accent`               | `#FF6B4A`  | Primary CTA, active set, today indicator                    |
| `--highlight`            | `#F9A826`  | Achievement badges, notable moments                         |
| `--success`              | `#2DD4BF`  | Completed state, RPE selector fill                          |
| `--text-primary`         | `#F3F4F6`  | Body text                                                   |
| `--text-muted`           | `#9CA3AF`  | Secondary text, captions                                    |
| `--border-subtle`        | `rgba(255,255,255,0.08)` | Hairline borders                              |
| `--shadow-elevated`      | `0 8px 16px -6px rgba(0,0,0,0.4)` | Card shadow                          |

The four totem families remap onto: `consistency → --accent`, `recovery → --success`, `preparation → --highlight`, `reflection → #A78BFA` (a soft violet, to be confirmed during implementation).

### 4.2 Typography

- `--font-display` → `'Space Grotesk', system-ui, sans-serif` (700 weight for big numbers + headlines).
- `--font-body` → `'Inter', system-ui, sans-serif` (400 / 500 / 600).
- `--font-mono` → `'Fira Code', ui-monospace, monospace` (used ONLY in achievement badges + CSV preview).

Loaded via `<link>` in `index.html` from Google Fonts (or self-hosted `@fontsource/*` packages — implementation choice, see §6.Q3).

### 4.3 Shape language

- Default radius: `rounded-2xl` (1rem).
- Pills: `rounded-full`.
- Cards have a 4 px left or top accent border (`border-l-4 border-[var(--accent)]` for "current" / focal cards).
- Big primary CTA buttons use `transform scale(0.96)` on `:active` for tactile press.

### 4.4 Motion

- Default duration 150 ms, `cubic-out`.
- "Spring bounce" reserved for set-completed feedback (counter increment + 3-particle confetti). Library: `canvas-confetti` (≈ 2 KB) or a hand-rolled SVG.
- Rest-timer: at T-3 s the timer pulses softly in mint; at T=0 the bar flips to mint and the chime fires.
- Respect `prefers-reduced-motion`: confetti + bounce + pulse become static color changes only.

### 4.5 Iconography

Lucide React stays. No pixel art anywhere. Achievement totems become hexagonal SVG badges (locked = dim; unlocked = mint glow + Fira Code label).

### 4.6 Navigation

Floating dock at the bottom on mobile (Plan / Today / Stats / Settings), sticky topbar on desktop. Frosted-glass background (`backdrop-blur-md` over `--surface`).

---

## 5. Per-screen surfaces (post-redesign, single design)

### 5.1 Landing
Hero card ("Cristal de Progreso") with a small animated demo of a series filling. Two CTAs: primary (coral) "Comenzar mi fuerza", secondary (outlined purple) "Solo quiero ver".

### 5.2 Onboarding
Same flow as today (profile type → context). Restyled with the new tokens; one question per screen, big tap targets, subtle progress line.

### 5.3 Dashboard
- Header: greeting + streak (mint flame icon).
- Today hero card (coral accent) with the planned session + a single "Begin" CTA.
- Period strip: horizontal row of mesocycle days (past = dim, today = coral glow, future = outline). Replaces both the calendar and the world map.
- Rest day state: confident purple card with copy "Hoy descansas. Mañana volvemos.".
- Recent stats glance: small volume sparkline.

### 5.4 Planning
Stepwise, editorial: preset → adjust → AI generation → preview → save. Preview renders the mesocycle as a readable artifact (titles + Fira Code numbers) instead of a table.

### 5.5 Session
- Top HUD: set counter `3/4`, exercise counter `3/8`, elapsed time. All Fira Code.
- Active exercise card (coral accent border).
- Weight display: digital-looking coral numbers + `+ / −` buttons.
- "Hecho" CTA: large pill, full-width on mobile, coral, with `scale(0.96)` press + 3-particle confetti on success.
- RPE selector: 10 squares, fill mint left-to-right.
- Rest timer: full-width thick coral bar that empties; centered numerals; pulses mint at T-3 s, flips mint + chimes at T=0.
- Session strip (peek-only, never logs).

### 5.6 Session summary
Calm purple page with global RPE (mint squares), notes textarea, optional inline earn-acknowledgement (one totem hex + Fira Code label, never modal), single "Save & close" CTA. If save fails, an inline retry row appears (not a toast).

### 5.7 Stats
- Heat-map calendar (training days = brighter purple); volume + progression + adherence charts re-themed to dark.
- Totem collection: hex badges in a `grid-cols-3 sm:4 md:5 lg:6 xl:8` grid, max card width ~120 px, locked totems visible but dim with "Próximo: 3 sesiones más" copy. Inspect panel inline (never modal).

### 5.8 Settings
- Language switcher (CA / ES / EN).
- Theme: removed (dark only).
- Audio opt-in toggle (replaces the variant chooser).
- Data export / import.
- About + ethical statement.

---

## 6. Open questions (to validate before any code)

The following decisions need explicit confirmation. I'll ask them in `vscode_askQuestions` after this doc lands.

- **Q1.** Total rollback of dual-skin (delete variants + chooser) vs gradual (deprecate but keep behind a hidden flag for one release). **Recommended: total rollback** to avoid maintaining two designs.
- **Q2.** Light mode: included in this feature, deferred to a follow-up, or never. **Recommended: dark only forever**, per the design proposal §7.
- **Q3.** Fonts loaded from Google Fonts CDN (one extra request) vs self-hosted via `@fontsource/space-grotesk`, `@fontsource/inter`, `@fontsource/fira-code` (three new deps, no third-party request, +~120 KB). **Recommended: self-hosted** for offline-PWA discipline.
- **Q4.** Confetti library: `canvas-confetti` (~2.5 KB gz, 130 KB unminified, peer-free) vs hand-rolled SVG (no dep, more code). **Recommended: `canvas-confetti`** for one-line implementation + reduced-motion guard.
- **Q5.** Audio behavior post-redesign: replace variant gate with a `userStore.audioOptIn` flag (default `false`, opt-in via Settings). **Recommended: yes**, opt-in.
- **Q6.** Streak indicator on dashboard: include the "fire" streak counter as proposed by the design? It risks the anti-coercion principle ("you broke your streak"). **Recommended: no — show the period progress instead**, per the existing ethical gamification spec.
- **Q7.** Existing `*.retro.*` and `*.calm.*` i18n trees: collapse to a single neutral tree (e.g. `session.completion.headline`, `session.completion.body`) with no aesthetic suffix. **Recommended: yes**.
- **Q8.** Period strip vs the existing world map / calendar: full replacement (delete both), or keep one of them as the canonical view. **Recommended: full replacement** (single design principle).
- **Q9.** Totems "locked but visible with hint" — the spec says yes (anti-mystery). Confirm? **Recommended: yes**.
- **Q10.** Tests for cross-variant parity (≈ 6 test files): delete entirely (recommended) vs port to single-renderer assertions (more work, less value).
- **Q11.** Implementation order: do it in ONE big PR (clean cutover, easier to reason about, harder to review) or in 4–5 smaller PRs (foundations → screens → tokens cleanup → polish). **Recommended: one PR**, since the rollback + redesign are inseparable.
- **Q12.** STATUS.md / STATUS_HISTORY.md update: mark Step 16 phases B–E as "REVERTED in Feature 17" rather than deleting their entries (preserve project history). **Recommended: yes**.
- **Q13.** Do we keep the `prefers-reduced-motion` discipline? **Recommended: yes**, just as static-fallback for confetti / pulse / spring; functional motion (timer ticking) stays.
- **Q14.** "Cristal de Progreso" card top-border accent (4 px coral) — apply to ALL cards, or only to "focal" cards (today's hero, active exercise, current chart)? **Recommended: only focal cards**, to avoid visual noise.
- **Q15.** Color for `reflection` family totems (the design proposal gave coral / mustard / mint but not a fourth). **Recommended: soft violet `#A78BFA`** to stay in the purple family without colliding with the other three.

---

## 7. Implementation plan (high level, after validation)

Phases inside the single PR:

1. **Foundations**
   - Add fonts (Q3), update `tailwind.config.js` with the new color/font/animation tokens, rewrite `index.css` with the new CSS variables on `:root`, force dark on `<html>`.
   - Add `canvas-confetti` (Q4) if approved.
2. **Rollback**
   - Delete: `useEffectiveAestheticVariant`, `userStore.aestheticVariant`, all variant renderers (§2.4), all variant routers (§2.3), retro/calm i18n keys (§2.6), Step 16 game CSS variables (§2.7), aesthetic-variant chooser in Settings (§2.8), cross-variant parity tests (§2.9).
   - Update `userStore` migration to drop the deprecated field cleanly.
3. **New primitives**
   - Build the new `Button`, `Card` ("Cristal de Progreso"), `RpeSelector`, `RestTimer`, `TotemBadge`, `Dock`, `EmptyState`, etc.
   - Update existing `LoadingSpinner` etc. to the new tokens.
4. **Screens**
   - Re-style each screen against the new primitives, in this order: Landing → Settings → Dashboard → Session → Session summary → Stats → Onboarding → Planning.
5. **i18n**
   - Collapse retro/calm key trees to neutral keys in CA / ES / EN (§Q7). Run `npm run i18n:check`.
6. **Tests**
   - Replace deleted parity tests with single-renderer behavior tests for each new screen.
7. **Verification**
   - `npm run build && npm test && npm run i18n:check` — all green.
   - Manual smoke: dashboard / session / summary / stats on mobile (390 × 844) + desktop (1280 × 800).
8. **Docs**
   - Update `specs/STATUS.md`: Feature 17 in progress / done.
   - Update `specs/STATUS_HISTORY.md` (§Q12): mark Step 16 B–E as "REVERTED in Feature 17 — Progreso Jugable redesign".
   - Move this file to `specs/features/17-progreso-jugable.md` once approved.

---

## 8. Risks

- **Scope creep.** This touches almost every visible surface. Estimate: large. Recommendation is to do it as a single coherent PR but with strict phases (above) so reviewers can read it sequentially.
- **i18n key churn.** Renaming keys in three languages without missing any — the parity script catches it, but reviewers should still spot-check.
- **Test deletion.** Deleting ~6 parity test files looks like a regression on coverage. We must replace each with a focused single-renderer test, not just delete.
- **Audio service.** Today the gate is `variant === 'retro-platformer'`. Post-rollback the gate is `userStore.audioOptIn === true`. If the migration doesn't clear the old flag, no audio fires by default — which is the desired outcome (opt-in).
- **Step 16 was a big lift.** Reverting feels wasteful; the spec history (§Q12) keeps the lessons learned visible.

---

## 9. Reference: original design proposal (verbatim, for traceability)

> *Reproduced as supplied by the product owner. Source-of-truth for the visual decisions above.*

```
🎨 The Strength Period — Diseño de Identidad Visual

1. Filosofía del Diseño — "Juego serio, progreso real"
   - Motivador, no adictivo
   - Cálido pero enfocado
   - Recompensa física
   - Anti-Tailwind
2. Paleta de colores
   Movimiento → #FF6B4A (Coral/Ámbar) — Primario (Acción)
   Logro      → #F9A826 (Mostaza)     — Secundario (Highlight)
   Calma/Base → #1E1B2E (Púrpura oscuro) — Fondo Principal
   Superficie → #2D2A3F                 — Cards/Modales
   Éxito      → #2DD4BF (Menta)         — Completado/Salud
   Texto principal   → #F3F4F6
   Texto secundario  → #9CA3AF
3. Tipografía
   Display: Space Grotesk
   Body:    Inter
   Achievement badges: Fira Code
4. Componentes clave
   - Cristal de Progreso (Cards): bg-#2D2A3F + border-t-2 #FF6B4A + shadow elevada
   - Botón "Serie Rápida": pill coral, scale(0.96) on press
   - Medidor RPE: 10 cuadrados que se iluminan en mint
   - Temporizador descanso: barra coral que se vacía; mint al llegar a 0
   - Totems: hexágonos/círculos; mint glow al desbloquear
5. Layout por pantalla — Landing / Dashboard / Entrenamiento / Stats
6. Microinteracciones — confetti 3 partículas en serie hecha; deslizar para saltar; brillo a T-3 s
7. Modo oscuro por defecto, único modo
8. Assets — Lucide React, ilustraciones vacías minimalistas, favicon yin-yan coral/púrpura
9. Tailwind extension (game-primary, game-bg, etc.)
10. Ejemplo de Card de ejercicio
```

---

*This document is a planning artifact. No source code has been modified. Implementation begins ONLY after the questions in §6 are validated by the product owner.*
