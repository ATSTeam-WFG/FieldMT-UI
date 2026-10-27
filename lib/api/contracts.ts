import { api } from './client'

interface ContactRef {
  id: string
  name: string
  company: string | null
}

/** The rep whose activity with the order's anchor contact preceded it (D16). */
export interface Recommendation {
  rep_id: string
  rep_name: string
  activity_count: number
  anchor_name: string
  last_date: string
  last_type: string
}

export interface Contract {
  id: string
  agency_id: string
  created_by: string | null
  imported_by: string | null
  assigned_rep_id: string | null
  assigned_by: string | null
  assigned_at: string | null
  assigned_rep_name: string | null
  recommended_rep_id: string | null
  /** Only for a user who can assign, and only when it differs from the assignment */
  recommendation: Recommendation | null
  contact_id: string | null
  secondary_contact_id: string | null
  referring_contact_id: string | null
  lender_contact_id: string | null
  title: string | null
  transaction_type: string
  status: string
  amount: number | null
  loan_amount: number | null
  property_address: string | null
  city: string | null
  file_number: string | null
  opening_date: string | null
  expected_closing_date: string | null
  actual_closing_date: string | null
  closing_platform: string | null
  /** Pending and more than 14 days past the expected close (D18) */
  closed_unconfirmed: boolean
  external_order_id: string | null
  /** 'qualia' | 'manager' — where the referral source came from (D19) */
  referrer_source: string | null
  referrer_set_by: string | null
  referrer_set_at: string | null
  notes: string | null
  created_at: string
  contact: ContactRef | null
  secondary_contact: ContactRef | null
  lender_contact: ContactRef | null
  referring_contact: ContactRef | null
}

interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export async function getContracts(params?: {
  status?: string
  contact_id?: string
  /** 'unassigned' | 'mine' | a rep id */
  assigned?: string
  /** 'none' = no referral source */
  referrer?: 'none'
  status_group?: 'open' | 'closed' | 'cancelled'
  transaction_type?: string
  /** Address, city, file or order number, or either agent's name */
  search?: string
  page?: number
  page_size?: number
}): Promise<{ items: Contract[]; total: number; total_value: number; closing_this_month: number }> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.contact_id) qs.set('contact_id', params.contact_id)
  if (params?.assigned) qs.set('assigned', params.assigned)
  if (params?.referrer) qs.set('referrer', params.referrer)
  if (params?.status_group) qs.set('status_group', params.status_group)
  if (params?.transaction_type) qs.set('transaction_type', params.transaction_type)
  if (params?.search) qs.set('search', params.search)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.page_size) qs.set('page_size', String(params.page_size))

  const path = `/contracts/${qs.toString() ? '?' + qs.toString() : ''}`
  // total_value and closing_this_month cover every contract the filters match, not just this page
  const data = await api.get<Page<Contract> & { total_value: number; closing_this_month: number }>(path)
  return { items: data.items, total: data.total, total_value: data.total_value, closing_this_month: data.closing_this_month }
}

export async function createContract(payload: {
  contact_id?: string | null
  secondary_contact_id?: string | null
  referring_contact_id?: string | null
  lender_contact_id?: string | null
  title?: string | null
  transaction_type?: string
  status?: string
  amount?: number | null
  loan_amount?: number | null
  property_address?: string | null
  city?: string | null
  file_number?: string | null
  opening_date?: string | null
  expected_closing_date?: string | null
  actual_closing_date?: string | null
  notes?: string | null
}): Promise<Contract> {
  return api.post<Contract>('/contracts/', payload)
}

export async function getContract(id: string): Promise<Contract> {
  return api.get<Contract>(`/contracts/${id}`)
}

export async function updateContract(id: string, payload: Partial<{
  contact_id: string | null
  secondary_contact_id: string | null
  referring_contact_id: string | null
  lender_contact_id: string | null
  title: string | null
  transaction_type: string
  status: string
  amount: number | null
  loan_amount: number | null
  property_address: string | null
  city: string | null
  file_number: string | null
  opening_date: string | null
  expected_closing_date: string | null
  actual_closing_date: string | null
  notes: string | null
}>): Promise<Contract> {
  return api.put<Contract>(`/contracts/${id}`, payload)
}

export async function deleteContract(id: string): Promise<void> {
  return api.delete<void>(`/contracts/${id}`)
}

/** Who would be recommended with these parties — for an unsaved edit. Omit a field to keep the
 *  stored party; '' clears it. Writes nothing. */
export async function previewRecommendation(id: string, parties: {
  contact_id?: string; secondary_contact_id?: string; referring_contact_id?: string
}): Promise<Recommendation | null> {
  const q = new URLSearchParams(Object.entries(parties).filter(([, v]) => v !== undefined) as [string, string][])
  return api.get<Recommendation | null>(`/contracts/${id}/recommendation${q.size ? `?${q}` : ''}`)
}

export async function setAssignment(id: string, repId: string | null): Promise<Contract> {
  return api.put<Contract>(`/contracts/${id}/assignment`, { rep_id: repId })
}

export async function acceptRecommendations(contractIds: string[]): Promise<{ assigned: number }> {
  return api.post<{ assigned: number }>('/contracts/assignments/accept', { contract_ids: contractIds })
}

export async function setReferrer(id: string, contactId: string | null): Promise<Contract> {
  return api.put<Contract>(`/contracts/${id}/referrer`, { contact_id: contactId })
}
