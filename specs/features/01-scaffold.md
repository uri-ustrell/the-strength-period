# Feature 01 — Scaffold

## Dependencies
None — this is the foundation.

## Acceptance Criteria
- [ ] Vite 5 + React 18 + TypeScript 5 project initialized
- [ ] All dependencies installed and importable
- [ ] Tailwind CSS configured and utility classes work
- [ ] React Router v6 with all route shells rendering
- [ ] i18next configured with ca/es/en skeleton files
- [ ] Path alias `@/` → `src/` works in imports
- [ ] `npm run dev` starts dev server
- [ ] `npm run build` succeeds with zero errors
- [ ] `vercel.json` present

## Dependencies to Install

```
react-router-dom
zustand
i18next react-i18next i18next-browser-languagedetector
recharts
lucide-react
```

Dev dependencies:
```
tailwindcss postcss autoprefixer
```

## Routes

| Path | Page Component |
|------|---------------|
| `/` | Landing |
| `/onboarding` | Onboarding |
| `/dashboard` | Dashboard |
| `/planning` | Planning |
| `/session` | Session |
| `/stats` | Stats |

## i18n Configuration

- Default language: `ca`
- Fallback: `en`
- Detection: browser language → localStorage → default
- Namespaces: `common`, `exercises`, `muscles`, `planning`, `onboarding`
- Files: `src/i18n/locales/{ca,es,en}/{namespace}.json`

## Files to Create

```
src/main.tsx
src/App.tsx
src/i18n/index.ts
src/i18n/locales/ca/common.json
src/i18n/locales/es/common.json
src/i18n/locales/en/common.json
src/pages/Landing.tsx          (placeholder)
src/pages/Onboarding/index.tsx (placeholder)
src/pages/Dashboard.tsx        (placeholder)
src/pages/Planning.tsx         (placeholder)
src/pages/Session.tsx          (placeholder)
src/pages/Stats.tsx            (placeholder)
vercel.json
tailwind.config.js
vite.config.ts (update with alias)
tsconfig.json (update with paths)
index.html
```
