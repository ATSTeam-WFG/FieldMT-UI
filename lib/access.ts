/**
 * The bridge between "the identity provider says who you are" and "you are in the product".
 *
 * A landing page (E1, J1, J2) saves what the person is acting on — an invitation token or a
 * code — before handing off to the identity provider. Whatever page the provider returns to
 * calls `continueAfterIdentity()`, which claims the saved intent (if any) and works out where
 * the person belongs. Nothing here knows which provider ran, so a redirect-based provider
 * (B2C) and our own password forms (Supabase) take the same path.
 */
import { ACCESS_INTENT_KEY } from '@/lib/storage-keys'
import { ApiError } from '@/lib/api/client'
import { claimAccess, getSession, type SessionState } from '@/lib/api/access'

export type AccessIntent = { token: string } | { code: string }

/** `from` is the landing page to return to if the claim fails. */
export function saveIntent(intent: AccessIntent, from: string): void {
  try {
    localStorage.setItem(ACCESS_INTENT_KEY, JSON.stringify({ ...intent, from }))
  } catch {}
}

function readFrom(): string | null {
  try {
    const from = JSON.parse(localStorage.getItem(ACCESS_INTENT_KEY) ?? 'null')?.from
    return typeof from === 'string' && from.startsWith('/') ? from : null
  } catch {
    return null
  }
}

export function readIntent(): AccessIntent | null {
  try {
    const raw = localStorage.getItem(ACCESS_INTENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.token === 'string') return { token: parsed.token }
    if (typeof parsed?.code === 'string') return { code: parsed.code }
  } catch {}
  return null
}

export function clearIntent(): void {
  try {
    localStorage.removeItem(ACCESS_INTENT_KEY)
  } catch {}
}

/** Where a session state sends the person. */
export function destinationFor(session: SessionState): string {
  switch (session.state) {
    case 'no_account':
      return '/no-access'
    case 'inactive':
    case 'agency_revoked':
      return `/no-access?reason=${session.state}`
    case 'setup_required':
      return '/welcome'
    default:
      return session.home || '/dashboard'
  }
}

/**
 * Claim the saved intent (if any), then return the path the person should land on.
 *
 * A failed claim — expired, used, revoked, wrong code — sends them back to the landing page
 * they came from, which shows the reason. The intent is cleared either way so a dead link
 * can't trap someone in a loop.
 */
export async function continueAfterIdentity(): Promise<string> {
  const intent = readIntent()
  if (intent) {
    const from = readFrom() ?? ('token' in intent ? `/accept/${encodeURIComponent(intent.token)}` : '/join')
    clearIntent()
    try {
      return destinationFor(await claimAccess(intent))
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        const sep = from.includes('?') ? '&' : '?'
        return `${from}${sep}claim=${encodeURIComponent(err.code ?? 'failed')}`
      }
      throw err
    }
  }
  return destinationFor(await getSession())
}
