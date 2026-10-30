import { api } from './client'

export type MemberRole = 'agent' | 'manager'

export interface AgencyData {
  id: string
  name: string
  /** Shown only for a multi-user agency. */
  join_code: string | null
  state: string | null
  market: string | null
  rep_count_range: string | null
  website: string | null
  created_by: string | null
  type: 'single' | 'multi'
  status: 'pending' | 'active' | 'revoked'
  created_at: string
}

export async function getMyAgency(): Promise<AgencyData> {
  return api.get('/agencies/me')
}

export async function updateMyAgency(payload: { name?: string; market?: string; type?: 'single' | 'multi' }): Promise<AgencyData> {
  return api.patch('/agencies/me', payload)
}

export interface InviteData {
  id: string
  email: string
  role: MemberRole
  state: 'pending' | 'expired' | 'accepted' | 'revoked'
  /** The link to share — no email is sent yet. */
  path: string
  expires_at: string | null
  created_at: string
}

export async function createInvites(invites: { email: string; role: MemberRole }[]): Promise<InviteData[]> {
  return api.post('/invites', { invites })
}

export async function listInvites(): Promise<InviteData[]> {
  return api.get('/invites')
}

export async function resendInvite(id: string): Promise<InviteData> {
  return api.post(`/invites/${id}/resend`, {})
}

export async function revokeInvite(id: string): Promise<InviteData> {
  return api.post(`/invites/${id}/revoke`, {})
}

export interface RosterMember {
  id: string
  name: string
  email: string
  initials: string
  role: string
  is_owner: boolean
  last_seen_at: string | null
}

export interface Roster {
  agency: AgencyData
  members: RosterMember[]
  pending: InviteData[]
}

export async function getRoster(): Promise<Roster> {
  return api.get('/agencies/me/roster')
}

export async function changeMemberRole(userId: string, role: MemberRole): Promise<{ id: string; role: MemberRole }> {
  return api.put(`/agencies/me/members/${userId}/role`, { role })
}

/** "I also work a book" — a multi-user agency's manager. */
export async function setRepProfile(rep: boolean): Promise<{ has_rep_profile: boolean }> {
  return api.patch('/me/profiles', { rep })
}

export interface AgencyMembers {
  /** May assign contracts and set referral sources (D16, D19) */
  can_manage: boolean
  members: { id: string; name: string; role: string }[]
}

export async function getAgencyMembers(): Promise<AgencyMembers> {
  return api.get('/agencies/me/members')
}
