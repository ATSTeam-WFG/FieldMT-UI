'use client'

import { useRef, useState } from 'react'
import { Check, ChevronDown, Sparkles } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Contract, Recommendation } from '@/lib/api/contracts'
import type { AgencyMembers } from '@/lib/api/agencies'
import { useSetAssignment } from '@/lib/hooks/useContracts'
import { toast } from '@/lib/hooks/use-toast'

function fmtDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

/** "3 activities with Clay Carson in the 90 days before this order opened (last: lunch, 2 Feb)" */
export function recommendationEvidence(r: Recommendation): string {
  const n = r.activity_count
  return `${n} ${n === 1 ? 'activity' : 'activities'} with ${r.anchor_name} in the 90 days before this order opened `
    + `(last: ${r.last_type.replace(/_/g, ' ')}, ${fmtDay(r.last_date)})`
}

/** Who the order's evidence is about: its source of business, else its agents (linkage.anchors). */
function sourceName(contract: Contract): string {
  if (contract.referring_contact) return contract.referring_contact.name
  const agents = [contract.contact?.name, contract.secondary_contact?.name].filter(Boolean)
  return agents.length ? agents.join(' or ') : 'this order’s agents'
}

/** One muted line, the long form in a popover on hover (after 200ms) or keyboard focus. */
function ReasonLine({ id, short, long, right = false }: { id: string; short: string; long: string; right?: boolean }) {
  const [open, setOpen] = useState(false)
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const show = () => setTimer(setTimeout(() => setOpen(true), 200))
  const hide = () => { if (timer) clearTimeout(timer); setOpen(false) }
  return (
    <span id={id} tabIndex={0} onMouseEnter={show} onMouseLeave={hide} onFocus={() => setOpen(true)} onBlur={hide}
      style={{ position: 'relative', display: 'block', minWidth: 0, maxWidth: '100%', outline: 'none' }}>
      <span className="truncate block" style={{ fontSize: 11, color: 'var(--muted)', textAlign: right ? 'right' : undefined }}>{short}</span>
      <span role="tooltip" className="transition-opacity duration-100 motion-reduce:transition-none" style={{
        position: 'absolute', top: '100%', ...(right ? { right: 0 } : { left: 0 }), marginTop: 4, zIndex: 30, width: 280, padding: '8px 10px',
        fontSize: 12, lineHeight: '17px', color: 'var(--body)', background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', opacity: open ? 1 : 0, pointerEvents: 'none',
      }}>
        {long}
      </span>
    </span>
  )
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

// Brand secondary button: gold outline at rest, gold fill with black text on hover/focus
const GOLD_OUTLINE = 'border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black '
  + 'focus-visible:bg-[var(--gold)] focus-visible:text-black focus:outline-none transition-colors disabled:opacity-60'
const NEUTRAL = 'border border-[var(--border)] text-[var(--body)] hover:border-[var(--muted)] focus:outline-none '
  + 'focus-visible:border-[var(--muted)] transition-colors disabled:opacity-60'

/**
 * Who a contract is credited to (D16). A user who can assign gets a split button naming the
 * recommended rep, or a rep picker; everyone else sees the name. A cancelled order earns no
 * credit (D3), so it offers no control.
 */
export function AssignmentControl({ contract, members, compact = false }: {
  contract: Contract
  members: AgencyMembers | undefined
  compact?: boolean
}) {
  const assign = useSetAssignment()
  const [announce, setAnnounce] = useState('')
  // The recommendation's reason, as a branded tooltip on the table's Assign button
  const [tipOpen, setTipOpen] = useState(false)
  const tipTimer = useRef<ReturnType<typeof setTimeout>>()
  const showTip = (delay: number) => { clearTimeout(tipTimer.current); tipTimer.current = setTimeout(() => setTipOpen(true), delay) }
  const hideTip = () => { clearTimeout(tipTimer.current); setTipOpen(false) }
  const rec = contract.recommendation
  const current = members?.members.find(m => m.id === contract.assigned_rep_id)
  const repName = current?.name ?? contract.assigned_rep_name

  if (contract.status === 'cancelled' || !members?.can_manage) {
    return (
      <span className="truncate block" style={{ fontSize: 13, color: repName ? 'var(--body)' : 'var(--muted)', textAlign: compact ? 'right' : undefined }}>
        {repName ?? (contract.status === 'cancelled' ? '—' : 'Unassigned')}
      </span>
    )
  }

  async function save(repId: string | null) {
    try {
      await assign.mutateAsync({ id: contract.id, repId })
      const name = members?.members.find(m => m.id === repId)?.name
      setAnnounce(name ? `Assigned to ${name}` : 'Unassigned')
    } catch {
      toast({ title: 'Could not assign', description: 'Please try again.', variant: 'destructive' })
    }
  }

  // The recommended rep is pinned to the top of the picker
  const ordered = rec
    ? [...members.members].sort((a, b) => Number(b.id === rec.rep_id) - Number(a.id === rec.rep_id))
    : members.members
  const picker = (trigger: React.ReactNode) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={assign.isPending}>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {ordered.map(m => (
          <MenuItem key={m.id} label={m.name} selected={m.id === contract.assigned_rep_id}
            recommended={m.id === rec?.rep_id} onSelect={() => save(m.id)} />
        ))}
        {contract.assigned_rep_id && <>
          <DropdownMenuSeparator />
          <MenuItem label="Unassign" muted selected={false} onSelect={() => save(null)} />
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const reasonId = `assign-reason-${contract.id}`
  let control: React.ReactNode
  let caption: { short: string; long: string } | null
  if (contract.assigned_rep_id) {
    const by = members.members.find(m => m.id === contract.assigned_by)?.name
    const on = contract.assigned_at
      ? new Date(contract.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
    const line = [by && `Assigned by ${by}`, on].filter(Boolean).join(' · ')
    caption = line ? { short: line, long: line } : null
    control = (
      <div className="flex items-center" style={{ gap: 8, minWidth: 0 }}>
        <span aria-hidden className="flex items-center justify-center shrink-0 rounded-full"
          style={{ width: 22, height: 22, fontSize: 10, fontWeight: 600, color: 'var(--body)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {initials(repName ?? '?')}
        </span>
        <span className="truncate" title={line || repName || undefined} style={{ fontSize: 13, color: 'var(--foreground)' }}>{repName}</span>
        {picker(
          <button type="button" className="shrink-0 hover:text-[var(--foreground)] focus:outline-none focus-visible:underline"
            style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer' }}>
            Change
          </button>
        )}
      </div>
    )
  } else if (rec) {
    // Confidence: two or more activities earns the star; a single one is only the sole candidate
    const strong = rec.activity_count >= 2
    const evidence = recommendationEvidence(rec)
    caption = strong
      ? { short: `${rec.activity_count} activities with ${rec.anchor_name} before open`, long: `${rec.rep_name} recommended: ${evidence}` }
      : { short: `Only candidate: 1 activity with ${rec.anchor_name}`, long: `Only candidate: ${rec.rep_name}. ${evidence}` }
    control = (
      <div className="flex" style={{ minWidth: 0, width: '100%', position: 'relative' }}>
        <button type="button" onClick={() => save(rec.rep_id)} disabled={assign.isPending} aria-describedby={reasonId}
          onMouseEnter={() => showTip(200)} onMouseLeave={hideTip} onFocus={() => showTip(0)} onBlur={hideTip}
          className={`flex items-center rounded-l-[8px] ${GOLD_OUTLINE}`}
          style={{ flex: 1, height: 30, gap: 6, padding: '0 10px', fontSize: 12, fontWeight: 600, minWidth: 0, cursor: 'pointer' }}>
          <Sparkles size={12} aria-hidden className="shrink-0" />
          <span className="truncate">Assign {rec.rep_name}</span>
        </button>
        {picker(
          <button type="button" aria-label="Choose another rep"
            className={`flex items-center justify-center rounded-r-[8px] border-l-0 ${GOLD_OUTLINE}`}
            style={{ height: 30, width: 30, flexShrink: 0, cursor: 'pointer' }}>
            <ChevronDown size={14} />
          </button>
        )}
        {compact && (
          <div id={reasonId} role="tooltip" className="transition-opacity duration-100 motion-reduce:transition-none" style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 30, width: 300, padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'none', opacity: tipOpen ? 1 : 0,
            borderRadius: 8, background: 'color-mix(in srgb, var(--gold) 7%, var(--card))',
            border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)', borderLeft: '3px solid var(--gold)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}>
            <span className="flex items-center" style={{ gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gold)' }}>
              <Sparkles size={12} aria-hidden /> {strong ? `${rec.rep_name} recommended` : 'Only candidate'}
            </span>
            <span style={{ fontSize: 12, lineHeight: '17px', color: 'var(--body)' }}>{evidence}</span>
          </div>
        )}
      </div>
    )
  } else {
    const source = sourceName(contract)
    caption = {
      short: `No prior activity with ${source}`,
      long: `No rep logged activity with ${source} in the 90 days before this order opened, so there is no recommendation.`,
    }
    control = picker(
      <button type="button" aria-describedby={reasonId} className={`flex items-center justify-between rounded-[8px] ${NEUTRAL}`}
        style={{ width: '100%', height: 30, gap: 6, padding: '0 8px 0 10px', fontSize: 12, background: 'var(--surface)', cursor: 'pointer' }}>
        Assign <ChevronDown size={14} color="var(--muted)" />
      </button>
    )
  }

  return (
    // The row opens the contract on click — keep the control's clicks to itself.
    // In the table the control sits flush right in its column
    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, alignItems: compact ? 'flex-end' : undefined }}>
      {control}
      {/* In the table an assigned row stays one line; its "assigned by" is on the name's hover */}
      {/* …and a recommended row keeps its reason in the button's tooltip */}
      {caption && !(compact && (contract.assigned_rep_id || rec)) && <ReasonLine id={reasonId} {...caption} right={compact} />}
      {!compact && contract.assigned_rep_id && rec && (
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          System recommended {rec.rep_name} — {recommendationEvidence(rec)}
        </span>
      )}
      <span aria-live="polite" className="sr-only">{announce}</span>
    </div>
  )
}

function MenuItem({ label, selected, muted = false, recommended = false, onSelect }: {
  label: string; selected: boolean; muted?: boolean; recommended?: boolean; onSelect: () => void
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} className="flex items-center cursor-pointer" style={{ gap: 8, fontSize: 13, color: muted ? 'var(--muted)' : 'var(--body)' }}>
      <span style={{ width: 14, flexShrink: 0, display: 'flex' }}>{selected && <Check size={14} color="var(--gold)" />}</span>
      <span className="truncate" style={{ flex: 1, fontWeight: selected ? 600 : 400, color: selected ? 'var(--foreground)' : undefined }}>{label}</span>
      {recommended && (
        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, color: 'var(--gold)', border: '1px solid var(--gold)', flexShrink: 0 }}>Recommended</span>
      )}
    </DropdownMenuItem>
  )
}
