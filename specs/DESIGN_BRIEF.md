# The Strength Period — Design Brief (Prompt for End‑to‑End Visual Redesign)

> **How to use this document.** Paste it whole into a design‑oriented LLM (ChatGPT, Claude, Gemini Pro), a code+design tool (v0.dev, Vercel Galileo, Figma Make, Magic Patterns, lovable.dev, bolt.new), or a UI agent. It is the single source of truth for the visual / interaction redesign the product owner wants. It deliberately does **not** prescribe code; it describes intent, constraints, screens, components, tokens, and acceptance criteria so a designer or design‑coding tool can produce a definitive proposal.
>
> **Output expected from the receiving tool.** A complete design system + screen mockups (mobile‑first, secondarily desktop) for every screen listed in §6, with at least: tokens, typography scale, components inventory, three or four hero screen mockups, dark + (optional) light variants, plus a short rationale.

---

## 0. One‑sentence pitch

A zero‑backend, local‑first strength‑training companion that helps non‑athletes start and sustain the habit of training, with calmly motivating gamification — never gym‑bro, never coercive.

---

## 1. Why a redesign

The current UI is a generic Tailwind admin look (white cards on white pages, indigo buttons, Lucide icons). A "retro pixel‑platformer" cosmetic variant was attempted but failed: it bolted 8‑bit textures on top of a SaaS layout instead of being a coherent world. Both variants feel like prototypes.

We want to **leave the generic Tailwind aesthetic behind** and adopt a **distinctive, dark, calm and slightly playful identity** that is unmistakably "The Strength Period". The new design must:

- Stand on its own as a brand, not as a Tailwind starter kit.
- Default to **dark mode** (light mode optional, see §3).
- Treat gamification as a quiet, optional layer of meaning — not the primary surface.
- Look great on a phone first; degrade gracefully on tablet and wide desktop.
- Feel **calm under load**: a sweaty user mid‑set must read every screen at a glance.

**Anti‑goals.** No casino dopamine loops. No streaks that shame. No badges that pop in your face. No skeuomorphic gym lockers, no chrome, no flexing emoji. No "level up" modals interrupting a session.

---

## 2. Brand & emotional tone

The product name is "The Strength Period". Treat **"Period"** as a deliberate double meaning:

- A *period* of training — a mesocycle, a chapter, a season of effort.
- A *period* as a typographic full stop — closure, sufficiency, "this is enough for today".

The voice is **grounded, kind, slightly literary**. Not coach‑speak, not corporate. Imagine a thoughtful friend who happens to know strength science. It speaks Catalan, Spanish and English with equal naturalness.

**Mood board keywords (use these to seed the visual exploration):**

- *Dark, ink‑on‑paper, but warm.* Not cold cyber‑punk; closer to a moleskine notebook lit by a desk lamp.
- *Soft pixel / low‑res accents* used as decoration, not as the chrome itself. Think small pixel motifs (a tiny totem, a pixel star) embedded in an otherwise typographic, modern layout.
- *Calm typographic posters* (Dieter Rams catalogues, A24 minisite footers, Linear changelog).
- *Tactile* — subtle grain, soft shadows, generous whitespace, rounded but not cartoonish.

