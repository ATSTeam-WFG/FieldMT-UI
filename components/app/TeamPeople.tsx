'use client'

/**
 * G1 people and G3 — who is in the agency, the invitations still out, and the shape change.
 * Pending invitations sit in the roster with their expiry so an unanswered one is visible
 * rather than forgotten. No email is sent yet, so every invitation carries a link to copy.
 */
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Copy, UserPlus } from 'lucide-react'
import { ApiError } from '@/lib/api/client'
import {
  changeMemberRole,
  resendInvite,
  revokeInvite,
  updateMyAgency,
  type InviteData,
  type MemberRole,
  type RosterMember,
} from '@/lib/api/agencies'
import { useRoster } from '@/lib/hooks/useMyAgency'
import { useSuccessToast } from '@/components/app/SuccessToast'

function inviteUrl(path: string): string {
  return typeof window === 'undefined' ? path : `${window.location.origin}${path}`
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

function ago(iso: string | null): string {
  if (!iso) return 'Not active yet'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'Active today'
  if (days === 1) return 'Active yesterday'
  return `Active ${days} days ago`
}

const chip = (gold: boolean): React.CSSProperties => ({
  fontSize: 11,
  padding: '3px 8px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
  border: `1px solid ${gold ? 'rgba(196,165,116,.45)' : 'var(--border)'}`,
  color: gold ? 'var(--gold)' : 'var(--muted)',
  background: 'var(--surface)',
})

const smallButton: React.CSSProperties = {
  height: 28,
  padding: '0 10px',
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid var(--border)',
  color: 'var(--body)',
  background: 'transparent',
  whiteSpace: 'nowrap',
}

export function TeamPeople() {
  const { data } = useRoster()
  const qc = useQueryClient()
  const showToast = useSuccessToast()
  const [copied, setCopied] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  if (!data) return null

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['agency-roster'] })
    qc.invalidateQueries({ queryKey: ['my-agency'] })
    qc.invalidateQueries({ queryKey: ['my-team'] })
  }

  async function act(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key)
    try {
      await fn()
      showToast(done)
      refresh()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'That didn’t work. Try again.')
    } finally {
      setBusy(null)
    }
  }

  function copy(invite: InviteData) {
    navigator.clipboard.writeText(inviteUrl(invite.path))
    setCopied(invite.id)
    setTimeout(() => setCopied(null), 2000)
  }

  // Reps are listed once, in the performance table below (with "Make a manager");
  // this section holds the managers and the invitations still out.
  const leads = data.members.filter((m) => m.role !== 'agent')
  const managers = data.members.filter((m) => m.role === 'manager').length
  const aloneAndMulti = data.agency.type === 'multi' && data.members.length <= 1 && data.pending.length === 0

  return (
    <section className="flex flex-col" style={{ gap: 12 }}>
      <div className="flex items-baseline justify-between">
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
          Managers{data.pending.length ? ' and pending invitations' : ''}
        </h2>
      </div>

      <div className="overflow-hidden rounded-[8px]" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
        {leads.map((m: RosterMember) => {
          const next: MemberRole = m.role === 'manager' ? 'agent' : 'manager'
          const canDemote = m.role !== 'manager' || managers > 1
          return (
            <div key={m.id} className="flex items-center" style={{ gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <span className="grid shrink-0 place-items-center rounded-full" style={{ width: 32, height: 32, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--gold)', fontSize: 11, fontWeight: 600 }}>
                {m.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.is_owner ? 'Owner · ' : ''}{ago(m.last_seen_at)}</div>
              </div>
              <span style={chip(m.role === 'manager')}>{m.role === 'manager' ? 'Manager' : 'Rep'}</span>
              {m.role !== 'executive' && canDemote && (
                <button
                  style={smallButton}
                  disabled={busy === m.id}
                  onClick={() => act(m.id, () => changeMemberRole(m.id, next), next === 'manager' ? `${m.name} is now a manager` : `${m.name} is now a rep`)}
                >
                  {next === 'manager' ? 'Make a manager' : 'Make a rep'}
                </button>
              )}
            </div>
          )
        })}
        {data.pending.map((inv) => {
          const left = daysUntil(inv.expires_at)
          const expired = inv.state === 'expired'
          return (
            <div key={inv.id} className="flex flex-wrap items-center" style={{ gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <span className="grid shrink-0 place-items-center rounded-full" style={{ width: 32, height: 32, background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 11 }}>
                {inv.email.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{inv.email}</div>
                <div style={{ fontSize: 12, color: expired ? '#d97706' : 'var(--muted)' }}>
                  {inv.role === 'manager' ? 'Manager' : 'Rep'} ·{' '}
                  {expired ? 'Invitation expired' : `Invited · expires in ${left} ${left === 1 ? 'day' : 'days'}`}
                </div>
              </div>
              <span style={{ ...chip(false), color: '#d97706', borderColor: 'rgba(217,119,6,.5)' }}>Pending</span>
              <div className="flex" style={{ gap: 6 }}>
                {!expired && (
                  <button style={smallButton} onClick={() => copy(inv)} aria-label={`Copy link for ${inv.email}`}>
                    <span className="inline-flex items-center" style={{ gap: 4 }}>
                      {copied === inv.id ? <Check size={12} /> : <Copy size={12} />}
                      {copied === inv.id ? 'Copied' : 'Copy link'}
                    </span>
                  </button>
                )}
                <button style={smallButton} disabled={busy === inv.id} onClick={() => act(inv.id, () => resendInvite(inv.id), 'Invitation renewed for 7 days')}>
                  Resend
                </button>
                <button style={smallButton} disabled={busy === inv.id} onClick={() => act(inv.id, () => revokeInvite(inv.id), 'Invitation revoked')}>
                  Revoke
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {aloneAndMulti && (
        <div className="flex flex-wrap items-center justify-between rounded-[8px]" style={{ gap: 10, padding: '12px 14px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <span style={{ fontSize: 13, color: 'var(--body)' }}>
            It’s just you here now. Switch back to the rep view? Nothing moves, and you can add people again any time.
          </span>
          <button
            style={smallButton}
            disabled={busy === 'single'}
            onClick={() => act('single', async () => {
              await updateMyAgency({ type: 'single' })
              window.location.href = '/dashboard'
            }, 'Switched back to just you')}
          >
            Switch back to just you
          </button>
        </div>
      )}
    </section>
  )
}

/** G3 — the promise from A2 ("add reps any time; nothing moves"), kept. */
export function AddFirstRep({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center" style={{ gap: 14, paddingTop: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>It’s just you right now</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
        Adding someone turns on the team view: performance across your reps, 1:1 detail, and the agency join code.
      </p>
      <div className="w-full rounded-[8px] text-left" style={{ padding: '12px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderTop: '2px solid #c4a574' }}>
        <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Nothing moves</div>
        <p style={{ fontSize: 13, color: 'var(--body)', margin: '4px 0 0', lineHeight: 1.5 }}>
          Your contacts, contracts, activities and scores stay exactly where they are. You keep working your own book alongside the team.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="flex w-full items-center justify-center"
        style={{ height: 40, gap: 6, fontSize: 14, fontWeight: 600, color: '#000000', backgroundColor: '#c4a574', border: 'none', borderRadius: 8 }}
      >
        <UserPlus size={15} />
        Add your first rep
      </button>
    </div>
  )
}

/** "Make a manager" on a rep's row in the performance table. */
export function MakeManagerButton({ userId, name }: { userId: string; name: string }) {
  const qc = useQueryClient()
  const showToast = useSuccessToast()
  const [busy, setBusy] = useState(false)
  return (
    <button
      style={smallButton}
      disabled={busy}
      onClick={async (e) => {
        e.stopPropagation()
        setBusy(true)
        try {
          await changeMemberRole(userId, 'manager')
          showToast(`${name} is now a manager`)
          qc.invalidateQueries({ queryKey: ['agency-roster'] })
          qc.invalidateQueries({ queryKey: ['my-team'] })
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : 'That didn’t work. Try again.')
        } finally {
          setBusy(false)
        }
      }}
    >
      Make a manager
    </button>
  )
}
