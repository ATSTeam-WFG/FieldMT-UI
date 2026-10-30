import { api, setToken, clearToken } from './client'

export interface AuthUser {
  id: string
  email: string
  name: string
  initials: string
  role: string
  status: string
  agency_id: string | null
  territory: string | null
  title: string | null
  monthly_budget: number | null
  team_id: string | null
  also_rep: boolean
  has_rep_profile: boolean
  has_manager_profile: boolean
  /** A manager in a multi-user agency who also works a book holds both views. */
  can_switch: boolean
  agency: AuthAgency | null
}

export interface AuthAgency {
  id: string
  name: string
  type: 'single' | 'multi'
  status: 'pending' | 'active' | 'revoked'
  setup_step: number | null
  market: string | null
}

export interface LoginResponse {
  access_token: string
  token_type: string
  refresh_token?: string
  /** Null when the identity has no FieldMT account yet — claim an invitation next. */
  user: {
    id: string
    email: string
    name: string
    initials: string
    role: string
  } | null
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', { email, password })
  setToken(res.access_token, res.refresh_token)
  return res
}

/** Identity only — the account comes from the invitation or code claimed next. */
export async function signup(payload: { email: string; password: string; name: string }): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/signup', payload)
  setToken(res.access_token, res.refresh_token)
  return res
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', {})
  } catch {}
  clearToken()
}

export async function getMe(): Promise<AuthUser> {
  return api.get<AuthUser>('/auth/me')
}
