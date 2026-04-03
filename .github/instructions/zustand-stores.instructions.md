---
description: "Use when editing or creating Zustand stores. Ensures stores follow the documented pattern with typed state, actions, and error handling."
applyTo: "src/stores/**/*.ts"
---

# Zustand Store Pattern

Follow this exact pattern for every store:

```typescript
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

## Rules
- Always include `isLoading` and `error` for async operations
- Actions clear error before starting (`error: null`)
- Use named export: `export const useXxxStore`
- Delegate business logic to services — stores are thin wrappers
- Type the store interface explicitly
