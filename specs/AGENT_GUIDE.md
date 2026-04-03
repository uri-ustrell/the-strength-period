# Agent Guide — The Strength Period

## Purpose

This document defines how AI agents should work on this project to maintain context, avoid regressions, and enable parallel development.

## Before Starting Any Task

Every agent session MUST begin by reading:

1. `specs/OVERVIEW.md` — understand the product
2. `specs/CONVENTIONS.md` — follow code patterns
3. `specs/STATUS.md` — know what's done and what's next
4. `specs/features/XX-*.md` — the specific feature spec for the task

## After Completing Any Task

Update `specs/STATUS.md` with:
- What was completed (files created/modified)
- Any issues found
- What's ready for the next step

## Agent Roles

### Architect Agent
- **Reads:** All specs
- **Writes:** `specs/` only — never writes code
- **Purpose:** Creates/refines feature specs, updates conventions, plans architecture
- **When to use:** Before implementing a new feature, when design decisions are needed

### Implementer Agent
- **Reads:** OVERVIEW + CONVENTIONS + relevant feature spec + STATUS
- **Writes:** `src/` code + updates STATUS.md
- **Purpose:** Implements one feature spec at a time
- **When to use:** Feature spec is written and reviewed, dependencies are met

### Reviewer Agent
- **Reads:** All specs + `src/` code
- **Writes:** STATUS.md (marks issues)
- **Purpose:** Validates implementation matches the spec
- **When to use:** After implementation, before marking a feature complete

### Enricher Agent
- **Reads:** DATA_MODEL + `specs/features/02-exercises.md`
- **Writes:** `src/data/` + `src/i18n/locales/`
- **Purpose:** Exercise enrichment (tags, restrictions, translations)
- **When to use:** Adding new exercises, expanding coverage

## Workflow Per Feature

```
1. [Architect]    Write/refine spec → specs/features/XX-*.md
2. [Implementer]  Read spec → implement → update STATUS.md
3. [Reviewer]     Read spec + code → validate → flag issues
4. [Implementer]  Fix issues → update STATUS.md ✓
```

## Parallelization Rules

- Steps 2 (exercises) and 4 (IndexedDB) can run in parallel
- Steps 6 (session engine) and 7 (planning engine) can run in parallel
- All other steps are sequential — check dependencies in STATUS.md
- Never start a step if its dependencies aren't marked complete in STATUS.md

## Key Principles

1. **Spec is source of truth** — if code disagrees with spec, spec wins (unless spec is wrong, then update spec first)
2. **No undocumented patterns** — if you establish a new pattern, add it to CONVENTIONS.md
3. **Small, focused changes** — implement one feature at a time, verify, then move on
4. **Types first** — always implement types before services, services before components
5. **i18n always** — never hardcode user-facing strings
