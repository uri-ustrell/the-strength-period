# The Strength Period — Workspace Instructions

## Project Context
Zero-backend, local-first fitness web app. React 18 + TypeScript 5 + Vite 5 + Tailwind CSS v3.
Data lives in IndexedDB (local). Deterministic on-device planning engine. No auth needed.

**Before any task**, read these specs:
1. `specs/OVERVIEW.md` — product vision + architecture
2. `specs/CONVENTIONS.md` — code style + patterns
3. `specs/STATUS.md` — what's done, what's next
4. The relevant `specs/features/XX-*.md` for the feature being worked on

**After completing any task**, update `specs/STATUS.md` (mark step status + brief note). Add detailed completion notes to `specs/STATUS_HISTORY.md`.

## Build & Test
- `npm run dev` — start dev server (localhost:5173)
- `npm run build` — TypeScript check + Vite production build
- `npm run lint` — TypeScript type check only

## Key Architecture Rules
- Exercises live in memory, never persisted to IndexedDB
- IndexedDB is exclusively for user-generated data (plans, executions, sessions, config)
- All user-facing strings via i18next keys (ca/es/en) — never hardcoded text
- Path alias: `@/` → `src/`
- Named exports only (no default exports except pages for lazy loading)
- Export/Import: JSON file for data portability (Feature 10)

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Custom Agent Routing
When the user's request matches one of the custom agents below, **invoke it automatically via `runSubagent`** — do not ask the user to switch manually. Do not handle the task yourself if a specialized agent exists for it.

| Agent | When to use |
|---|---|
| `implementer` | Implementing features, writing TypeScript/React code, building components, services, stores, hooks, pages |
| `architect` | Planning architecture, writing/refining specs, designing features, data model decisions |
| `reviewer` | Code review, validating implementation against specs, auditing conventions and security |
| `ux-reviewer` | Reviewing UI/UX, accessibility, interaction flows, visual hierarchy, mobile responsiveness |
| `enricher` | Adding/enriching exercise data, translating exercise names, mapping muscles, tagging exercises |
| `content-factory` | Bulk generating exercises and presets, creating training plan templates, enriching the catalog |

**Routing rules:**
- Invoke the matching agent via `runSubagent` immediately, without asking the user
- Multi-agent requests: sequence `runSubagent` calls, starting with the most relevant
- For pure research/exploration: use the `Explore` agent via `runSubagent`
- One subagent per focused task — don't bundle unrelated concerns
- Preserve development language consistency: repository artifacts in English unless user explicitly requests localized copy

**Maintenance rule:** When a new `.agent.md` is created under `.github/agents/`, add it to this table.

### 3. Self-Improvement
- After corrections: update `tasks/lessons.md`. Review lessons at session start.

### 4. Verification
- Never mark done without proving it works: `npm run build`, check logs, demonstrate correctness.

### 5. Elegance
- Non-trivial changes: "is there a more elegant way?" Skip for simple, obvious fixes.

### 6. Bug Fixing
- Autonomous: read logs/errors → diagnose → fix. Zero hand-holding from the user.

## Task Management
1. Write plan to `tasks/todo.md` with checkable items
2. Track progress: mark items complete as you go
3. After corrections: update `tasks/lessons.md`

## Core Principles
- **Simplicity First**: Minimal change, minimal impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Only touch what's necessary. Avoid introducing bugs.
- **Development Language Consistency**: English for repository artifacts unless explicitly requested otherwise.
