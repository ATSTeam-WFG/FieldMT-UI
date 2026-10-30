import * as Sentry from '@sentry/nextjs'
import { PRESENCE_COOKIE, TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/lib/storage-keys'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  /** Machine-readable refusal from the access layer — `no_account`, `setup_required`, … */
  constructor(public status: number, message: string, public code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export { PRESENCE_COOKIE } from '@/lib/storage-keys'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

/** Cheap client-side check used to gate react-query fetches before hydration. */
export function hasToken(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string, refreshToken?: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  // max-age matches Supabase's default refresh token lifetime (60 days)
  document.cookie = `${PRESENCE_COOKIE}=1; path=/; SameSite=Lax; max-age=5184000`
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  document.cookie = `${PRESENCE_COOKIE}=; path=/; max-age=0`
  // Without this a shared machine attributes the next person's errors to
  // whoever logged in before them.
  Sentry.setUser(null)
}

// A product route refused by the access layer: signed in, but not (or not yet) in the product.
const REFUSAL_ROUTES: Record<string, string> = {
  no_account: '/no-access',
  inactive: '/no-access?reason=inactive',
  agency_revoked: '/no-access?reason=agency_revoked',
  setup_required: '/welcome',
}

// Pages that work before (or without) an account — a refusal there is expected, not a redirect.
const OUTSIDE_PRODUCT = ['/login', '/signup', '/join', '/activate/', '/accept/', '/no-access', '/welcome', '/onboarding']

function outsideProduct(pathname: string): boolean {
  return pathname === '/' || OUTSIDE_PRODUCT.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`))
}

// Deduplication — one refresh flight at a time across concurrent 401s
let _refreshPromise: Promise<string> | null = null

export async function attemptRefresh(): Promise<string> {
  if (_refreshPromise) return _refreshPromise
  _refreshPromise = (async () => {
    const rt = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!rt) throw new Error('No refresh token')
    // Use raw fetch to avoid re-entering the request() 401 handler
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    })
    if (!res.ok) throw new Error('Refresh failed')
    const data = await res.json()
    setToken(data.access_token, data.refresh_token ?? undefined)
    return data.access_token
  })().finally(() => {
    _refreshPromise = null
  })
  return _refreshPromise
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    if (!_isRetry) {
      try {
        await attemptRefresh()
        return request<T>(path, options, true)
      } catch {
        clearToken()
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login?expired=1'
        }
        throw new ApiError(401, 'Unauthorized')
      }
    }
    // Retry also 401 — refresh token itself is expired
    clearToken()
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login?expired=1'
    }
    throw new ApiError(401, 'Unauthorized')
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    let code: string | undefined
    try {
      const body = await res.json()
      if (body.detail && typeof body.detail === 'object' && !Array.isArray(body.detail)) {
        detail = body.detail.message ?? detail
        code = body.detail.code
      } else if (typeof body.detail === 'string') {
        detail = body.detail
      }
    } catch {}
    if (res.status === 403 && code && typeof window !== 'undefined' && !outsideProduct(window.location.pathname)) {
      const to = REFUSAL_ROUTES[code]
      if (to) window.location.href = to
    }
    throw new ApiError(res.status, detail, code)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
