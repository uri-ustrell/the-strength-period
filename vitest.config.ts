import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * Vitest configuration for frontend unit tests.
 *
 * Scope: `src/**\/*.test.{ts,tsx}` only. Ingestion CLI tests live under
 * `scripts/` and run on the Node test runner via `npm run test:ingestion`;
 * Vitest must NOT pick those up because they use the `node:test` API.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    globals: false,
    css: false,
  },
})
