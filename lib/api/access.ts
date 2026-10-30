import { api } from './client'

export interface AccessPreview {
  kind: 'agency' | 'member' | 'invitation' | 'join_code'
  state: 'pending' | 'expired' | 'accepted' | 'revoked' | 'not_found'
  agency: { id: string; name: string; market: string | null; type: string; member_count: number } | null
  issuer_name: string | null
  role: 'agent' | 'manager' | null
  expires_at: string | null
  /** Set when a typed code turned out to be an agency invitation's short form. */
  token?: string | null
}

export type SessionStateName = 'no_account' | 'inactive' | 'agency_revoked' | 'setup_required' | 'active'

export interface SessionAgency {
  id: string
  name: string
  type: 'single' | 'multi'
  status: string
  setup_step: number | null
  market: string | null
  join_code: string | null
  invited_by?: string | null
}

export interface SessionState {
  state: SessionStateName
  home: string
  user: { id: string; email: string; name: string; initials: string; role: string } | null
  agency: SessionAgency | null
  /** Who to ask when access is refused: the WFG rep (revoked) or the agency owner (inactive). */
  contact?: { name: string; email: string; organisation: string } | null
}

export interface ClaimResult extends SessionState {
  outcome: 'created' | 'joined' | 'already_member' | 'already_has_account'
}

export function previewInvitation(token: string): Promise<AccessPreview> {
  return api.get(`/access/invitations/${encodeURIComponent(token)}`)
}

export function previewCode(code: string): Promise<AccessPreview> {
  return api.get(`/access/codes/${encodeURIComponent(code.trim().toUpperCase())}`)
}

export function claimAccess(intent: { token: string } | { code: string }): Promise<ClaimResult> {
  return api.post('/access/claim', intent)
}

export function getSession(): Promise<SessionState> {
  return api.post('/auth/session', {})
}

export function advanceSetup(payload: {
  step: 1 | 2 | 3
  agency_name?: string
  market?: string
  name?: string
  type?: 'single' | 'multi'
  invites?: { email: string; role: 'agent' | 'manager' }[]
}): Promise<SessionState> {
  return api.patch('/access/setup', payload)
}

export function requestNewLink(token: string): Promise<{ requested: boolean }> {
  return api.post(`/access/invitations/${encodeURIComponent(token)}/request-new`, {})
}

export interface AuthConfig {
  provider: 'supabase' | 'b2c'
  b2c: { authority: string; known_authority: string; user_flow: string; api_client_id: string } | null
}

export function getAuthConfig(): Promise<AuthConfig> {
  return api.get('/auth/config')
}
