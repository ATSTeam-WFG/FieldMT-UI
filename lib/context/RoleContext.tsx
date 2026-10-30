'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getMe } from '@/lib/api/auth'
import * as Sentry from '@sentry/nextjs'
import { attemptRefresh, getToken } from '@/lib/api/client'

function getTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch { return null }
}

export type Role = 'rep' | 'manager' | 'executive'
export type UserType = 'rep' | 'manager'
export type AgencyType = 'single' | 'multi'

export interface Persona {
  name: string
  initials: string
  title: string
  territory?: string
}

const emptyPersona: Persona = { name: '', initials: '', title: '' }

interface RoleContextValue {
  role: Role
  persona: Persona
  setRole: (role: Role) => void
  userType: UserType
  canSwitch: boolean
  /** Navigation follows the agency: a single-user agency shows rep navigation only. */
  agencyType: AgencyType
  agencyName: string | null
  loaded: boolean
  isAuthenticated: boolean
}

const RoleContext = createContext<RoleContextValue>({
  role: 'rep',
  persona: emptyPersona,
  setRole: () => {},
  userType: 'rep',
  canSwitch: false,
  agencyType: 'single',
  agencyName: null,
  loaded: false,
  isAuthenticated: false,
})

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [userType, setUserType] = useState<UserType>('rep')
  const [role, setRole] = useState<Role>('rep')
  const [persona, setPersona] = useState<Persona>(emptyPersona)
  const [loaded, setLoaded] = useState(false)
  const [canSwitch, setCanSwitch] = useState(false)
  const [agencyType, setAgencyType] = useState<AgencyType>('single')
  const [agencyName, setAgencyName] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoaded(true)
      return
    }
    getMe()
      .then(user => {
        const multi = user.agency?.type === 'multi'
        // A manager in a single-user agency holds a manager's permissions but works their
        // own book: rep navigation until the agency grows.
        const r: Role = user.role === 'manager' && multi ? 'manager' : 'rep'
        // Errors should say *who* hit them. Email is deliberately omitted:
        // alpha runs on demo accounts so it carries no triage value, and it
        // would be real customer PII once external agencies sign up.
        Sentry.setUser({ id: user.id, username: user.name })
        Sentry.setTag('user.role', r)
        setRole(r)
        // Permission follows the role, navigation follows the agency: a single-user owner
        // is a manager (userType) on the rep view (role).
        setUserType(user.role === 'manager' ? 'manager' : 'rep')
        setCanSwitch(user.can_switch ?? false)
        setAgencyType(multi ? 'multi' : 'single')
        setAgencyName(user.agency?.name ?? null)
        setPersona({
          name: user.name,
          initials: user.initials,
          title: user.title ?? (r === 'manager' ? 'Sales Manager' : 'Sales Rep'),
          territory: user.territory ?? undefined,
        })
      })
      .catch(() => {
        // 401 is already handled by the API client (redirects to /login)
      })
      .finally(() => {
        setLoaded(true)
      })
  }, [])

  useEffect(() => {
    if (!loaded) return
    let timer: ReturnType<typeof setTimeout>
    function schedule() {
      const token = getToken()
      if (!token) return
      const exp = getTokenExp(token)
      if (!exp) return
      const ms = exp * 1000 - Date.now() - 5 * 60 * 1000
      if (ms <= 0) return
      timer = setTimeout(async () => {
        try { await attemptRefresh(); schedule() } catch { /* redirect handled by 401 handler */ }
      }, ms)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [loaded])

  const isAuthenticated = loaded && persona.name !== ''

  return (
    <RoleContext.Provider value={{ role, persona, setRole, userType, canSwitch, agencyType, agencyName, loaded, isAuthenticated }}>
      {children}
    </RoleContext.Provider>
  )
}

export const useRole = () => useContext(RoleContext)
