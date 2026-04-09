# Lessons Learned

> Updated after every user correction. Review at session start.

## Patterns to Follow
<!-- Add rules that emerged from corrections -->
- Keep development artifacts in English by default (TODOs, specs, status notes, implementation checklists, and agent-generated repository docs).
- If a user writes in Catalan/Spanish but does not explicitly ask to localize repository artifacts, keep `tasks/`, specs, and internal docs in English.
- Use localized language only for explicit end-user copy or when the user directly requests a non-English artifact.
- For Node/tsx CLI scripts that depend on API keys, load `.env` explicitly (e.g., `import 'dotenv/config'`) instead of assuming frontend env loading.

## Mistakes to Avoid
<!-- Add anti-patterns with the context of what went wrong -->
- Do not add or update repository development documentation in Catalan/Spanish when the existing project development language is English.
- Do not infer repository documentation language from the language of the user message alone.
