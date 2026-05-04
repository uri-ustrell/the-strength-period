# Lessons Learned

> Updated after every user correction. Review at session start.

## Patterns to Follow
<!-- Add rules that emerged from corrections -->
- Keep development artifacts in English by default (TODOs, specs, status notes, implementation checklists, and agent-generated repository docs).
- If a user writes in Catalan/Spanish but does not explicitly ask to localize repository artifacts, keep `tasks/`, specs, and internal docs in English.
- Use localized language only for explicit end-user copy or when the user directly requests a non-English artifact.
- For Node/tsx CLI scripts that depend on API keys, load `.env` explicitly (e.g., `import 'dotenv/config'`) instead of assuming frontend env loading.
- For ingestion flows that split payloads (catalog + i18n), keep i18n writes independent from catalog insert acceptance so duplicate IDs can still refresh translations.
- For exercise i18n merges keyed by canonical id, keep all candidate updates in deterministic order and resolve locale values from the first non-empty candidate instead of collapsing to one update.
- For `llm-json` ingestion sources, load payload JSON once per source and reuse it for both candidate building and i18n parsing.
- For filesystem-heavy ingestion modules, add optional file-I/O dependency injection so deterministic unit tests can validate merge outputs without mutating real locale files.
- Date strings `'YYYY-MM-DD'` must be parsed as local components (`new Date(y, m-1, d)`); `new Date(str)` is parsed as UTC and silently drifts the displayed day in non-UTC timezones (esp. `toISOString().slice(0,10)` for the inverse). Always pair both directions.
- Multi-write IDB operations (e.g. swap an `active` flag and put a new entity) must run inside a single `db.transaction(['store'], 'readwrite')` so a partial failure can't leave orphan/duplicate state.
- Zustand `useShallow` only helps when tick-frequency fields (countdown timers, etc.) are excluded from the shallow slice; otherwise every tick still re-renders the whole consumer subtree. For sub-second update rates, have the leaf component subscribe to that store slice directly.
- When validating data loaded from IndexedDB or imported files, validate every field actually consumed downstream — not just the first few. A corrupted `trainingDays: "mon,wed"` (string) passes a naive truthy check while coercing `length=9` and silently corrupting derived day-of-week math.
- Long-running async operations triggered by user actions (e.g. `finishSession`) should generate IDs and timestamps **once** and cache them in store state across retries; regenerating per attempt yields duplicate IDB rows on flaky writes.

## Mistakes to Avoid
<!-- Add anti-patterns with the context of what went wrong -->
- Do not add or update repository development documentation in Catalan/Spanish when the existing project development language is English.
- Do not infer repository documentation language from the language of the user message alone.
