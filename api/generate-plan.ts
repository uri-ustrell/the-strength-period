import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GeminiPlanSchema } from '../src/types/planSchema'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

/**
 * Rate limiting is hybrid:
 *  - DURABLE (preferred): when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
 *    are set, a cross-instance sliding-window counter runs in Upstash/Vercel KV
 *    over the REST API (no SDK). This is the real, consistent limit.
 *  - BEST-EFFORT FALLBACK: with no KV configured (or on a transient KV error)
 *    we fall back to an in-memory per-cold-start counter. This does NOT limit
 *    consistently across serverless instances — it is a courtesy throttle only.
 *
 * The hard backstop that actually protects the shared project key is a
 * quota/budget alert on the Gemini key in Google AI Studio; configure that
 * regardless of which path is active.
 */
const KV_URL = process.env.UPSTASH_REDIS_REST_URL
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const kvConfigured = Boolean(KV_URL && KV_TOKEN)

// Best-effort, per-cold-start-instance fallback only (see note above).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimitedInMemory(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

/**
 * Durable sliding-window limiter backed by Upstash/Vercel KV REST. Uses a
 * sorted set per IP: prune entries older than the window, add this request,
 * count the window, refresh the TTL — all in one pipelined round-trip.
 * Throws on any KV/transport error so the caller can fall back.
 */
async function isRateLimitedDurable(ip: string): Promise<boolean> {
  const now = Date.now()
  const key = `rl:gen-plan:${ip}`
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const member = `${now}:${Math.random().toString(36).slice(2)}`

  const commands = [
    ['ZREMRANGEBYSCORE', key, '0', String(windowStart)],
    ['ZADD', key, String(now), member],
    ['ZCARD', key],
    ['PEXPIRE', key, String(RATE_LIMIT_WINDOW_MS)],
  ]

  const resp = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })

  if (!resp.ok) throw new Error(`KV pipeline HTTP ${resp.status}`)

  const results = (await resp.json()) as Array<{ result?: unknown; error?: string }>
  const zcard = results?.[2]
  if (!zcard || zcard.error) throw new Error(zcard?.error || 'KV ZCARD missing')

  const count = Number(zcard.result ?? 0)
  return count > RATE_LIMIT_MAX
}

async function isRateLimited(ip: string): Promise<boolean> {
  if (kvConfigured) {
    try {
      return await isRateLimitedDurable(ip)
    } catch (err) {
      console.warn('Durable rate limit unavailable, falling back to in-memory:', err)
      return isRateLimitedInMemory(ip)
    }
  }
  return isRateLimitedInMemory(ip)
}

const SYSTEM_PROMPT = `Ets un entrenador personal expert en periodització i rehabilitació esportiva.
La teva tasca és generar plans d'entrenament estructurats en format JSON estricte.

REGLES DE PERIODITZACIÓ:
- Progressió lineal per a principiants (augment setmanal 5-10% de volum)
- Progressió ondulant per a intermedis (variació alta/baixa dia a dia)
- L'usuari indica un nivell de progressió de 0 (manteniment) a 10 (agressiu)
- Adapta l'augment setmanal de volum/intensitat segons aquest nivell:
  - 0 = sense augment (manteniment pur)
  - 5 = augment moderat (5% setmanal)
  - 10 = augment agressiu (10% setmanal)
- Setmanes de descàrrega als múltiples de 4 (setmanes 4, 8, 12...) al 60% de la càrrega aconseguida
- Mai augmentar pes i volum a la vegada en la mateixa sessió

REGLES DE DISTRIBUCIÓ MUSCULAR:
- Grups sinèrgics poden entrenar-se junts (glutis + isquiotibials)
- Grups antagònics equilibrar dins la setmana (quàdriceps / isquiotibials)
- Core: present com a component en el 80% de les sessions
- Recuperació mínima 48h per grup muscular principal

REGLES DE REHAB (activa si el perfil és 'rehab'):
- Prioritzar exercicis de nivell 'beginner' les primeres 2 setmanes obligatòriament
- Evitar exercicis amb restriccions que coincideixin amb les actives de l'usuari
- En cas de dubte amb exercicis limítrofs, excloure'ls — prioritzar la seguretat
- Progressió conservadora: l'augment no pot superar el nivell de progressió indicat ni un 5% absolut per setmana (basat en principis de càrrega progressiva)
- Prioritzar mobilitat i estabilitat abans de força en contextos de rehabilitació
- Sempre incloure mobilitat i estabilitat en cada sessió
- Sense excedir mai el límit de seguretat per perfils de rehabilitació
- Aquest pla NO substitueix la rehabilitació professional — si les restriccions superen l'àmbit de l'entrenament general de força, incloure una nota recomanant consultar un fisioterapeuta o metge esportiu

FORMAT DE RESPOSTA — JSON estricte, sense text addicional:
{
  "mesocycle": {
    "name": "string",
    "durationWeeks": number,
    "weeks": [
      {
        "weekNumber": number,
        "focus": "string",
        "loadPercentage": number,
        "sessions": [
          {
            "dayOfWeek": number,
            "durationMinutes": number,
            "muscleGroupTargets": [
              {
                "muscleGroup": "string (from MuscleGroup type)",
                "percentageOfSession": number,
                "sets": number,
                "reps": [number, number],
                "rpe": number,
                "restSeconds": number
              }
            ]
          }
        ]
      }
    ]
  }
}

RIGOR CIENTÍFIC I LIMITACIÓ D'ABAST:
- Aquesta eina proporciona programació general d'entrenament de força per a corredors. NO és un dispositiu mèdic, eina terapèutica ni substitut del consell mèdic professional.
- Totes les recomanacions han d'estar basades en principis establerts de ciència de l'exercici (sobrecàrrega progressiva, especificitat, recuperació, periodització). Cap afirmació sense fonament.
- MAI utilitzar termes absoluts: "cura", "arregla", "elimina el dolor", "garanteix". USAR llenguatge condicional: "pot ajudar a millorar", "l'evidència suggereix", "pot contribuir a", "està associat amb".
- MAI prometre resultats terapèutics ni diagnosticar lesions o condicions. L'eina adapta l'entrenament segons les restriccions declarades per l'usuari.
- Quan una restricció o lesió superi l'àmbit de l'entrenament general de força, el pla ha de recomanar consultar un professional sanitari.

IMPORTANT:
- Retorna NOMÉS el JSON, sense explicacions ni markdown.
- Tots els muscleGroup han de ser valors del tipus MuscleGroup definit.
- Cada sessió ha de sumar ~100% en percentageOfSession.
- reps sempre com a rang [min, max].
- rpe entre 5 i 10.
- restSeconds entre 30 i 180.`

