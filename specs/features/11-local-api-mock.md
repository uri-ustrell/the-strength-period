# Feature 11 — Local API Mocking for Dev

## Dependencies
Step 7 (Planning Engine) must be complete — needs `api/generate-plan.ts` and `src/services/planning/planningEngine.ts`.

## Problem
Running `npm run dev` starts Vite on `localhost:5173`. The frontend calls `fetch('/api/generate-plan')`, but Vite does not know how to serve Vercel Serverless Functions. This results in a 404 response. The serverless function only works when deployed to Vercel (via `vercel.json` rewrites).

**Current state:**
- `vite.config.ts` — no proxy or mock configuration
- `vercel.json` — rewrites `/api/(.*)` → `/api/$1` (Vercel-only)
- `package.json` scripts: `dev: vite`, no Vercel CLI integration
- `api/generate-plan.ts` — Vercel Serverless Function using `@vercel/node` types (`VercelRequest`, `VercelResponse`)
- `GEMINI_API_KEY` is read from `process.env` inside the serverless function

## Recommended Approach: `vercel dev`

The simplest solution since the API is already a Vercel Serverless Function.

### How it works
The Vercel CLI includes a local dev server (`vercel dev`) that:
1. Runs Vite as the frontend framework dev server (auto-detected from `package.json`)
2. Emulates Vercel Serverless Functions locally at `/api/*`
3. Reads environment variables from `.env.local`
4. Hot-reloads function code changes

### Setup Steps

1. **Install Vercel CLI globally:**
   ```bash
   npm i -g vercel@latest
   ```
   Or as a devDependency:
   ```bash
   npm i -D vercel
   ```
   Recommended: global install to avoid cluttering devDependencies.

2. **Link the project (one-time):**
   ```bash
   vercel link
   ```
   This creates `.vercel/project.json` locally (already gitignored via `.vercel/` in `.gitignore`).
   - Select the appropriate Vercel account/team when prompted
   - Link to existing project or create a new one

3. **Create `.env.local` with the Gemini API key:**
   ```bash
   # .env.local (already gitignored)
   GEMINI_API_KEY=your-gemini-api-key-here
   ```
   **Note:** `.env.local` must be gitignored. Never commit API keys.

4. **Add `dev:api` script to `package.json`:**
   ```json
   {
     "scripts": {
       "dev": "vite",
       "dev:api": "vercel dev",
       "build": "tsc -b && vite build",
       "preview": "vite preview",
       "lint": "tsc --noEmit"
     }
   }
   ```
   - `npm run dev` — frontend-only (existing behavior, no API)
   - `npm run dev:api` — full-stack local dev (Vite + serverless functions)

5. **Run locally:**
   ```bash
   npm run dev:api
   ```
   Vercel CLI starts on `localhost:3000` by default (configurable with `--listen`). It proxies the Vite dev server and handles `/api/*` routes locally.

### Vercel CLI behavior details
- Detects Vite as the framework from `package.json` and runs `vite` internally
- Serves `api/generate-plan.ts` at `POST /api/generate-plan` with Node.js runtime
- Loads `.env.local` automatically (no additional config needed)
- Provides the same `VercelRequest`/`VercelResponse` interface as production
- Default port: `3000` (change with `vercel dev --listen 5173` to keep the same port)

### Environment variable precedence
Vercel CLI reads env vars in this order:
1. `.env.local` (highest priority, gitignored)
2. `.env` (gitignored)
3. Vercel project environment variables (pulled via `vercel env pull`)

Optional: pull production env vars to `.env.local`:
```bash
vercel env pull .env.local
```

---

## Alternative Approach A: Vite Proxy + Local Express Server

For teams that prefer not to depend on the Vercel CLI locally.

### How it works
1. Create a minimal local Express server that imports and runs the same handler function
2. Configure Vite's built-in proxy to forward `/api/*` requests to the Express server
3. Run both in parallel with `concurrently`

