---
name: feature-review
description: "Review and validate a completed feature implementation. Use when: reviewing code, validating against spec, checking conventions, auditing security, verifying build, quality assurance, code review."
---

# Feature Review Workflow

## When to Use
- After a feature step has been implemented
- User says "review step X" or "check the implementation"
- Before marking a feature as truly complete
- Periodic quality checks across the codebase

## Procedure

### 1. Load Context
Read these files:
1. `specs/CONVENTIONS.md` — expected patterns
2. `specs/DATA_MODEL.md` — expected types
3. `specs/features/XX-*.md` — the feature spec being reviewed
4. `tasks/lessons.md` — known issues to watch for

### 2. Spec Compliance Check
For each acceptance criterion in the feature spec:
- [ ] Verify the criterion is met in the code
- [ ] Verify listed files exist with expected exports
- [ ] Verify function signatures match

### 3. Convention Check
Scan all files created/modified:
- [ ] Named exports only (no default except lazy pages)
- [ ] `@/` path alias for internal imports
- [ ] Import order: React → types → services → stores → components
- [ ] No hardcoded user-facing strings (all via `t()`)
- [ ] Zustand stores follow documented pattern

### 4. Architecture Check
- [ ] Exercises never written to IndexedDB
- [ ] IndexedDB only for user-generated data
- [ ] No secrets in console.log
- [ ] API keys encrypted before localStorage
- [ ] No `any` types
- [ ] No `eval()` or dangerous `innerHTML`

### 5. Build Verification
Run `npm run build` and confirm zero errors.

### 6. Report
Output a structured review:
```
## Review: [Feature Name]
### ✅ Pass — items that meet spec
### ❌ Issues — problems with file:line and fix suggestion
### ⚠️ Warnings — optional improvements
```
