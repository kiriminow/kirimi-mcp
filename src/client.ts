const BASE_URL = (process.env.KIRIMI_API_BASE_URL ?? 'https://api.kirimi.id').replace(/\/$/, '')
const DEFAULT_TIMEOUT_MS = Number(process.env.KIRIMI_TIMEOUT_MS ?? 30_000)

/**
 * The Kirimi API authenticates with `user_code` + `secret` inside the JSON
 * body. There is no API key and no Authorization header — sending one is
 * silently ignored and every call comes back with "user_code is required".
 */
export interface Credentials {
  user_code: string
  secret: string
}

export interface KirimiResponse<T = unknown> {
  success: boolean
  data: T | null
  message?: string
}

export class KirimiApiError extends Error {
  readonly statusCode: number
  readonly responseData?: unknown

  constructor(statusCode: number, message: string, responseData?: unknown) {
    super(message)
    this.name = 'KirimiApiError'
    this.statusCode = statusCode
    this.responseData = responseData
  }
}

/** Drop undefined values so optional fields never reach the API. */
function compact(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

export function requireCredentials(): Credentials {
  const userCode = process.env.KIRIMI_USER_CODE?.trim()
  const secret = process.env.KIRIMI_SECRET?.trim()

  if (!userCode) {
    throw new Error(
      'KIRIMI_USER_CODE is not set. Copy it from the Credentials page in the Kirimi dashboard.',
    )
  }
  if (!secret) {
    throw new Error(
      'KIRIMI_SECRET is not set. Copy it from the Credentials page in the Kirimi dashboard.',
    )
  }
  return { user_code: userCode, secret }
}

export function defaultDeviceId(): string | undefined {
  const id = process.env.KIRIMI_DEVICE_ID?.trim()
  return id ? id : undefined
}

/** Device-scoped tools fall back to KIRIMI_DEVICE_ID when none is passed. */
export function resolveDeviceId(explicit?: unknown): string {
  const id = typeof explicit === 'string' && explicit.trim() ? explicit.trim() : defaultDeviceId()
  if (!id) {
    throw new Error(
      'device_id is required. Pass it as an argument or set the KIRIMI_DEVICE_ID environment variable.',
    )
  }
  return id
}

export async function apiCall(
  path: string,
  body: Record<string, unknown>,
  credentials: Credentials,
): Promise<KirimiResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(compact({ ...credentials, ...body })),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request to ${path} timed out after ${DEFAULT_TIMEOUT_MS}ms`)
    }
    throw new Error(
      `Network error calling ${path}: ${err instanceof Error ? err.message : String(err)}`,
    )
  } finally {
    clearTimeout(timer)
  }

  const raw = await res.text()
  let payload: unknown
  try {
    payload = raw ? JSON.parse(raw) : null
  } catch {
    payload = { success: res.ok, data: null, message: raw }
  }

  const envelope = (payload ?? {}) as Partial<KirimiResponse>
  const apiMessage = typeof envelope.message === 'string' ? envelope.message : undefined

  // The API reports failures both as non-2xx and as 200 with success:false.
  if (!res.ok || envelope.success === false) {
    throw new KirimiApiError(res.status, apiMessage ?? `HTTP ${res.status}`, payload)
  }

  return envelope as KirimiResponse
}

export function textResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  }
}

export function errorResult(message: string) {
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true,
  }
}
