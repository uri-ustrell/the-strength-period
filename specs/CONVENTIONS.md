# Code Conventions — The Strength Period

## Language & Formatting

- **TypeScript strict mode** — no `any`, no implicit returns
- **Functional components only** — no class components
- **Arrow functions** for components and handlers
- **Named exports** — no default exports (except pages for lazy loading)
- **File naming**: `camelCase.ts` for services/utils, `PascalCase.tsx` for components/pages

## Import Order

```typescript
// 1. React / external libraries
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// 2. Types
import type { Exercise, MuscleGroup } from '@/types/exercise'

// 3. Services
import { loadExercises } from '@/services/exercises/exerciseLoader'

// 4. Stores
import { useExerciseStore } from '@/stores/exerciseStore'

// 5. Components
import { Button } from '@/components/ui/Button'

// 6. Styles / assets (if any)
```

## Path Aliases

- `@/` maps to `src/` (configured in tsconfig.json + vite.config.ts)

## State Management (Zustand)

```typescript
// Pattern for all stores:
import { create } from 'zustand'

interface ExampleStore {
  // State
  items: Item[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchItems: () => Promise<void>
  reset: () => void
}

export const useExampleStore = create<ExampleStore>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async () => {
    set({ isLoading: true, error: null })
    try {
      const items = await someService()
      set({ items, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  reset: () => set({ items: [], isLoading: false, error: null }),
}))
```

## i18n

- All user-facing strings use `t('namespace:key')` — never hardcoded text
- Namespaces: `common`, `exercises`, `muscles`, `planning`, `onboarding`
- Language files: `src/i18n/locales/{ca,es,en}/{namespace}.json`
- Default language: `ca` (Catalan)
- Fallback: `en`

## Error Handling

- Services throw typed errors — components catch and display via i18n keys
- IndexedDB errors: show error UI with retry option
- AI service errors: show retry UI with error message
- Network errors: show offline banner (affects AI generation)

## Component Patterns

```typescript
// Components receive typed props, use hooks internally
interface Props {
  exerciseId: string
  onComplete: (result: ExecutedSet) => void
}

export const SetLogger = ({ exerciseId, onComplete }: Props) => {
  const { t } = useTranslation('common')
  // ...
}
```

## File Organization

- `src/types/` — TypeScript type definitions only (no logic)
- `src/data/` — Static data, enrichment maps, presets, progression rules
- `src/services/` — Business logic, API calls, algorithms (no React imports)
- `src/stores/` — Zustand stores (thin layer, delegates to services)
- `src/hooks/` — Custom React hooks (compose stores + side effects)
- `src/components/` — Reusable UI components (organized by domain)
- `src/pages/` — Route-level components (compose components + hooks)

## Security Rules

- Never log API keys to console
- CSP headers configured in vercel.json
- No inline scripts, no eval()
