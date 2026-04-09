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

## Mistakes to Avoid
<!-- Add anti-patterns with the context of what went wrong -->
- Do not add or update repository development documentation in Catalan/Spanish when the existing project development language is English.
- Do not infer repository documentation language from the language of the user message alone.
