/**
 * Duplicate-key detector for JSON source text.
 *
 * `JSON.parse` silently keeps only the last occurrence of a duplicated key, so
 * it can never report duplicates. Brace-counting on the raw text is also unsafe
 * because string values may contain literal braces (e.g. i18n `{{interpolation}}`).
 *
 * This is a small string-aware single-pass scanner: it tokenizes the raw JSON,
 * correctly skipping string literals, and tracks a stack of object/array scopes
 * so it can flag any key that appears more than once within the same object.
 *
 * Pure function (no filesystem access) — see `findDuplicateKeys.test.ts`.
 */

interface Frame {
  type: 'object' | 'array'
  keys: Set<string>
  path: string
  /** In an object, true while we are positioned to read the next property key. */
  expectKey: boolean
  /** The most recently read key token in this object scope (set when `:` seen). */
  pendingKey: string | null
}

/**
 * Returns the dotted paths of every key that is declared more than once inside
 * the same object. An empty array means no duplicates.
 */
export function findDuplicateKeys(raw: string): string[] {
  const duplicates: string[] = []
  const stack: Frame[] = []

  let i = 0
  const len = raw.length

  /** Read a JSON string literal starting at the opening quote; returns decoded value. */
  const readString = (start: number): { value: string; next: number } => {
    let value = ''
    let j = start + 1 // skip opening quote
    while (j < len) {
      const ch = raw[j]
      if (ch === '\\') {
        // Keep the escaped char verbatim; we only need the key's identity, and
        // escapes never terminate the string, so copying the next char is enough.
        value += raw[j + 1] ?? ''
        j += 2
        continue
      }
      if (ch === '"') {
        return { value, next: j + 1 }
      }
      value += ch
      j++
    }
    return { value, next: j }
  }

  while (i < len) {
    const ch = raw[i]

    // Whitespace.
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
      i++
      continue
    }

    const top = stack[stack.length - 1]

    if (ch === '{') {
      stack.push({
        type: 'object',
        keys: new Set(),
        path: framePath(stack),
        expectKey: true,
        pendingKey: null,
      })
      i++
      continue
    }
    if (ch === '[') {
      stack.push({
        type: 'array',
        keys: new Set(),
        path: framePath(stack),
        expectKey: false,
        pendingKey: null,
      })
      i++
      continue
    }
    if (ch === '}' || ch === ']') {
      stack.pop()
      i++
      continue
    }
    if (ch === ',') {
      if (top?.type === 'object') top.expectKey = true
      i++
      continue
    }
    if (ch === ':') {
      // The string just read in this object was a key; arm value position.
      if (top?.type === 'object') top.expectKey = false
      i++
      continue
    }

    if (ch === '"') {
      const { value, next } = readString(i)
      i = next
      // A string in object key-position is a property key.
      if (top?.type === 'object' && top.expectKey) {
        const path = top.path ? `${top.path}.${value}` : value
        if (top.keys.has(value)) {
          duplicates.push(path)
        } else {
          top.keys.add(value)
        }
        top.pendingKey = value
      }
      continue
    }

    // Any other token (number / true / false / null) — advance one char; the
    // structural characters above are what we actually key off.
    i++
  }

  return duplicates
}

/** Build the path for a child frame about to be pushed, based on the parent. */
function framePath(stack: Frame[]): string {
  const parent = stack[stack.length - 1]
  if (!parent) return ''
  if (parent.type === 'object') {
    // Child sits under the key the parent most recently read.
    return parent.pendingKey ? joinPath(parent.path, parent.pendingKey) : parent.path
  }
  return parent.path // arrays do not extend the dotted key path
}

function joinPath(base: string, key: string): string {
  return base ? `${base}.${key}` : key
}
