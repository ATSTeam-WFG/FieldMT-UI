'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, UserPlus, User, ShieldCheck } from 'lucide-react'
import { useInviteAgent } from '@/lib/context/InviteAgentContext'
import { useSuccessToast } from '@/components/app/SuccessToast'
import { useTheme } from '@/lib/context/ThemeContext'
import { SlideOverPanel } from './SlideOverPanel'
import { createInvites, type AgencyData, type MemberRole } from '@/lib/api/agencies'

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLES: { value: MemberRole; label: string; description: string }[] = [
  { value: 'agent', label: 'Rep', description: 'Works their own book' },
  { value: 'manager', label: 'Manager', description: 'Also sees the team' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldLabel({ label, required, optional }: { label: string; required?: boolean; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase' as const }}>
        {label}
      </span>
      {required && <span style={{ color: '#c4a574', fontSize: 13, lineHeight: 1 }}>*</span>}
      {optional && (
        <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', letterSpacing: '0.04em' }}>
          Optional
        </span>
      )}
    </div>
  )
}

function SectionHeading({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <Icon size={14} style={{ color: '#c4a574' }} />
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase' as const }}>
        {label}
      </span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface)',
  color: 'var(--foreground)',
  fontSize: 14,
  outline: 'none',
}

// ── Main Component ────────────────────────────────────────────────────────────

export function InviteAgentPanel() {
  const { closeInviteAgent } = useInviteAgent()
  const queryClient = useQueryClient()
  const showToast = useSuccessToast()
  const { theme } = useTheme()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('agent')
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setEmail('')
    setRole('agent')
  }

  async function handleSend() {
    setLoading(true)
    try {
      const created = await createInvites([{ email: email.trim(), role }])
      // This panel bypasses the mutation hooks, so nothing was being invalidated
      // — the roster and the manager's invite_rep step both stayed stale. The
      // first invite from a single-user agency also turns on the team view.
      const wasSingle = queryClient.getQueryData<AgencyData | null>(['my-agency'])?.type === 'single'
      queryClient.invalidateQueries({ queryKey: ['my-team'] })
      queryClient.invalidateQueries({ queryKey: ['agency-roster'] })
      queryClient.invalidateQueries({ queryKey: ['my-agency'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding-checklist'] })
      if (created.length) {
        // No email goes out yet — the link is the invitation, so hand it over.
        await navigator.clipboard.writeText(`${window.location.origin}${created[0].path}`).catch(() => {})
        showToast(`Invitation link copied — share it with ${created[0].email}. It's also on Team.`)
      } else {
        showToast('Already invited or already on the team')
      }
      closeInviteAgent()
      resetForm()
      // The first invitation from a single-user agency turns on the team view.
      if (created.length && wasSingle) window.location.reload()
    } catch (err) {
      showToast(err instanceof Error && err.message ? err.message : 'Failed to send invite — please try again')
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    closeInviteAgent()
    resetForm()
  }

  const activeTileBg = theme === 'dark' ? '#1f1a12' : '#fdf8f0'
  const canSend = /.+@.+\..+/.test(email.trim())

  return (
    <SlideOverPanel onClose={closeInviteAgent} width={480}>
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between"
        style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <UserPlus size={16} style={{ color: '#c4a574' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>
            Invite a teammate
          </span>
        </div>
        <button
          onClick={handleCancel}
          className="flex items-center justify-center rounded-[6px] transition-colors hover:bg-[var(--surface)]"
          style={{ width: 32, height: 32, color: 'var(--muted)', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>

        <div style={{ marginBottom: 24 }}>
          <SectionHeading icon={User} label="Who" />
          <FieldLabel label="Email" required />
          <input type="email" placeholder="name@youragency.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} autoFocus />
        </div>

        <div style={{ marginBottom: 16 }}>
          <SectionHeading icon={ShieldCheck} label="They join as" />
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(({ value, label, description }) => {
              const active = role === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className="flex flex-col items-start rounded-[8px] transition-colors"
                  style={{
                    padding: 12, gap: 2,
                    border: active ? '2px solid #c4a574' : '1px solid var(--border)',
                    backgroundColor: active ? activeTileBg : 'var(--surface)',
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#c4a574' : 'var(--foreground)' }}>{label}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{description}</span>
                </button>
              )
            })}
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          Expires in 7 days. You can resend or revoke it from Team.
        </p>

      </div>

      {/* Footer */}
      <div
        className="flex shrink-0 items-center justify-end gap-3"
        style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}
      >
        <button
          type="button"
          onClick={handleCancel}
          style={{ height: 40, padding: '0 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--muted)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend || loading}
          style={{
            height: 40, padding: '0 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            backgroundColor: canSend ? (theme === 'dark' ? '#c4a574' : '#000000') : 'var(--surface)',
            color: canSend ? (theme === 'dark' ? '#000000' : '#ffffff') : 'var(--muted)',
            border: canSend ? 'none' : '1px solid var(--border)',
            cursor: (canSend && !loading) ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Creating…' : 'Create invitation link'}
        </button>
      </div>
    </SlideOverPanel>
  )
}
