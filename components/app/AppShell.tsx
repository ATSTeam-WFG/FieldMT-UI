'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { House, Activity, Users, BookUser, CalendarCheck, Ellipsis, LayoutDashboard, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { TopNav } from './TopNav'
import { Sidebar } from './Sidebar'
import { LogActivityPanel } from './LogActivityPanel'
import { LogContractPanel } from './LogContractPanel'
import { AddContactPanel } from './AddContactPanel'
import { NotificationPanel } from './NotificationPanel'
import { FeedbackPanel } from './FeedbackPanel'
import { FeedbackButton } from './FeedbackButton'
import { CommandPalette } from './CommandPalette'
import { MobileMoreSheet } from './MobileMoreSheet'
import { useActivityLog } from '@/lib/context/ActivityLogContext'
import { useAddContact } from '@/lib/context/AddContactContext'
import { useNotifications } from '@/lib/context/NotificationContext'
import { useFeedback } from '@/lib/context/FeedbackContext'
import { useSearch } from '@/lib/context/SearchContext'
import { useContract } from '@/lib/context/ContractContext'
import { InviteAgentPanel } from './InviteAgentPanel'
import { TeamBroadcastPanel } from './TeamBroadcastPanel'
import { LoadingScreen } from './LoadingScreen'
import { useInviteAgent } from '@/lib/context/InviteAgentContext'
import { useTeamBroadcast } from '@/lib/context/TeamBroadcastContext'
import { useRole } from '@/lib/context/RoleContext'
import { trackEvent } from '@/lib/api/events'

interface AppShellProps {
  activeItem?: string
  children: React.ReactNode
}

interface TabItem {
  label: string
  icon: LucideIcon
  href: string
}

const repMobileTabItems: TabItem[] = [
  { label: 'Home',       icon: House,         href: '/dashboard'  },
  { label: 'Activities', icon: Activity,       href: '/activities' },
  { label: 'Contacts',   icon: Users,          href: '/contacts'   },
  { label: 'Follow-ups', icon: CalendarCheck,  href: '/follow-ups' },
  { label: 'More',       icon: Ellipsis,       href: '/coming-soon' },
]

const managerMobileTabItems: TabItem[] = [
  { label: 'Dashboard',  icon: LayoutDashboard, href: '/manager'    },
  { label: 'My Team',    icon: Users,           href: '/team'       },
  { label: 'Contracts',  icon: FileText,        href: '/contracts'  },
  { label: 'Contacts',   icon: BookUser,        href: '/contacts'   },
  { label: 'More',       icon: Ellipsis,        href: '/coming-soon' },
]

export function AppShell({ activeItem, children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { role, loaded, isAuthenticated } = useRole()
  const { isOpen: logOpen } = useActivityLog()
  const { isOpen: addOpen } = useAddContact()
  const { isOpen: contractOpen } = useContract()
  const { isOpen: notifOpen } = useNotifications()
  const { isOpen: feedbackOpen } = useFeedback()
  const { isOpen: inviteOpen } = useInviteAgent()
  const { isOpen: broadcastOpen } = useTeamBroadcast()
  const { isOpen: searchOpen } = useSearch()
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    if (loaded && !isAuthenticated) {
      router.replace('/login')
    }
  }, [loaded, isAuthenticated, router])

  // Presence telemetry — record a page_view on navigation (authed pages only).
  useEffect(() => {
    if (loaded && isAuthenticated) trackEvent('page_view', pathname)
  }, [pathname, loaded, isAuthenticated])

  if (!loaded) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ backgroundColor: 'var(--background)' }}
      />
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top navigation bar */}
      <TopNav />

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:flex h-full">
          <Sidebar activeItem={activeItem} />
        </div>

        {/* Main content area */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor: 'var(--background)' }}
        >
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Slide-over panels with AnimatePresence */}
      <AnimatePresence>{logOpen && <LogActivityPanel />}</AnimatePresence>
      <AnimatePresence>{contractOpen && <LogContractPanel />}</AnimatePresence>
      <AnimatePresence>{addOpen && <AddContactPanel />}</AnimatePresence>
      <AnimatePresence>{notifOpen && <NotificationPanel />}</AnimatePresence>
      <AnimatePresence>{inviteOpen && <InviteAgentPanel />}</AnimatePresence>
      <AnimatePresence>{broadcastOpen && <TeamBroadcastPanel />}</AnimatePresence>
      <AnimatePresence>{feedbackOpen && <FeedbackPanel />}</AnimatePresence>

      {/* Floating feedback trigger — every authed page, both breakpoints */}
      <FeedbackButton />

      {/* Command palette (fixed, full-screen overlay) */}
      <AnimatePresence>{searchOpen && <CommandPalette />}</AnimatePresence>

      {/* Mobile More sheet */}
      <AnimatePresence>
        {moreOpen && (
          <MobileMoreSheet
            isOpen={moreOpen}
            onClose={() => setMoreOpen(false)}
            role={role === 'rep' ? 'agent' : 'manager'}
          />
        )}
      </AnimatePresence>

      {/* Mobile bottom tab bar */}
      <div
        className="flex md:hidden"
        style={{
          height: 56,
          backgroundColor: 'var(--card)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {(role === 'manager' ? managerMobileTabItems : repMobileTabItems).map(item => {
          if (item.label === 'More') {
            return (
              <button
                key="More"
                onClick={() => setMoreOpen(true)}
                className="flex flex-1 flex-col items-center justify-center"
                style={{ gap: 3, border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
              >
                <item.icon
                  size={20}
                  style={{ color: moreOpen ? '#c4a574' : 'var(--muted)' }}
                />
                <span style={{ fontSize: 10, color: moreOpen ? '#c4a574' : 'var(--muted)' }}>
                  More
                </span>
              </button>
            )
          }
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center"
              style={{ gap: 3 }}
            >
              <item.icon
                size={20}
                style={{ color: isActive ? '#c4a574' : 'var(--muted)' }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: isActive ? '#c4a574' : 'var(--muted)',
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
