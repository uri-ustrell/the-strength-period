---
name: feature-implement
description: "Implement a feature step for The Strength Period. Use when: implementing a step, building exercises, implementing a feature, creating services or components. Reads the feature spec, checks dependencies, implements, and verifies build."
---

# Feature Implementation Workflow

## When to Use
- User says "implement step X" or "build feature X"
- Starting work on any of the 10 implementation steps
- Any task that creates new source code files following a spec

## Procedure

### 1. Load Context
Read these files in order:
1. `specs/OVERVIEW.md` — architecture constraints
2. `specs/CONVENTIONS.md` — code patterns
3. `specs/STATUS.md` — verify all dependencies are ✅ Complete
4. `specs/features/XX-*.md` — the specific feature spec
5. `tasks/lessons.md` — avoid past mistakes

### 2. Verify Dependencies
Check `specs/STATUS.md` — if any dependency step is not ✅ Complete, STOP and report which steps need to be done first.

### 3. Plan
Write checkable items to `tasks/todo.md`:
- List every file to create/modify
- Order: types → services → stores → hooks → components → pages
- Include "verify build" as a step

### 4. Implement
For each file in the plan:
1. Follow the spec's function signatures exactly
2. Use `@/` path alias for all imports
3. Use i18next keys for all user-facing strings
4. Use named exports only
5. Follow Zustand pattern from CONVENTIONS.md for stores

### 5. Verify
After all files created:
1. Run `npm run build` — must pass with zero errors
2. Check each acceptance criterion from the feature spec
3. Mark completed items in `tasks/todo.md`

### 6. Update Status
Update `specs/STATUS.md`:
- Mark the step as ✅ Complete
- List files created under Completed Work
- Update "Next Up" section
