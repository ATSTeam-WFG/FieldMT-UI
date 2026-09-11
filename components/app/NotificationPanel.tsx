'use client'

import { TrendingDown, Clock, CalendarClock, Zap, Megaphone, Rocket, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/context/NotificationContext'
import type { Notification } from '@/lib/context/NotificationContext'
import { useActivityLog } from '@/lib/context/ActivityLogContext'
import { SlideOverPanel } from './SlideOverPanel'

export function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffH   = Math.floor(diffMs / 3_600_000)

  if (diffMin < 1)  return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffH   < 24) return `${diffH}h ago`

  const isToday     = d.toDateString() === now.toDateString()
  const yesterday   = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time        = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (isToday)     return `Today at ${time}`
  if (isYesterday) return `Yesterday at ${time}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` at ${time}`
}

function NotifIcon({ type, entity_type }: { type: Notification['type']; entity_type: string | null }) {
  let Icon = Clock
  let color = 'var(--muted)'

  if (type === 'alert' && entity_type === 'contact') {
    // Score decay — relationship declining
    Icon = TrendingDown; color = '#d97706'
  } else if (type === 'alert') {
    // Manager no-activity alert
    Icon = Clock; color = 'var(--muted)'
  } else if (type === 'follow-up') {
    Icon = CalendarClock; color = '#c4a574'
  } else if (type === 'activity') {
    Icon = Zap; color = '#c4a574'
  } else if (type === 'broadcast') {
    Icon = Megaphone; color = '#c4a574'
  } else if (type === 'onboarding') {
    // Matches the "Getting started" sidebar entry this one signs off on.
    Icon = Rocket; color = '#c4a574'
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: 32, height: 32, backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <Icon size={14} style={{ color }} />
    </div>
  )
}

function ActionChip({ label, onClick, variant = 'gold' }: { label: string; onClick: () => void; variant?: 'gold' | 'muted' }) {
  const isGold = variant === 'gold'
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        flex: 1, height: 26, padding: '0 10px', borderRadius: 5,
        border: isGold ? '1px solid rgba(196,165,116,0.35)' : '1px solid var(--border)',
        backgroundColor: isGold ? 'rgba(196,165,116,0.08)' : 'transparent',
        fontSize: 11, fontWeight: 500,
        color: isGold ? '#c4a574' : 'var(--muted)',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

export function NotifRow({
  notif,
  isLast,
  isUnread,
  onMarkRead,
  onNavigate,
  onLogActivity,
}: {
  notif: Notification
  isLast: boolean
  isUnread: boolean
  onMarkRead: (id: string) => void
  onNavigate: (path: string) => void
  onLogActivity: () => void
}) {
  const hasContact = notif.entity_type === 'contact' && !!notif.entity_id

  const contextActions: { label: string; onClick: () => void }[] = []

  if (notif.type === 'alert' && hasContact) {
    contextActions.push({ label: 'Log Activity', onClick: onLogActivity })
    contextActions.push({ label: 'View Contact', onClick: () => onNavigate(`/contacts/${notif.entity_id}`) })
  } else if (notif.type === 'alert' && notif.entity_type === 'contract' && notif.entity_id) {
    contextActions.push({ label: 'View Contract', onClick: () => onNavigate(`/contracts?view=${notif.entity_id}`) })
  } else if (notif.type === 'follow-up') {
    // Extract due date from message to position the calendar on the right period
    const dateMatch = notif.message.match(/\(due (\d{4}-\d{2}-\d{2})\)/)
    const followUpPath = dateMatch ? `/follow-ups?date=${dateMatch[1]}` : '/follow-ups'
    contextActions.push({ label: 'View Follow-ups', onClick: () => onNavigate(followUpPath) })
  } else if (notif.type === 'activity') {
    contextActions.push({ label: 'View Activities', onClick: () => onNavigate('/activities') })
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 20px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      <NotifIcon type={notif.type} entity_type={notif.entity_type} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Message — wraps up to 2 lines */}
        <span style={{
          fontSize: 13, fontWeight: isUnread ? 500 : 400,
          color: isUnread ? 'var(--foreground)' : 'var(--body)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {notif.message}
        </span>

        {/* Timestamp */}
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {formatTimestamp(notif.timestamp)}
        </span>

        {/* Action chips: context actions (gold) first, Mark as Read (muted) last */}
        <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
          {contextActions.map(a => (
            <ActionChip key={a.label} label={a.label} onClick={a.onClick} variant="gold" />
          ))}
          {isUnread && (
            <ActionChip label="Mark as Read" onClick={() => onMarkRead(notif.id)} variant="muted" />
          )}
        </div>
      </div>
    </div>
  )
}

export function NotificationPanel() {
  const { closeNotifications, markRead, markAllRead, unreadCount, notifications } = useNotifications()
  const { openLog } = useActivityLog()
  const router = useRouter()

  const newNotifs     = notifications.filter(n => !n.read)
  const earlierNotifs = notifications.filter(n => n.read)

  function navigate(path: string) {
    closeNotifications()
    router.push(path)
  }

  function logActivity() {
    closeNotifications()
    openLog()
  }

  const rowProps = {
    onMarkRead: markRead,
    onNavigate: navigate,
    onLogActivity: logActivity,
  }

  return (
    <SlideOverPanel onClose={closeNotifications}>
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between"
        style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center" style={{ gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              className="flex items-center justify-center rounded-full font-semibold"
              style={{ height: 20, minWidth: 20, paddingLeft: 6, paddingRight: 6, fontSize: 11, backgroundColor: '#c4a574', color: '#000' }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center" style={{ gap: 12 }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{ fontSize: 12, color: '#c4a574', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              className="hover:underline"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={closeNotifications}
            className="flex items-center justify-center rounded-[6px] transition-colors hover:bg-[var(--surface)]"
            style={{ width: 32, height: 32, color: 'var(--muted)', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>No notifications yet.</p>
          </div>
        )}

        {newNotifs.length > 0 && (
          <div>
            <div style={{ padding: '12px 20px 6px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase' }}>
              New
            </div>
            {newNotifs.map((notif, i) => (
              <NotifRow key={notif.id} notif={notif} isLast={i === newNotifs.length - 1} isUnread {...rowProps} />
            ))}
          </div>
        )}

        {earlierNotifs.length > 0 && (
          <div>
            <div style={{ padding: '12px 20px 6px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Earlier
            </div>
            {earlierNotifs.map((notif, i) => (
              <NotifRow key={notif.id} notif={notif} isLast={i === earlierNotifs.length - 1} isUnread={false} {...rowProps} />
            ))}
          </div>
        )}
      </div>
    </SlideOverPanel>
  )
}