interface GeneratePlanRequest {
  profile: string
  equipment: string[]
  preset: string
  weeks: number
  daysPerWeek: number
  minutesPerSession: number
  restrictions: string[]
  muscleDistribution?: Record<string, number>
  progressionType?: string
  weeklyProgression?: number
  exerciseCatalog: Array<{
    id: string
    nameKey: string
    primaryMuscles: string[]
    secondaryMuscles: string[]
    equipment: string[]
    tags: string[]
    level: string
    category: string
  }>
}

function validateRequest(body: unknown): body is GeneratePlanRequest {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.profile === 'string' &&
    Array.isArray(b.equipment) &&
    typeof b.preset === 'string' &&
    typeof b.weeks === 'number' &&
    typeof b.daysPerWeek === 'number' &&
    typeof b.minutesPerSession === 'number' &&
    Array.isArray(b.restrictions) &&
    Array.isArray(b.exerciseCatalog)
  )
}

function buildUserMessage(req: GeneratePlanRequest): string {
  const muscleDistStr = req.muscleDistribution
    ? Object.entries(req.muscleDistribution)
        .map(([group, pct]) => `  ${group}: ${pct}%`)
        .join('\n')
    : 'Distribució equilibrada'

  const progressionLevel = req.weeklyProgression ?? 5

  return `Genera un mesocicle amb els següents paràmetres:

OBJECTIU: ${req.preset}
PERFIL: ${req.profile}
DURADA: ${req.weeks} setmanes
DIES PER SETMANA: ${req.daysPerWeek}
MINUTS PER SESSIÓ: ${req.minutesPerSession}
EQUIPAMENT DISPONIBLE: ${req.equipment.join(', ')}
RESTRICCIONS ACTIVES: ${req.restrictions.join(', ') || 'Cap'}

DISTRIBUCIÓ MUSCULAR OBJECTIU:
${muscleDistStr}

TIPUS DE PROGRESSIÓ: ${req.progressionType || 'linear'}
NIVELL DE PROGRESSIÓ SETMANAL: ${progressionLevel}/10 (0=manteniment, 10=agressiu)
SETMANES DE DESCÀRREGA: cada 4 setmanes (4, 8, 12...) al 60% de la càrrega aconseguida

CATÀLEG D'EXERCICIS DISPONIBLES:
${JSON.stringify(req.exerciseCatalog)}`
}

function extractJson(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text)
  } catch {
    // Try extracting from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim())
    }
    // Try finding first { to last }
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      return JSON.parse(text.substring(start, end + 1))
    }
    throw new Error('No valid JSON found in response')
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not configured')
    return res.status(500).json({ error: 'AI service not configured' })
  }

  // Rate limiting by IP
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (await isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' })
  }

  // Validate request body
  if (!validateRequest(req.body)) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  const userMessage = buildUserMessage(req.body)

  try {
    const geminiResponse = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', geminiResponse.status, errorText)
      return res.status(502).json({ error: 'AI service error' })
    }

    const geminiData = await geminiResponse.json()
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      console.error('No text in Gemini response:', JSON.stringify(geminiData))
      return res.status(502).json({ error: 'Empty response from AI service' })
    }

    const parsed = extractJson(rawText)
    const validation = GeminiPlanSchema.safeParse(parsed)

    if (!validation.success) {
      console.error(
        'Invalid plan structure:',
        JSON.stringify(validation.error.issues).substring(0, 500)
      )
      return res.status(502).json({ error: 'Invalid plan structure from AI service' })
    }

    return res.status(200).json(validation.data)
  } catch (err) {
    console.error('Generate plan error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