**References to draw from (mix, don't copy):** Linear, Things 3, Arc browser empty‑state pages, Apple Fitness ring screens at night, Strong app's session view, the 2024 Are.na site, Robinhood's late‑2023 redesign, the Oblique Strategies cards.

**References to avoid:** Strava red. Nike Training Club's loud video backgrounds. MyFitnessPal. Generic "fitness influencer" UI with neon gradients.

---

## 3. Color, light & dark

**Default theme: dark.** A deep neutral background — *not* pure black, *not* navy. Aim for a warm near‑black like `#0f0d0c` with a hint of brown, so paper textures and pixel motifs feel inked rather than back‑lit.

**Accent system.** Pick **one** primary accent that carries through every screen (used for the active set, the today indicator, the primary CTA). It must read as warm and confident in the dark theme. Avoid Tailwind indigo. Suggested directions: a muted amber, a faded coral, a sage. The receiving tool should propose a final palette.

**Family colors.** Gamification surfaces today use four "totem families": consistency, recovery, preparation, reflection. Replace today's primary‑palette swatches with a four‑color set that is **harmonious in dark mode** and accessible at small sizes (e.g. 8 px pixel motifs). Never use red as a state color (no shame).

**State color principle.** Completed = neutral confidence (low chroma). Active = warm accent. Skipped = barely visible. Never urgent red, never alarming yellow. A skipped set is information, not a failure.

**Light mode.** Optional. If present, it must be a parallel, equally‑considered theme (paper white, ink black) and not a desaturated version of the dark one. Don't ship light mode unless it can stand on its own.

---

## 4. Typography

- **Display / headings.** A modern serif or a humanist sans with character — something with a personality. Variable‑font preferred for performance.
- **Body.** A neutral, very legible sans for UI and long copy in three languages (CA / ES / EN must look equally good — beware narrow accents).
- **Numbers.** Tabular numerals everywhere a number can change in place: timer, weight, reps, set counter. Consider a separate monospace‑numeric face for the rest timer.
- **Hierarchy.** Aim for **3** type sizes per screen, max. The current UI has 6+. Use weight + color for hierarchy, not size churn.

---

## 5. Iconography & motifs

- Replace the Lucide stroke icons with a **single, custom‑feeling** icon family. Either: (a) a thin outline set with rounded joints, or (b) a low‑res 12×12 pixel set used very small. **Pick one — don't mix.**
- **Pixel totems** (the gamification motifs) stay, but become small (16–24 px) and live inside otherwise typographic surfaces, like postage stamps on a letter. They are *never* the focus of a primary surface.
- Subtle decorative grain / noise texture on the background is encouraged. No skeuomorphic textures (no leather, no metal, no carbon fiber).

---

## 6. Screen inventory & per‑screen intent

For every screen below: produce a mobile (390 × 844) and a desktop (1280 × 800) mockup, plus an empty state and a populated state.

### 6.1 Landing
First contact, no data yet. Should communicate *what this is and why it's calm*. A single CTA ("Comença" / "Empezar" / "Start"). Currently a generic hero — replace with something poster‑like that introduces the brand voice.

### 6.2 Onboarding (2 steps)
- Step 1: profile type (quick chooser).
- Step 2: context (equipment, days/week, restrictions).

Treat as **a conversation, not a form**. One question per screen, big touch targets, the answer is a tap, not a typed value. Progress indicator should be subtle (a quiet line, not a full progress bar).

### 6.3 Dashboard ("today")
The app's home. Must answer in <1 second: *"what am I doing today?"*. Secondary: *"how am I doing this week / this period?"*.

Today there are two competing variants ("classic calendar" + "retro world map"). The redesign should propose a **single, definitive** dashboard surface that holds both ideas:

- A primary *today card* with the planned session, large, tappable, with one CTA "Begin".
- A quiet *period strip* showing the current mesocycle as a horizontal sequence of days (past = dim, today = accent, future = outline). Replaces both the calendar and the world map. Tappable to inspect any day.
- A *rest day* state that does not feel like a void. It should communicate "today is recovery" with the same confidence as a training day.

### 6.4 Planning
Multi‑step: pick a preset → adjust → AI generates → preview → save. Currently feels like a wizard. The redesign should keep it stepwise but feel **editorial**, like reading a recipe before cooking. Preview the generated mesocycle as a readable artifact, not a table.

### 6.5 Session (the most important screen)
Real‑time workout. The user is sweaty, distracted, possibly mid‑set.

- The **active exercise** dominates 60–70% of the viewport. Name, reps, weight, rest target — all glanceable from arm's length.
- The **set logger** is one tap to confirm planned reps + weight, with optional inline editors for actual reps, actual weight, and a *warm‑up* toggle.
- The **rest timer** is full‑width, big numerals, no urgency colors, with a single "skip" affordance and a subtle audio chime (already implemented; design must respect that the chime exists and the visual must NOT add a flashing alarm).
- A **session strip** at the top or bottom shows the planned exercises as small dots/cards (planned · active · done · skipped). Tapping a non‑active dot is *non‑destructive* (peek only — never logs anything). This is a hard rule, see §10.
- A **between‑set "earn acknowledgement"** can be added later (already a service): when a totem is earned, the only place it surfaces is *after* the session ends, inline on the summary, never as a popup.

### 6.6 Session summary
After "finish session". A short, calm reflection page: global RPE slider, optional notes, optionally the inline earn‑acknowledgement (one totem, beautifully, never a confetti shower). One CTA "Save & close".

### 6.7 Stats
Charts (volume, progression, adherence) + the **totem inventory**.

- The current totem grid stretches the cards on wide screens. Redesign should: (a) treat totems as a **collection**, like stamps in an album, with a fixed maximum card width (≈ 120–140 px) and many columns on desktop; (b) make unearned totems visible but quiet (not hidden), so the user understands the universe; (c) have a calm "inspect" panel that opens inline (never a modal) and explains the rule.
- Charts should adopt the new dark theme natively (Recharts is the lib; design must specify axis / grid / line tokens).

### 6.8 Settings
Language switcher (CA / ES / EN), theme (dark default, light optional, "system"), aesthetic preference (today: classic / retro — the redesign may collapse this into a single coherent design, or keep an opt‑in "playful" toggle), data export / import, "about" and ethical statement.

---

## 7. Interaction & motion principles

- **Micro‑motion only.** 120–180 ms cubic‑out on hover, focus, tap. Never a 600 ms bounce.
- **Respect `prefers-reduced-motion` natively.** If the user's OS asks for reduced motion, *all* decorative motion stops; functional motion (a number ticking) stays.
- **No interrupting modals** during a session. Confirmation dialogs collapse to inline "are you sure?" rows.
- **Haptics (where the platform supports them, PWA on iOS/Android)** as a quiet companion: a short tap on set‑logged, a longer one on session‑complete.
- **Audio is opt‑in and minimal** — just a soft chime on rest‑end. Visual design must not need audio to communicate.

---

## 8. Accessibility

- WCAG AA contrast at minimum, AAA for the body type.
- Touch targets ≥ 44 × 44 CSS px (gym use; sweaty hands).
- Keyboard‑complete. Focus rings must be visible against the dark theme (often forgotten).
- All decorative pixel art `aria-hidden`; meaning lives in adjacent text.
- Color is never the only signal (state has icon + label, not just color).
- Screen reader labels in CA / ES / EN — never hardcoded English.

---

## 9. Internationalization

The product ships in **Catalan, Spanish, English** with full parity. The receiving tool must:

- Allow at least **+30%** text expansion for ES / EN versus CA.
- Avoid layouts that break with long compound German‑style words (we don't ship in DE, but use it as a stress test).
- Use locale‑aware date/number formatting in the visual mockups.

---

## 10. Hard product rules the design MUST honor

These are not negotiable. They come from real bugs and real values.

1. **Local‑first, no auth.** No login screen, no "create account" CTA, ever. The app starts in the home state on first run.
2. **A set is never logged from a decorative surface.** Tapping a "coin" / "card" / "dot" in the session strip must never call the log‑set action with planned values; logging always goes through the set logger so the user's edits (reps, weight, warm‑up flag) are preserved. Visually, those decorative surfaces must read as *inspectable*, not *actionable*.
3. **Saving a session is a transaction.** If the underlying write fails, the design must show an inline retry affordance on the summary screen — NOT a toast that disappears, NOT a navigation away. The user's data must be recoverable.
4. **No coercion.** Streak losses, "you broke your X‑day streak" copy, guilt language — forbidden.
5. **Skipped ≠ failed.** Visually and copy‑wise, a skipped set or a missed day is neutral.
6. **Gamification is opt‑in cosmetic.** The functional layer (plan, session, stats) must be 100% usable with the gamification surface hidden.
7. **Rest day ≠ empty day.** A rest day on the dashboard must have its own confident state.
8. **Three languages, parity.** Any string visible in one language must exist in the other two.

---

## 11. Components inventory (what to design)

Group the deliverables into a small, named system.

**Foundations**
- Color tokens (semantic + family + state)
- Typography scale (display, title, body, caption, numeric)
- Spacing scale, radius scale, shadow scale, motion durations
- Grid (mobile 4‑col, desktop 12‑col)

**Primitives**
- Button (primary, secondary, ghost, destructive‑neutral)
- Input (number, slider for RPE, text)
- Toggle, segmented control, chip
- Card (passive, interactive, "today" hero)
- List row (with leading icon, trailing meta)
- Empty state
- Inline alert (info, error‑calm, success‑calm — no red, no green panic)
- Inline confirm row (replaces modal confirms)
- Toast (transient, dismissible, never blocking)

**Domain components**
- Today hero card
- Period strip (the mesocycle days timeline)
- Day cell (planned / today / done / skipped / rest)
- Session HUD (top bar with set counter, exercise counter, elapsed)
- Active exercise card (name, reps, weight, rest target, warm‑up toggle)
- Set logger (inline editor)
- Rest timer (full‑bleed, big numerals)
- Session strip (peek‑only)
- Session summary (RPE + notes + earn‑ack slot)
- Earn acknowledgement (inline; never modal)
- Totem card (small, collectible)
- Totem inspect panel (inline, expandable)
- Charts (adherence bar, volume area, progression line) — dark‑mode‑native
- Language switcher (always visible from app bar)
- Theme switcher

---

## 12. Concrete deliverables expected from the receiving tool

1. **Mood board** (3–6 reference clusters) confirming the chosen direction before any pixels.
2. **Final color palette + dark theme tokens** as a JSON or table (semantic names: `--surface-bg`, `--surface-fg`, `--accent`, `--family-consistency`, etc.).
3. **Typography spec** (font names, weights, sizes, line‑heights for mobile + desktop).
4. **Component sheet** (every primitive + domain component above, in default / hover / focus / disabled / active states where applicable).
5. **Hero screen mockups** for: Landing, Dashboard (training day + rest day), Session (mid‑rest), Session summary with one earned totem, Stats with the new totem collection.
6. **Empty states** for: Dashboard before any plan, Stats before any session, Totem inventory before any totem.
7. **One short rationale doc** (≤ 600 words) explaining the brand decisions in plain language so the implementer (a coding agent) can preserve intent during translation to code.

---

## 13. What is out of scope for this brief

- Backend / infra / API choices (we have none — local‑first, IndexedDB).
- AI plan generation logic.
- Code implementation (the brief is design‑first; a separate implementation pass will translate it into Tailwind tokens + React components).

---

## 14. How the implementer will translate the design back into code

The current implementation already uses CSS custom properties (`--theme-session-*`, `--theme-stats-family-*`, etc.). The design's color and typography tokens will land as CSS variables on `:root` (and `:root[data-theme='light']` if a light variant ships), so the React components can keep their structure and only swap tokens. Designers should therefore think in **named tokens**, not in raw hex values, for everything that can change between themes.

---

*This brief is the contract between the product owner and the design tool. Any deviation must be justified in the rationale doc (§12.7).*
