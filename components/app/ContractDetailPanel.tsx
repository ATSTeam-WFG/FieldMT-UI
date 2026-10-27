'use client'

import { X, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { SlideOverPanel } from './SlideOverPanel'
import { AssignmentControl } from './AssignmentControl'
import { getContract, type Contract } from '@/lib/api/contracts'
import { useSetReferrer } from '@/lib/hooks/useContracts'
import { useAgencyMembers } from '@/lib/hooks/useMyAgency'
import { toast } from '@/lib/hooks/use-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number | null): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('en-US')
}

function formatDate(raw: string | null): string {
  if (!raw) return '—'
  return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const STATUS_COLOR: Record<string, string> = {
  closed:    '#16a34a',
  cancelled: '#d97706',
  initiated: 'var(--muted)',
  pending:   'var(--muted)',
  updated:   'var(--muted)',
}

const STATUS_LABEL: Record<string, string> = {
  initiated: 'Opened',
  pending:   'Open',
  updated:   'Updated',
  closed:    'Closed',
  cancelled: 'Cancelled',
}

// ── Field row ─────────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: 'var(--foreground)' }}>
        {value || '—'}
      </span>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface Props {
  contract: Contract
  onClose: () => void
}

const BROUGHT_BUSINESS = (
  <span style={{
    fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
    color: '#c4a574', border: '1px solid #c4a574',
    borderRadius: 4, padding: '1px 6px',
  }}>
    BROUGHT THE BUSINESS
  </span>
)

export function ContractDetailPanel({ contract: initial, onClose }: Props) {
  // Live copy, so an assignment or referrer change shows straight away
  const { data: contract = initial } = useQuery({
    queryKey: ['contract', initial.id],
    queryFn: () => getContract(initial.id),
    initialData: initial,
  })
  const { data: members } = useAgencyMembers()
  const setReferrer = useSetReferrer()

  // The referral source is always one of the order's own parties (D19)
  const parties = [
    contract.contact && { id: contract.contact.id, label: `${contract.contact.name} (agent)` },
    contract.secondary_contact && { id: contract.secondary_contact.id, label: `${contract.secondary_contact.name} (second agent)` },
    contract.lender_contact && { id: contract.lender_contact.id, label: `${contract.lender_contact.name} (lender)` },
  ].filter(Boolean) as { id: string; label: string }[]
  const provenance = contract.referrer_source === 'qualia'
    ? 'From Qualia'
    : contract.referrer_source === 'manager' && contract.referrer_set_at
      ? `Set by ${members?.members.find(m => m.id === contract.referrer_set_by)?.name ?? 'a manager'} on ${formatDate(contract.referrer_set_at)}`
      : null

  async function changeReferrer(contactId: string | null) {
    try {
      await setReferrer.mutateAsync({ id: contract.id, contactId })
    } catch {
      toast({ title: 'Could not set referral source', description: 'Please try again.', variant: 'destructive' })
    }
  }

  const statusColor = STATUS_COLOR[contract.status] ?? 'var(--muted)'
  const statusLabel = STATUS_LABEL[contract.status] ?? capitalize(contract.status)
  const title = contract.title || contract.property_address || 'Untitled Contract'

  return (
    <SlideOverPanel onClose={onClose}>
      {/* Header */}
      <div
        style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <FileText size={16} style={{ color: '#c4a574' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.3 }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
              color: statusColor, border: `1px solid ${statusColor}`,
              borderRadius: 4, padding: '1px 7px',
            }}>
              {statusLabel.toUpperCase()}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {capitalize(contract.transaction_type.replace('_', ' '))}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: 30, height: 30, borderRadius: 6, border: 'none',
            backgroundColor: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted)', flexShrink: 0,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Realtors */}
          {(contract.contact || contract.secondary_contact) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {contract.secondary_contact ? 'Realtors' : 'Realtor'}
              </span>
              {[contract.contact, contract.secondary_contact].filter(Boolean).map(rc => (
                <div key={rc!.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, color: 'var(--foreground)' }}>{rc!.name}</span>
                  {rc!.company && (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {rc!.company}</span>
                  )}
                  {contract.referring_contact_id === rc!.id && BROUGHT_BUSINESS}
                </div>
              ))}
            </div>
          )}

          {/* Financing lender */}
          {contract.lender_contact && (
            <Field
              label="Financing Lender"
              value={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {contract.lender_contact.company
                    ? `${contract.lender_contact.name} · ${contract.lender_contact.company}`
                    : contract.lender_contact.name}
                  {contract.referring_contact_id === contract.lender_contact.id && BROUGHT_BUSINESS}
                </span>
              }
            />
          )}

          {/* Referral source (D19) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Referred By
            </span>
            {members?.can_manage && parties.length > 0 ? (
              <select
                value={contract.referring_contact_id ?? ''}
                onChange={e => changeReferrer(e.target.value || null)}
                disabled={setReferrer.isPending}
                style={{ fontSize: 13, height: 34, borderRadius: 6, padding: '0 8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)' }}
              >
                <option value="">No referral source</option>
                {parties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            ) : (
              <span style={{ fontSize: 14, color: contract.referring_contact ? 'var(--foreground)' : 'var(--muted)' }}>
                {contract.referring_contact?.name ?? 'No referral source'}
              </span>
            )}
            {provenance && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{provenance}</span>}
          </div>

          {/* Assignment (D16) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Assigned To
            </span>
            <AssignmentControl contract={contract} members={members} />
          </div>

          {/* Amounts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Purchase Price" value={formatCurrency(contract.amount)} />
            {contract.loan_amount != null && (
              <Field label="Loan Amount" value={formatCurrency(contract.loan_amount)} />
            )}
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Opening Date" value={formatDate(contract.opening_date)} />
            <Field label="Expected Closing" value={formatDate(contract.expected_closing_date)} />
            <Field label="Actual Closing" value={formatDate(contract.actual_closing_date)} />
          </div>

          {/* Address + City */}
          {contract.property_address && (
            <Field label="Property Address" value={contract.property_address} />
          )}
          {contract.city && (
            <Field label="City" value={contract.city} />
          )}

          {/* File number — an imported order's is Qualia's Order Number */}
          {(contract.file_number || contract.external_order_id) && (
            <Field label="File Number" value={contract.file_number ?? contract.external_order_id ?? ''} />
          )}

          {/* Notes */}
          {contract.notes && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Notes
              </span>
              <p style={{ fontSize: 14, color: 'var(--foreground)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {contract.notes}
              </p>
            </div>
          )}

        </div>
      </div>
    </SlideOverPanel>
  )
}
