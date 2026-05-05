import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest is configured with `globals: false`, so @testing-library/react's
// auto-cleanup hook is NOT registered automatically. Without this, every
// `render()` accumulates DOM nodes across tests in the same file, causing
// duplicate-element queries. Register cleanup explicitly.
afterEach(() => {
  cleanup()
})
