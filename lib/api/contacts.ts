import { api } from './client'

/** Another rep in the agency who works this contact — the fact and date only. */
export interface ColleagueActivity {
  agent_id: string
  name: string
  last_activity_date: string | null
}

export interface Contact {
  id: string
  agency_id: string
  created_by: string | null
  imported_by: string | null
  name: string
  initials: string
  company: string | null
  job_title: string | null
  type: 'realtor' | 'lender' | 'vendor'
  email: string | null
  phone: string | null
  /** The viewer's score: a rep's own, or agency health for a manager. null = Dormant. */
  score: number | null
  /** Whose score `score` is: the caller's own, or agency health (managers). */
  score_scope: 'rep' | 'agency'
  closings: number
  tags: string[]
  last_activity_type: string | null
  last_activity_date: string | null
  spend: number
  score_breakdown: {
    score: number
    recency: string
    frequency: string
    diversity: string
    engagement: string
    computed_at: string
  } | null
  created_at: string
  /** Detail endpoint only. */
  colleagues?: ColleagueActivity[]
}

interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export async function getContacts(params?: {
  type?: string
  search?: string
  sort?: string
  /** 'mine' = only contacts the caller works (has a score of their own for). */
  scope?: 'all' | 'mine'
  page?: number
  page_size?: number
}): Promise<{ items: Contact[]; total: number }> {
  const qs = new URLSearchParams()
  if (params?.type) qs.set('type', params.type)
  if (params?.search) qs.set('search', params.search)
  if (params?.sort) qs.set('sort', params.sort)
  if (params?.scope) qs.set('scope', params.scope)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.page_size) qs.set('page_size', String(params.page_size))

  const path = `/contacts/${qs.toString() ? '?' + qs.toString() : ''}`
  const data = await api.get<Page<Contact>>(path)
  return { items: data.items, total: data.total }
}

export async function getContact(id: string): Promise<Contact> {
  return api.get<Contact>(`/contacts/${id}`)
}

export async function createContact(payload: {
  name: string
  company?: string | null
  job_title?: string | null
  type?: string
  email?: string | null
  phone?: string | null
  address?: string | null
  tags?: string[]
}): Promise<Contact> {
  return api.post<Contact>('/contacts/', payload)
}

export interface ScoreTrend {
  contact_id: string
  delta: number | null
}

export async function getScoreTrends(): Promise<ScoreTrend[]> {
  return api.get<ScoreTrend[]>('/contacts/score-trends')
}

export async function updateContact(id: string, payload: Partial<{
  name: string
  company: string | null
  job_title: string | null
  type: string
  email: string | null
  phone: string | null
  address: string | null
  tags: string[]
}>): Promise<Contact> {
  return api.put<Contact>(`/contacts/${id}`, payload)
}
