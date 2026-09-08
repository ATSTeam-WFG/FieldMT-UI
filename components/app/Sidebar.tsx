'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMyAgency } from '@/lib/hooks/useMyAgency'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Activity,
  FileText,
  Users,
  CalendarCheck,
  TrendingUp,
  HeartHandshake,
  Settings,
  Info,
  BarChart2,
  ArrowDownUp,
} from 'lucide-react'
import { useRole } from '@/lib/context/RoleContext'

interface NavItemDef {
  label: string
  icon: LucideIcon
  href: string
}

const repMainNav: NavItemDef[] = [
  { label: 'Dashboard',  icon: LayoutDashboard, href: '/dashboard'  },
  { label: 'Activities', icon: Activity,        href: '/activities' },
  { label: 'Contracts',  icon: FileText,        href: '/contracts'  },
  { label: 'Contacts',   icon: Users,           href: '/contacts'   },
  { label: 'Follow-ups', icon: CalendarCheck,   href: '/follow-ups' },
]

const repInsightNav: NavItemDef[] = [
  { label: 'My Relations',   icon: HeartHandshake, href: '/scores'      },
  { label: 'My Performance',  icon: TrendingUp, href: '/performance' },
  { label: 'Imports/Exports', icon: ArrowDownUp, href: '/exports'    },
]

const managerMainNav: NavItemDef[] = [
  { label: 'Dashboard',  icon: LayoutDashboard, href: '/manager'      },
  { label: 'Team',       icon: Users,           href: '/team'         },
  { label: 'Contracts',  icon: FileText,        href: '/contracts'    },
  { label: 'Activities', icon: Activity,        href: '/activities'   },
]

const managerInsightNav: NavItemDef[] = [
  { label: 'Performance', icon: TrendingUp, href: '/performance'  },
  { label: 'Reports',         icon: BarChart2,  href: '/coming-soon' },
  { label: 'Imports/Exports', icon: ArrowDownUp, href: '/exports'    },
]

const settingsNavItems: NavItemDef[] = [
  { label: 'Settings',     icon: Settings, href: '/settings'    },
  { label: 'Help & Support', icon: Info,   href: '/coming-soon' },
]

interface SidebarProps {
  activeItem?: string
}

export function Sidebar({ activeItem }: SidebarProps) {
  const pathname = usePathname()
  const { persona, role } = useRole()
  const { data: agency } = useMyAgency()

  const isManager = role === 'manager'
  const mainNav = isManager ? managerMainNav : repMainNav
  const insightNav = isManager ? managerInsightNav : repInsightNav

  function isActive(href: string, label: string): boolean {
    if (activeItem) return activeItem === label
    return pathname === href
  }

  function NavItem({ label, icon: Icon, href }: NavItemDef) {
    const active = isActive(href, label)
    return (
      <Link
        href={href}
        className="flex items-center gap-2 transition-colors"
        style={{
          height: 36,
          paddingLeft: 20,
          paddingRight: 20,
          fontSize: 13,
          borderLeft: active ? '2px solid #c4a574' : '2px solid transparent',
          color: active ? 'var(--foreground)' : 'var(--muted)',
          fontWeight: active ? 600 : 400,
        }}
      >
        <Icon size={16} />
        {label}
      </Link>
    )
  }

  return (
    <aside
      className="flex h-full w-[220px] shrink-0 flex-col"
      style={{
        backgroundColor: 'var(--background)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Main nav */}
      <div className="flex flex-col pt-6">
        {mainNav.map(item => (
          <NavItem key={item.label} {...item} />
        ))}
      </div>

      {/* Insights section */}
      <div className="flex flex-col pt-6">
        <span
          className="px-5 pb-1 uppercase"
          style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--muted)' }}
        >
          INSIGHTS
        </span>
        {insightNav.map(item => (
          <NavItem key={item.label} {...item} />
        ))}
      </div>

      {/* Divider */}
      <div className="mt-3 mx-0" style={{ height: 1, backgroundColor: 'var(--border)' }} />

      {/* Settings / Help */}
      <div className="flex flex-col">
        {settingsNavItems.map(item => (
          <NavItem key={item.label} {...item} />
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User summary card */}
      <div className="p-4">
        <div
          className="flex items-center gap-2 rounded-[8px] p-3"
          style={{
            backgroundColor: 'var(--surface)',
            borderTop: '2px solid #c4a574',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            borderLeft: '1px solid var(--border)',
          }}
        >
          {/* Avatar */}
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: '#c4a574', fontSize: 11, fontWeight: 600, color: '#ffffff' }}
          >
            {persona.initials}
          </div>

          {/* Name + company */}
          <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 2 }}>
            <span
              className="truncate"
              style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}
            >
              {persona.name}
            </span>
            <span
              className="truncate"
              style={{ fontSize: 11, color: 'var(--muted)' }}
            >
              {agency?.name ?? 'Your agency'}
            </span>
          </div>

          {/* Active dot */}
          <div
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: '#c4a574' }}
          />
        </div>
      </div>
    </aside>
  )
}
