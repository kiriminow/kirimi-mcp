const BASE_URL = process.env.KIRIMI_API_BASE_URL ?? 'https://api.kirimi.id'

export async function apiCall(
  path: string,
  body: Record<string, unknown>,
  apiKey: string,
  deviceId?: string,
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
  if (deviceId) headers['X-Device-ID'] = deviceId

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(deviceId ? { ...body, device_id: deviceId } : body),
  })

  const data = await res.json()
  return data
}

export function requireEnv(): { apiKey: string; deviceId: string } {
  const apiKey = process.env.KIRIMI_API_KEY
  const deviceId = process.env.KIRIMI_DEVICE_ID
  if (!apiKey) throw new Error('KIRIMI_API_KEY env var not set')
  if (!deviceId) throw new Error('KIRIMI_DEVICE_ID env var not set')
  return { apiKey, deviceId }
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
