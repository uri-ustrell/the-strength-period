# Feature 05 — Onboarding Flow

## Dependencies
Steps 2 (Exercises), 4 (IndexedDB) must be complete.

## Acceptance Criteria
- [ ] 2-step stepper with visual progress indicator
- [ ] Step 1: Profile selection (athlete/rehab/general) with descriptions
- [ ] Step 2: Equipment multi-select, days/week, minutes/session, restrictions
- [ ] On completion: all config written to IndexedDB `config` store
- [ ] `onboardingCompleted` flag prevents re-showing onboarding
- [ ] Back/forward navigation between steps
- [ ] All text via i18n keys

## Files to Create

```
src/types/user.ts
src/stores/userStore.ts
src/pages/Onboarding/index.tsx        ← Stepper container
src/pages/Onboarding/Step1Profile.tsx
src/pages/Onboarding/Step3Context.tsx
src/i18n/locales/ca/onboarding.json
src/i18n/locales/es/onboarding.json
src/i18n/locales/en/onboarding.json
```

## Step Details

### Step 1 — Profile
Three cards, user picks one:
- **Atleta autònom** — "Sé el que faig, vull control total"
- **En rehabilitació** — "Tinc una lesió activa o recent"
- **Esportista general** — "Vull millorar, necessito guia"

### Step 2 — Context
- Equipment: multi-select checkboxes (pes_corporal, manueles, barra, banda_elastica, pilates, trx)
- Days per week: 1-7 visual selector
- Minutes per session: 15/30/45/60/90 toggle group
- Active restrictions: common injury checkboxes + free text field

## Routing Logic
```
if (!onboardingCompleted) → redirect to /onboarding
if (onboardingCompleted) → allow /dashboard, /planning, etc.
```
