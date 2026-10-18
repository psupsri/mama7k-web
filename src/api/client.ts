// Thin fetch wrapper for the Go API. Errors come back as {"error": {"code", "message"}}.

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type Query = Record<string, string | number | null | undefined>

function url(path: string, query?: Query) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) if (v !== null && v !== undefined && v !== '') qs.set(k, String(v))
  const s = qs.toString()
  return `/api${path}${s ? `?${s}` : ''}`
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin', headers: {} }
  if (body instanceof FormData) {
    init.body = body
  } else if (method !== 'GET' && method !== 'DELETE') {
    // The API only accepts JSON on writes (its CSRF guard), so always send a JSON body.
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body ?? {})
  }
  let res: Response
  try {
    res = await fetch(url(path, query), init)
  } catch {
    throw new ApiError(0, 'NETWORK', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = data?.error
    throw new ApiError(res.status, err?.code ?? 'HTTP_' + res.status, err?.message ?? 'เกิดข้อผิดพลาด')
  }
  return data as T
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T = void>(path: string) => request<T>('DELETE', path),
}
