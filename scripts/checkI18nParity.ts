/**
 * i18n parity checker.
 *
 * Loads every namespace JSON for each locale under `src/i18n/locales/<lng>/`
 * and reports keys present in one locale but missing in another. Exits with
 * status 1 on any divergence so it can be wired to CI.
 *
 * Usage: `npm run i18n:check`
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const LOCALES_DIR = join(process.cwd(), 'src/i18n/locales')
const REFERENCE_LANG = 'ca'

type Json = string | number | boolean | null | { [k: string]: Json } | Json[]

function isObject(v: unknown): v is Record<string, Json> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function flattenKeys(obj: Json, prefix = ''): string[] {
  if (!isObject(obj)) return prefix ? [prefix] : []
  const out: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (isObject(value)) {
      out.push(...flattenKeys(value, next))
    } else {
      out.push(next)
    }
  }
  return out
}

function loadNamespace(lang: string, namespace: string): Json {
  const file = join(LOCALES_DIR, lang, namespace)
  const raw = readFileSync(file, 'utf-8')
  return JSON.parse(raw) as Json
}

const languages = readdirSync(LOCALES_DIR).filter((entry) => {
  try {
    return readdirSync(join(LOCALES_DIR, entry)).length > 0
  } catch {
    return false
  }
})

if (!languages.includes(REFERENCE_LANG)) {
  console.error(`[i18n:check] Reference locale '${REFERENCE_LANG}' not found.`)
  process.exit(1)
}

const namespaces = readdirSync(join(LOCALES_DIR, REFERENCE_LANG)).filter((f) => f.endsWith('.json'))

let problems = 0

for (const ns of namespaces) {
  const referenceKeys = new Set(flattenKeys(loadNamespace(REFERENCE_LANG, ns)))

  for (const lang of languages) {
    if (lang === REFERENCE_LANG) continue
    let langKeys: Set<string>
    try {
      langKeys = new Set(flattenKeys(loadNamespace(lang, ns)))
    } catch (err) {
      console.error(`[i18n:check] ${lang}/${ns} failed to load:`, (err as Error).message)
      problems++
      continue
    }

    const missingInLang = [...referenceKeys].filter((k) => !langKeys.has(k))
    const extraInLang = [...langKeys].filter((k) => !referenceKeys.has(k))

    if (missingInLang.length > 0) {
      problems++
      console.error(`\n[i18n:check] ${lang}/${ns} is missing ${missingInLang.length} key(s):`)
      for (const k of missingInLang) console.error(`  - ${k}`)
    }
    if (extraInLang.length > 0) {
      problems++
      console.error(`\n[i18n:check] ${lang}/${ns} has ${extraInLang.length} extra key(s):`)
      for (const k of extraInLang) console.error(`  + ${k}`)
    }
  }
}

if (problems === 0) {
  console.log(`[i18n:check] OK — ${languages.length} locales, ${namespaces.length} namespaces in parity.`)
  process.exit(0)
}

console.error(`\n[i18n:check] Found ${problems} divergence(s).`)
process.exit(1)