### Setup Steps

1. **Install dependencies:**
   ```bash
   npm i -D express concurrently tsx
   npm i -D @types/express
   ```
   - `express` ^4.21 — local API server
   - `concurrently` ^9.1 — run Vite + Express in parallel
   - `tsx` ^4.19 — run TypeScript directly (no build step)

2. **Create `scripts/dev-server.ts`:**
   ```typescript
   import express from 'express'
   import { config } from 'dotenv'
   import handler from '../api/generate-plan'

   config({ path: '.env.local' })

   const app = express()
   app.use(express.json())

   app.post('/api/generate-plan', (req, res) => {
     handler(req as any, res as any)
   })

   const PORT = 3001
   app.listen(PORT, () => {
     console.log(`API dev server running on http://localhost:${PORT}`)
   })
   ```
   **Caveat:** The Vercel handler uses `VercelRequest`/`VercelResponse` types which are close to Express's `Request`/`Response` but not identical. Minor type casting (`as any`) is needed. Test thoroughly.

3. **Update `vite.config.ts`:**
   ```typescript
   export default defineConfig({
     plugins: [react()],
     resolve: {
       alias: { '@': path.resolve(__dirname, './src') },
     },
     server: {
       proxy: {
         '/api': {
           target: 'http://localhost:3001',
           changeOrigin: true,
         },
       },
     },
   })
   ```

4. **Add script to `package.json`:**
   ```json
   {
     "scripts": {
       "dev": "vite",
       "dev:api": "concurrently \"vite\" \"tsx scripts/dev-server.ts\"",
       "build": "tsc -b && vite build"
     }
   }
   ```

### Pros
- No Vercel CLI dependency
- Full control over the local server
- Easy to add custom mock endpoints

### Cons
- Extra files and dependencies to maintain
- `VercelRequest`/`VercelResponse` are not exactly Express types — subtle differences may cause bugs
- Need to keep proxy config and serverless routes in sync

---

## Alternative Approach B: MSW (Mock Service Worker)

For testing with canned responses without hitting the Gemini API.

### How it works
MSW intercepts `fetch()` calls in the browser (via Service Worker) or in tests (via Node.js) and returns predefined mock responses. No actual API call is made.

### Setup Steps

1. **Install MSW:**
   ```bash
   npm i -D msw@^2.7
   ```

2. **Initialize the service worker:**
   ```bash
   npx msw init public/ --save
   ```
   This creates `public/mockServiceWorker.js` (add to `.gitignore` or commit — it's a static file).

3. **Create `src/mocks/handlers.ts`:**
   ```typescript
   import { http, HttpResponse } from 'msw'
   import { mockMesocycleResponse } from './fixtures/mesocycle'

   export const handlers = [
     http.post('/api/generate-plan', async ({ request }) => {
       const body = await request.json()
       // Optionally vary response based on body.preset
       return HttpResponse.json(mockMesocycleResponse, { status: 200 })
     }),
   ]
   ```

4. **Create `src/mocks/fixtures/mesocycle.ts`:**
   ```typescript
   // A realistic canned Mesocycle response matching the LLMResponse interface
   export const mockMesocycleResponse = {
     mesocycle: {
       name: "Força General 8 Setmanes",
       durationWeeks: 8,
       weeks: [/* ... realistic week data ... */],
     },
   }
   ```

5. **Create `src/mocks/browser.ts`:**
   ```typescript
   import { setupWorker } from 'msw/browser'
   import { handlers } from './handlers'

   export const worker = setupWorker(...handlers)
   ```

6. **Conditionally start MSW in `src/main.tsx`:**
   ```typescript
   async function enableMocking() {
     if (import.meta.env.DEV && import.meta.env.VITE_MOCK_API === 'true') {
       const { worker } = await import('./mocks/browser')
       return worker.start({ onUnhandledRequest: 'bypass' })
     }
   }

   enableMocking().then(() => {
     ReactDOM.createRoot(document.getElementById('root')!).render(
       <React.StrictMode><App /></React.StrictMode>
     )
   })
   ```

7. **Run with mocks enabled:**
   ```bash
   VITE_MOCK_API=true npm run dev
   ```
   Or add to `.env.local`:
   ```
   VITE_MOCK_API=true
   ```

### Pros
- No server needed at all — works purely in the browser
- Deterministic responses — great for development and demos
- Can be reused for future testing
- No Gemini API key needed for UI development

### Cons
- Does not test the actual serverless function
- Mock data must be maintained manually
- Does not validate request format against the real API

---

## Recommendation

| Use Case | Approach |
|----------|----------|
| **Default local dev** (full-stack) | `vercel dev` — minimal setup, real function execution |
| **UI-only development** (no API key) | MSW — canned responses, no server |
| **CI / E2E testing** | MSW — deterministic, no external dependencies |
| **Team without Vercel account** | Vite proxy + Express |

**Primary:** Use `vercel dev` as the main local development approach. It requires no extra code, runs the real serverless function, and reads `.env.local` automatically.

**Secondary:** Add MSW for UI development without an API key and for future E2E test infrastructure.

---

## Files to Create/Modify

```
package.json                          ← Add "dev:api": "vercel dev" script
.env.local                            ← GEMINI_API_KEY (created locally, never committed)
```

Optional (if MSW approach is also implemented):
```
src/mocks/handlers.ts                 ← MSW request handlers
src/mocks/browser.ts                  ← MSW browser worker setup
src/mocks/fixtures/mesocycle.ts       ← Canned mesocycle response
public/mockServiceWorker.js           ← MSW service worker (generated by npx msw init)
src/main.tsx                          ← Conditional MSW initialization (dev only)
```

## Acceptance Criteria

### Primary (`vercel dev`)
- [ ] Vercel CLI installed (globally or as devDependency)
- [ ] Project linked via `vercel link` (`.vercel/` folder created, already gitignored)
- [ ] `.env.local` contains `GEMINI_API_KEY` and is gitignored
- [ ] `package.json` has `"dev:api": "vercel dev"` script
- [ ] `npm run dev:api` starts local server with both frontend and API
- [ ] `POST /api/generate-plan` works locally with the real Gemini API
- [ ] Rate limiting works locally (in-memory, same as production)
- [ ] Error responses (400, 429, 502) work locally
- [ ] `npm run dev` still works for frontend-only development (unchanged)

### Secondary (MSW — optional)
- [ ] MSW ^2.7 installed as devDependency
- [ ] `src/mocks/handlers.ts` intercepts `POST /api/generate-plan`
- [ ] `src/mocks/fixtures/mesocycle.ts` contains a realistic canned response matching `LLMResponse` interface
- [ ] MSW only activates when `VITE_MOCK_API=true` (harmless in production builds)
- [ ] `VITE_MOCK_API=true npm run dev` returns canned plan data in the UI

## Edge Cases
- **Missing `.env.local`**: `vercel dev` will start but `GEMINI_API_KEY` will be undefined → the function returns 500 `"AI service not configured"`. Acceptable — matches production behavior.
- **Port conflict**: `vercel dev` defaults to port 3000. If occupied, it auto-increments. Can override with `vercel dev --listen 5173`.
- **Vercel CLI not authenticated**: `vercel link` requires login. Run `vercel login` first.
- **Production safety**: MSW conditionally loads only in dev mode (`import.meta.env.DEV`). Tree-shaken in production builds.

## Security Notes
- `GEMINI_API_KEY` must **never** be committed to git. `.env.local` must be in `.gitignore`.
- MSW mock data does not contain any secrets.
- The `mockServiceWorker.js` file is a standard MSW service worker — safe to include in public builds if desired, or add to `.gitignore`.
