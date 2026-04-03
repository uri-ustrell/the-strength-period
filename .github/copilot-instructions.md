# The Strength Period — Workspace Instructions

## Project Context
Zero-backend, local-first fitness web app. React 18 + TypeScript 5 + Vite 5 + Tailwind CSS v3.
Data lives in IndexedDB (local). AI plans via Vercel Serverless Function (Gemini, project key, server-side). No auth needed.

**Before any task**, read these specs:
1. `specs/OVERVIEW.md` — product vision + architecture
2. `specs/CONVENTIONS.md` — code style + patterns
3. `specs/STATUS.md` — what's done, what's next
4. The relevant `specs/features/XX-*.md` for the feature being worked on

**After completing any task**, update `specs/STATUS.md` with what was done.

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

**Routing rules:**
- If the request is clearly scoped to one agent: invoke it via `runSubagent` immediately, without asking the user
- If the request spans multiple agents (e.g. implement + review): sequence `runSubagent` calls, starting with the most relevant
- For pure research/exploration within a task: use `search_subagent` to keep context clean
- One subagent per focused task — don't bundle unrelated concerns
- Only inform the user which agent was invoked and what it was asked to do
- Preserve development language consistency across all agents: write repository artifacts (code comments, specs, task docs, status notes, and agent-generated documentation) in English unless the user explicitly requests localized product copy.

**Maintenance rule:** When a new `.agent.md` is created under `.github/agents/`, it MUST be added to the table above with its trigger conditions.

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management
1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Development Language Consistency**: Keep the development language in English across source-adjacent artifacts and internal project documentation unless a task explicitly targets end-user localization content.
