import { api } from './client'

export async function registerAgency(payload: {
  name: string
  state?: string | null
  rep_count_range?: string | null
  website?: string | null
  referral_code: string
}): Promise<{ id: string }> {
  return api.post('/agencies', payload)
}

export async function createInvites(invites: {
  email: string
  full_name: string
  phone?: string | null
  rep_tier?: string
  welcome_note?: string | null
}[]): Promise<void> {
  await api.post('/invites', { invites })
}

export interface AgencyData {
  id: string
  name: string
  join_code: string | null
  state: string | null
  rep_count_range: string | null
  website: string | null
  created_by: string | null
  created_at: string
}

export async function getMyAgency(): Promise<AgencyData> {
  return api.get('/agencies/me')
}

export async function getAgencyByCode(code: string): Promise<{ id: string; name: string }> {
  return api.get(`/agencies/by-code/${code.toUpperCase()}`)
}

export async function joinByCode(
  code: string,
  payload: { name: string; email: string; password: string },
): Promise<{ access_token: string; refresh_token?: string; user: { id: string; email: string; name: string; initials: string; role: string } }> {
  return api.post(`/agencies/by-code/${code.toUpperCase()}/join`, payload)
}

export interface InviteData {
  id: string
  agency_id: string
  agency_name: string
  email: string
  full_name: string
  phone: string | null
  rep_tier: string
  welcome_note: string | null
  status: string
  expires_at: string | null
  created_at: string
}

export async function getInvite(inviteId: string): Promise<InviteData> {
  return api.get(`/invites/${inviteId}`)
}

export async function acceptInvite(
  inviteId: string,
  payload: { password: string; name?: string },
): Promise<{ access_token: string; refresh_token?: string; user: { id: string; email: string; name: string; initials: string; role: string } }> {
  return api.post(`/invites/${inviteId}/accept`, payload)
}

export interface AgencyMembers {
  /** May assign contracts and set referral sources (D16, D19) */
  can_manage: boolean
  members: { id: string; name: string; role: string }[]
}

export async function getAgencyMembers(): Promise<AgencyMembers> {
  return api.get('/agencies/me/members')
}
