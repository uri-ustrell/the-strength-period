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
1. `specs/CONVENTIONS.md` — expected patterns
2. `specs/DATA_MODEL.md` — expected types
3. `specs/features/XX-*.md` — the feature spec being reviewed
4. `tasks/lessons.md` — known issues to watch for

### 2. Apply Review Checklist
Use the full checklist from `.github/agents/reviewer.agent.md` — covers spec compliance, conventions, architecture rules, component quality (SRP), and security.

### 3. Build Verification
Run `npm run build` and confirm zero errors.

### 4. Report
```
## Review: [Feature Name]
### ✅ Pass — items that meet spec
### ❌ Issues — [file:line] problem → fix
### ⚠️ Warnings — optional improvements
```
