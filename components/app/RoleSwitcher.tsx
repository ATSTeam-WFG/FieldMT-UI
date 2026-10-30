'use client'

import { ChevronDown, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRole } from '@/lib/context/RoleContext'
import { logout } from '@/lib/api/auth'

export function RoleSwitcher() {
  const { role, persona, setRole, canSwitch } = useRole()
  const router = useRouter()

  const switchTarget =
    role === 'manager'
      ? { role: 'rep' as const, label: 'Your own book', action: 'Switch to Rep View' }
      : { role: 'manager' as const, label: 'Your team', action: 'Switch to Manager View' }

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-[8px] px-2 py-1 transition-colors hover:bg-[var(--surface)] focus:outline-none"
          style={{ color: 'var(--body)' }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
            style={{ backgroundColor: '#c4a574', color: '#ffffff' }}
          >
            {persona.initials}
          </div>
          <div className="hidden flex-col items-start sm:flex">
            <span className="text-sm font-semibold leading-none" style={{ color: 'var(--foreground)' }}>
              {persona.name}
            </span>
            <span className="text-xs leading-none mt-0.5" style={{ color: 'var(--muted)' }}>
              {persona.title}
            </span>
          </div>
          <ChevronDown className="hidden md:block h-3.5 w-3.5" style={{ color: 'var(--muted)' }} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {canSwitch && (
          <>
            <DropdownMenuItem
              onClick={() => {
                setRole(switchTarget.role)
                router.push(switchTarget.role === 'manager' ? '/manager' : '/dashboard')
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                  {switchTarget.action}
                </span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {persona.name} · {switchTarget.label}
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="h-4 w-4" style={{ color: 'var(--muted)' }} />
          <span style={{ color: 'var(--foreground)' }}>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
