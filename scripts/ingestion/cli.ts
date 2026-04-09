export type ParsedArgs = {
  flags: Set<string>
  values: Record<string, string[]>
  positionals: string[]
}

export function parseArgs(argv: string[]): ParsedArgs {
  const flags = new Set<string>()
  const values: Record<string, string[]> = {}
  const positionals: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (!token) {
      continue
    }

    if (!token.startsWith('--')) {
      positionals.push(token)
      continue
    }

    const withoutPrefix = token.slice(2)
    const [key, inlineValue] = withoutPrefix.split('=', 2)

    if (!key) {
      continue
    }

    if (inlineValue !== undefined) {
      values[key] = [...(values[key] ?? []), inlineValue]
      continue
    }

    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      flags.add(key)
      continue
    }

    values[key] = [...(values[key] ?? []), next]
    index += 1
  }

  return {
    flags,
    values,
    positionals,
  }
}

export function hasFlag(args: ParsedArgs, key: string): boolean {
  return args.flags.has(key)
}

export function getArg(args: ParsedArgs, key: string): string | undefined {
  const values = args.values[key]
  if (!values || values.length === 0) {
    return undefined
  }
  return values[values.length - 1]
}

export function getArgList(args: ParsedArgs, key: string): string[] {
  return args.values[key] ?? []
}

export function getNumberArg(
  args: ParsedArgs,
  key: string,
  fallback: number,
  options?: { min?: number; max?: number }
): number {
  const raw = getArg(args, key)
  if (raw === undefined) {
    return fallback
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  const min = options?.min ?? Number.NEGATIVE_INFINITY
  const max = options?.max ?? Number.POSITIVE_INFINITY

  if (parsed < min || parsed > max) {
    return fallback
  }

  return parsed
}

export function assertRequiredArg(args: ParsedArgs, key: string, message: string): string {
  const value = getArg(args, key)
  if (!value) {
    throw new Error(message)
  }
  return value
}
