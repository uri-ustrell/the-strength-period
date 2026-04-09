import { constants } from 'node:fs'
import { access, copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'

import type { MergeWriteResult } from './contracts'

export function ensureTrailingNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true })
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function readJsonFile<T>(path: string): Promise<T> {
  const content = await readFile(path, 'utf-8')
  return JSON.parse(content) as T
}

export async function readJsonFileOrDefault<T>(path: string, fallback: T): Promise<T> {
  if (!(await fileExists(path))) {
    return fallback
  }
  return readJsonFile<T>(path)
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await ensureDir(dirname(path))
  await writeFile(path, ensureTrailingNewline(JSON.stringify(value, null, 2)), 'utf-8')
}

export async function writeJsonRollbackSafe(options: {
  targetPath: string
  value: unknown
  backupDir: string
  dryRun: boolean
  backupPrefix?: string
}): Promise<MergeWriteResult> {
  const { targetPath, value, backupDir, dryRun, backupPrefix } = options

  if (dryRun) {
    return {
      targetPath,
      written: false,
    }
  }

  await ensureDir(dirname(targetPath))
  await ensureDir(backupDir)

  const timestamp = toFileTimestamp(new Date())
  const base = basename(targetPath)
  const backupName = backupPrefix ? `${backupPrefix}-${base}` : base
  const backupPath = resolve(backupDir, `${timestamp}-${backupName}.bak`)

  const targetExists = await fileExists(targetPath)
  if (targetExists) {
    await copyFile(targetPath, backupPath)
  }

  const tempPath = `${targetPath}.tmp-${Date.now()}`

  try {
    await writeFile(tempPath, ensureTrailingNewline(JSON.stringify(value, null, 2)), 'utf-8')
    await rename(tempPath, targetPath)
  } catch (error) {
    if (await fileExists(tempPath)) {
      await rm(tempPath)
    }

    if (targetExists) {
      await copyFile(backupPath, targetPath)
    }

    throw error
  }

  return {
    targetPath,
    backupPath: targetExists ? backupPath : undefined,
    written: true,
  }
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, '-')
}

export function tokenize(value: string): string[] {
  if (!value.trim()) {
    return []
  }
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
}

export function jaccardSimilarity(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0
  }

  const leftSet = new Set(left)
  const rightSet = new Set(right)

  let intersection = 0
  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1
    }
  }

  const union = leftSet.size + rightSet.size - intersection
  if (union === 0) {
    return 0
  }

  return intersection / union
}

export function overlapRatio<T extends string>(left: T[], right: T[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0
  }

  const leftSet = new Set(left)
  const rightSet = new Set(right)

  let overlap = 0
  for (const value of leftSet) {
    if (rightSet.has(value)) {
      overlap += 1
    }
  }

  return overlap / Math.max(leftSet.size, rightSet.size)
}

export function uniqueArray<T>(values: T[]): T[] {
  return [...new Set(values)]
}

export function clampNumber(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

export function ensurePositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  const rounded = Math.round(value)
  if (rounded <= 0) {
    return fallback
  }

  return rounded
}

export function toRunId(prefix: string): string {
  const timestamp = toFileTimestamp(new Date())
  const random = Math.random().toString(16).slice(2, 8)
  return `${prefix}-${timestamp}-${random}`
}

export function toIsoTimestamp(date: Date = new Date()): string {
  return date.toISOString()
}

export function toFileTimestamp(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

export function stripJsonCodeFences(raw: string): string {
  const trimmed = raw.trim()

  if (trimmed.startsWith('```json') && trimmed.endsWith('```')) {
    return trimmed.slice(7, -3).trim()
  }

  if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
    return trimmed.slice(3, -3).trim()
  }

  return trimmed
}

export function parseJsonWithMessage<T>(raw: string, context: string): T {
  try {
    return JSON.parse(stripJsonCodeFences(raw)) as T
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${context}: invalid JSON (${message})`)
  }
}

export function isHttpUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}

export async function loadJsonInput<T>(input: string, cwd: string): Promise<T> {
  if (isHttpUrl(input)) {
    const response = await fetch(input)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${input}: ${response.status} ${response.statusText}`)
    }
    return (await response.json()) as T
  }

  const resolvedPath = input.startsWith('/') ? input : resolve(cwd, input)
  return readJsonFile<T>(resolvedPath)
}

export async function readTextInput(input: string, cwd: string): Promise<string> {
  const resolvedPath = input.startsWith('/') ? input : resolve(cwd, input)
  return readFile(resolvedPath, 'utf-8')
}

export function parseBooleanFlag(rawValue: string | undefined, defaultValue: boolean): boolean {
  if (rawValue === undefined) {
    return defaultValue
  }

  const normalized = rawValue.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false
  }

  return defaultValue
}
