'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, UserPlus, User, ShieldCheck } from 'lucide-react'
import { useInviteAgent } from '@/lib/context/InviteAgentContext'
import { useSuccessToast } from '@/components/app/SuccessToast'
import { useTheme } from '@/lib/context/ThemeContext'
import { SlideOverPanel } from './SlideOverPanel'
import { createInvites } from '@/lib/api/agencies'

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'rep', label: 'Sales Rep' },
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

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('rep')
  const [welcomeNote, setWelcomeNote] = useState('')
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setName('')
    setEmail('')
    setPhone('')
    setRole('rep')
    setWelcomeNote('')
  }

  const REP_TIER_MAP: Record<string, string> = {
    'rep': 'sales_rep',
  }

  async function handleSend() {
    setLoading(true)
    try {
      await createInvites([{
        email,
        full_name: name,
        phone: phone || null,
        rep_tier: REP_TIER_MAP[role] ?? 'sales_rep',
        welcome_note: welcomeNote || null,
      }])
      // This panel bypasses the mutation hooks, so nothing was being invalidated
      // — the roster and the manager's invite_rep step both stayed stale.
      queryClient.invalidateQueries({ queryKey: ['my-team'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding-checklist'] })
      showToast('Invitation sent successfully')
      closeInviteAgent()
      resetForm()
    } catch {
      showToast('Failed to send invite — please try again')
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    closeInviteAgent()
    resetForm()
  }

  const activeTileBg = theme === 'dark' ? '#1f1a12' : '#fdf8f0'
  const canSend = name.trim() !== '' && email.trim() !== ''

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
            Invite Rep
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

        {/* ── Section 1: Identity ── */}
        <div style={{ marginBottom: 24 }}>
          <SectionHeading icon={User} label="Rep Identity" />

          <div style={{ marginBottom: 16 }}>
            <FieldLabel label="Full Name" required />
            <input type="text" placeholder="e.g. Jordan Mitchell" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <FieldLabel label="Email" required />
            <input type="email" placeholder="rep@premiertitle.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <FieldLabel label="Phone" optional />
            <input type="tel" placeholder="(404) 555-0100" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* ── Section 2: Assignment ── */}
        <div style={{ marginBottom: 24 }}>
          <SectionHeading icon={ShieldCheck} label="Assignment" />

          <div>
            <FieldLabel label="Role" required />
            <div className="grid grid-cols-1 gap-2">
              {ROLES.map(({ value, label }) => {
                const active = role === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className="flex items-center justify-center rounded-[8px] transition-colors"
                    style={{
                      height: 40, padding: '0 8px',
                      border: active ? '2px solid #c4a574' : '1px solid var(--border)',
                      backgroundColor: active ? activeTileBg : 'var(--surface)',
                      cursor: 'pointer',
                      color: active ? '#c4a574' : 'var(--muted)',
                      fontWeight: active ? 600 : 400,
                      fontSize: 12,
                      textAlign: 'center' as const,
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Section 3: Welcome Note ── */}
        <div>
          <FieldLabel label="Welcome Note" optional />
          <div className="relative">
            <textarea
              placeholder="Add a personal welcome message to include with the invitation email…"
              value={welcomeNote}
              onChange={e => setWelcomeNote(e.target.value.slice(0, 400))}
              style={{
                width: '100%', height: 96, padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
                color: 'var(--foreground)', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit',
              }}
            />
            <span style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 11, color: 'var(--muted)' }}>
              {welcomeNote.length}/400
            </span>
          </div>
        </div>

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
          {loading ? 'Sending…' : 'Send Invite'}
        </button>
      </div>
    </SlideOverPanel>
  )
}
