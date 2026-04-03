# The Strength Period — Product Overview

## Vision
A zero-backend, local-first fitness web app that generates personalized training plans via AI, tracks workouts in real-time, and persists all data locally in IndexedDB. No servers, no accounts, no friction — open the app and start training.

**Philosophy:** The user owns their data. Always. Data lives on the device, exportable anytime.

## Architecture

```
User (Browser)
  ├── IndexedDB ──────────────→ Local persistence (plans, executions, config)
  ├── Vercel Serverless Fn ───→ Gemini 2.5 Flash (project API key, server-side)
  ├── free-exercise-db ───────→ /public/exercises.json (static)
  └── Export / Import ────────→ JSON file (user backup & portability)
```

User data stays local. AI inference goes through a minimal server-side proxy. No user data is stored server-side.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript 5 |
| Build | Vite 5 |
| Styles | Tailwind CSS v3 |
| Routing | React Router v6 |
| State | Zustand v4 |
| i18n | i18next + react-i18next + browser-languagedetector |
| Data | IndexedDB (local, via idb wrapper) |
| AI | Gemini 2.5 Flash via Vercel Serverless Function (project key) |
| Exercises | free-exercise-db (static JSON in /public) |
| Charts | Recharts |
| Icons | Lucide React |
| Hosting | Vercel |

## Key Design Decisions

1. **Exercises live in memory, never persisted** — IndexedDB is exclusively for user-generated data
2. **No auth required** — zero friction, the user opens the app and starts immediately
3. **Server-side AI proxy** — AI inference via Vercel Serverless Function with project-owned key. No user API key needed.
4. **i18n from day 1** — Catalan (ca), Spanish (es), English (en)
5. **No external UI library** — minimal custom components (Button, Card, Modal, etc.)
6. **Export/Import** — JSON-based data portability as the last feature step

## UX Principles

1. **Ease of use above all** — Every interaction should require minimal clicks and zero cognitive load. If a feature feels complex, simplify it.
2. **Zero friction** — No accounts, no sign-ups, no loading walls. Open the app and start training immediately.
3. **Immediate feedback** — Actions confirm instantly with visual feedback (toasts, state changes, animations). Never leave the user wondering if something worked.
4. **Language inclusivity** — Language switcher accessible from any screen, at any time. The user never has to dig through settings to change language.
5. **Mobile-first** — Touch targets large enough for gym use (sweaty hands, distracted attention). Every screen usable one-handed.
6. **Progressive disclosure** — Show only what's needed at each step. Advanced options hidden until requested.

## User Screens

1. **Landing** — Hero + CTA → Go to Onboarding or Dashboard
2. **Onboarding** (2 steps) — Profile type → Context (equipment/days/restrictions)
3. **Dashboard** — Today's session, weekly view, streak, quick generation
4. **Planning** — Create plan (preset → config → AI generation → preview → save)
5. **Session** — Real-time workout: exercise display, set logging, rest timer, RPE
6. **Stats** — Volume charts, progression, adherence, PR tracker

## IndexedDB Structure

Database: `the-strength-period` with 4 object stores:
- `config` — key/value user settings
- `mesocycles` — mesocycle definitions with session templates
- `sessions` — executed session headers (RPE, notes, timestamps)
- `executedSets` — individual executed sets


