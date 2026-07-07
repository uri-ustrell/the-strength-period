import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'The Strength Period',
        short_name: 'TSP',
        // Dark single-skin identity (see src/index.css --color-bg #1e1b2e).
        theme_color: '#1e1b2e',
        background_color: '#1e1b2e',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell + fonts so all non-network flows (dashboard,
        // session, stats) render fully offline after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        // SPA: serve index.html for client-side routes when offline (a hard
        // refresh / deep-link on /session would otherwise 404). Keep API and
        // the exercises asset out of the fallback.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /\/exercises\//],
        runtimeCaching: [
          {
            urlPattern: /\/exercises\/exercises\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercises-cache',
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy, cacheable vendors out of the entry chunk.
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          recharts: ['recharts'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
  },
})
