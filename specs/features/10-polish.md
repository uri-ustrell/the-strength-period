# Feature 10 — Polish + Production + Export/Import

## Dependencies
All previous steps must be complete.

## Acceptance Criteria
- [ ] PWA: manifest.json + service worker (vite-plugin-pwa)
- [ ] Offline: cached exercises, offline warning banner (only for Claude API)
- [ ] Error handling: all async operations have loading states + error states
- [ ] Responsive: mobile-first, especially Session page
- [ ] Export: download all IndexedDB data as a single JSON file
- [ ] Import: upload a JSON file → validate schema → merge or replace IndexedDB data
- [ ] UI components library complete (Button, Card, Modal, Timer, Slider, LanguageSelector, LoadingSpinner)
- [ ] CSP headers in vercel.json
- [ ] Security audit: no secrets in network tab, encrypted API key in localStorage
- [ ] `npm audit` clean
- [ ] Full E2E flow works: Landing → Onboarding → Create Plan → Session → Stats → Export

## Files to Create/Update

```
src/services/db/exportImport.ts       ← Export/Import logic
src/components/data/ExportButton.tsx
src/components/data/ImportButton.tsx
src/components/ui/Button.tsx
src/components/ui/Card.tsx
src/components/ui/Modal.tsx
src/components/ui/Timer.tsx
src/components/ui/Slider.tsx
src/components/ui/LanguageSelector.tsx
src/components/ui/LoadingSpinner.tsx
public/manifest.json
vercel.json (update with CSP headers)
```

## Export/Import Logic

```typescript
// exportImport.ts

async function exportData(): Promise<void> {
  // 1. Read all data from IndexedDB (config, mesocycles, sessions, executedSets)
  // 2. Build ExportData object with version number
  // 3. JSON.stringify with formatting
  // 4. Create Blob and trigger browser download
  // Filename: "the-strength-period-YYYY-MM-DD.json"
}

async function importData(file: File): Promise<{ success: boolean; error?: string }> {
  // 1. Read file as text
  // 2. Parse JSON
  // 3. Validate schema version and structure
  // 4. Ask user: merge or replace?
  // 5. Write to IndexedDB (in transaction)
  // 6. Return result
}
```

## PWA Configuration

```typescript
// vite.config.ts addition
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'The Strength Period',
    short_name: 'TSP',
    theme_color: '#000000',
    icons: [...]
  },
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /\/exercises\/exercises\.json$/,
        handler: 'CacheFirst'  // exercises are static
      }
    ]
  }
})
```

## CSP Headers (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.anthropic.com; img-src 'self' data: https:; font-src 'self'"
        }
      ]
    }
  ]
}
```

## Security Checklist
- [ ] Claude API key encrypted in localStorage
- [ ] No secrets in console.log
- [ ] No secrets visible in Network tab (except to Anthropic API)
- [ ] CSP prevents XSS
- [ ] No eval() or inline scripts
- [ ] npm audit shows no high/critical vulnerabilities
- [ ] Import validates JSON schema before writing to IndexedDB
