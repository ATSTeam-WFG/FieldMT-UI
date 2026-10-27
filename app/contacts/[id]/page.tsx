'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Mail, Phone, Building2,
  Utensils, Hand, GraduationCap, Coffee, Gift, Star, Plus,
  Phone as PhoneIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AppShell } from '@/components/app/AppShell'
import { StatusBadge } from '@/components/app/StatusBadge'
import type { ActivityStatus } from '@/components/app/StatusBadge'
import { AICard } from '@/components/app/AICard'
import { ScoreRing } from '@/components/app/ScoreRing'
import ScoreBreakdown from '@/components/app/ScoreBreakdown'
import { useActivityLog } from '@/lib/context/ActivityLogContext'
import { useAddContact } from '@/lib/context/AddContactContext'
import { useContract } from '@/lib/context/ContractContext'
import { useQuery } from '@tanstack/react-query'
import { getContact } from '@/lib/api/contacts'
import type { Contact } from '@/lib/api/contacts'
import type { Contract } from '@/lib/api/contracts'
import { useActivities } from '@/lib/hooks/useActivities'
import { useContracts } from '@/lib/hooks/useContracts'
import type { ActivityRecord } from '@/lib/context/ActivityLogContext'

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  Lunch: Utensils,
  'Pop-by': Hand,
  'CE Class': GraduationCap,
  Coffee: Coffee,
  'Closing Gift': Gift,
  Call: PhoneIcon,
  Sponsorship: Star,
  Other: Plus,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeDays(dateStr: string | null): string {
  if (!dateStr) return 'Not logged'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

function formatActivityDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Card token styles ─────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderTop: '2px solid #c4a574',
  borderRadius: 8,
  padding: 20,
}

interface ContactPageProps {
  params: { id: string }
}

// ── Page ──────────────────────────────────────────────────────────────────────

const CONTRACT_BADGE: Record<string, { label: string; color: string; border: string }> = {
  initiated: { label: 'Initiated', color: 'var(--muted)',  border: 'var(--border)' },
  pending:   { label: 'Pending',   color: '#d97706',       border: '#d97706'       },
  closed:    { label: 'Closed',    color: '#16a34a',       border: '#16a34a'       },
  updated:   { label: 'Updated',   color: '#60a5fa',       border: '#60a5fa'       },
}

function ContactContractBadge({ status }: { status: string }) {
  const cfg = CONTRACT_BADGE[status] ?? { label: status, color: 'var(--muted)', border: 'var(--border)' }
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 20, padding: '0 7px', fontSize: 10, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 4, backgroundColor: 'transparent', whiteSpace: 'nowrap' }}
    >
      {cfg.label}
    </span>
  )
}

export default function ContactPage({ params }: ContactPageProps) {
  const { openLogWithContact, openActivity } = useActivityLog()
  const { openEditContact } = useAddContact()
  const { openContract } = useContract()
  const [showAllActivities, setShowAllActivities] = useState(false)

  const { data: contact, isLoading: contactLoading } = useQuery({
    queryKey: ['contact', params.id],
    queryFn: () => getContact(params.id),
  })
  const { data: activitiesResult, isLoading: activitiesLoading } = useActivities({ contact_id: params.id })
  const { data: contractsResult, isLoading: contractsLoading } = useContracts({ contact_id: params.id })

  const isLoading = contactLoading || activitiesLoading || contractsLoading

  if (isLoading) {
    return (
      <AppShell activeItem="Contacts">
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Loading...</p>
        </div>
      </AppShell>
    )
  }

  // Fallback for not found
  if (!contact) {
    return (
      <AppShell activeItem="Contacts">
        <div style={cardStyle} className="text-center p-8">
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Contact not found.</p>
          <Link
            href="/contacts"
            style={{ fontSize: 13, color: '#c4a574', textDecoration: 'none', marginTop: 12, display: 'inline-block' }}
          >
            ← Back to Contacts
          </Link>
        </div>
      </AppShell>
    )
  }

  // Vendor profile view
  if (contact.type === 'vendor') {
    const sponsor = contact
    return (
      <AppShell activeItem="Contacts">
        <Link href="/contacts" style={{ display: 'inline-block', fontSize: 12, color: 'var(--muted)', textDecoration: 'none', marginBottom: 20 }}>
          ← Contacts
        </Link>

        <div className="flex flex-col md:flex-row" style={{ gap: 24, alignItems: 'flex-start' }}>
          {/* Profile card */}
          <div style={{ ...cardStyle, width: 380, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'var(--surface)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <span style={{ color: 'var(--muted)', fontWeight: 700, fontSize: 18 }}>{sponsor.initials}</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>{sponsor.name}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 4px' }}>{sponsor.job_title ?? 'Vendor'}</p>
              <span style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: 'var(--muted)' }}>
                Vendor
              </span>
            </div>

            <div style={{ height: 1, backgroundColor: 'var(--border)' }} />

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--body)' }}>{sponsor.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--body)' }}>{sponsor.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--body)' }}>{sponsor.company}</span>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sponsor.tags.map((tag: string) => (
                <span key={tag} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: 'var(--body)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Relationship notes */}
            <div style={cardStyle}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 12px' }}>Relationship Notes</p>
              <p style={{ fontSize: 13, color: 'var(--body)', lineHeight: 1.6, margin: 0 }}>
                Vendor relationship managed through the Buckhead Business Association. Co-sponsors quarterly CE classes and networking events.
                Regular check-ins scheduled monthly.
              </p>
            </div>

            {/* Sponsorship history stub */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>Vendor History</p>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>YTD</span>
              </div>
              {[
                { event: 'Q1 Networking Mixer', date: '2026-03-03', amount: 250, status: 'complete' },
                { event: 'CE Class — Jan Cohort', date: '2026-01-18', amount: 500, status: 'complete' },
                { event: 'Holiday Closing Party', date: '2025-12-12', amount: 750, status: 'complete' },
              ].map((item, i, arr) => (
                <div key={item.event} style={{ display: 'flex', alignItems: 'center', height: 48, borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--body)', margin: 0 }}>{item.event}</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{item.date}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#c4a574' }}>${item.amount}</span>
                </div>
              ))}
              <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--body)' }}>Total YTD</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#c4a574' }}>$1,500</span>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  const allActivities: ActivityRecord[] = activitiesResult?.items ?? []
  const visibleActivities = showAllActivities ? allActivities : allActivities.slice(0, 5)

  const contactContracts: Contract[] = contractsResult?.items ?? []

  // Spend breakdown by activity type
  const spendByType: Record<string, number> = {}
  for (const a of allActivities) {
    if (a.spend > 0) {
      spendByType[a.type] = (spendByType[a.type] ?? 0) + a.spend
    }
  }
  const spendCategories = Object.entries(spendByType).filter(([, v]) => v > 0)
  const totalSpend = spendCategories.reduce((sum, [, v]) => sum + v, 0)

  const lastContactedLabel = relativeDays(contact.last_activity_date)

  // ── Profile Header Card ────────────────────────────────────────────────────
  const ProfileHeaderCard = (
    <div style={cardStyle}>
      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#c4a574',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{contact.initials}</span>
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>{contact.name}</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' }}>{contact.job_title ?? ''}</p>
      </div>

      <div style={{ height: 1, backgroundColor: 'var(--border)' }} />

      {/* Contact details */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mail size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--body)' }}>{contact.email}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Phone size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--body)' }}>{contact.phone}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--body)' }}>{contact.company}</span>
        </div>
      </div>

      {/* Tags */}
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {contact.tags.map(tag => (
          <span
            key={tag}
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 11,
              color: 'var(--body)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div style={{ height: 1, backgroundColor: 'var(--border)', marginTop: 16 }} />

      {/* Action buttons */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => openLogWithContact(contact.name)}
          style={{
            width: '100%',
            height: 40,
            backgroundColor: '#c4a574',
            color: '#000',
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Log Activity
        </button>
        <button
          style={{
            width: '100%',
            height: 40,
            backgroundColor: 'transparent',
            color: 'var(--foreground)',
            fontSize: 14,
            border: '1px solid var(--border)',
            borderRadius: 8,
            cursor: 'default',
            opacity: 0.6,
          }}
        >
          Schedule Follow-up
        </button>
        <button
          onClick={() => openEditContact(contact as any)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            fontSize: 13,
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          Edit Contact
        </button>
      </div>
    </div>
  )

  // ── Relationship Score Card ────────────────────────────────────────────────
  // A rep sees their own score for this contact; a manager sees agency health (D17).
  const isAgencyScore = contact.score_scope === 'agency'
  const ScoreCard = (
    <div style={cardStyle}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 16px' }}>
        {isAgencyScore ? 'Agency Health' : 'Your Relationship Score'}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <ScoreRing score={contact.score} size={100} />
      </div>
      {contact.score === null && (
        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', margin: 0 }}>
          {isAgencyScore
            ? `Nobody on your team has logged an activity with ${contact.name} in the last 180 days.`
            : `You haven't logged an activity with ${contact.name} in the last 180 days.`}
        </p>
      )}
      {contact.score_breakdown && (
        <ScoreBreakdown breakdown={contact.score_breakdown} />
      )}
    </div>
  )

  // ── Stats Grid ─────────────────────────────────────────────────────────────
  const StatsGrid = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {[
        { label: 'Total Activities', value: String(allActivities.length) },
        { label: 'Total Spend', value: `$${contact.spend}` },
        { label: 'Last Contact', value: lastContactedLabel },
        { label: 'Activity Rate', value: '—' },
      ].map(({ label, value }) => (
        <div
          key={label}
          style={{
            ...cardStyle,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--muted)',
            }}
          >
            {label}
          </span>
          <span style={{ fontSize: value === '—' ? 14 : 20, fontWeight: 700, color: value === '—' ? 'var(--muted)' : '#c4a574' }}>{value}</span>
        </div>
      ))}
    </div>
  )

  // ── Contracts Tab Card ─────────────────────────────────────────────────────
  const ContractsCard = (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>Contracts</span>
        <span
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          {contactContracts.length}
        </span>
      </div>

      {contactContracts.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>
          No contracts logged for this contact.
        </p>
      ) : (
        <>
          {/* Table header — desktop only */}
          <div
            className="hidden md:grid"
            style={{
              gridTemplateColumns: '110px 1fr 80px 72px 64px',
              gap: 8,
              padding: '0 0 8px',
              borderBottom: '1px solid var(--border)',
              marginBottom: 4,
            }}
          >
            {['FILE #', 'ADDRESS', 'AMOUNT', 'STATUS', 'CLOSING'].map(col => (
              <span key={col} style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: 'var(--muted)' }}>
                {col}
              </span>
            ))}
          </div>

          {contactContracts.map((c, i) => {
            const raw = c.actual_closing_date ?? c.expected_closing_date
            const dateLabel = raw
              ? new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '—'
            const isLast = i === contactContracts.length - 1
            return (
              <div
                key={c.id}
                onClick={() => openContract(c as any)}
                className="hover:bg-[var(--surface)]"
                style={{
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  padding: '8px 0',
                  cursor: 'pointer',
                }}
              >
                {/* Desktop table row */}
                <div
                  className="hidden md:grid"
                  style={{
                    gridTemplateColumns: '110px 1fr 80px 72px 64px',
                    gap: 8,
                    minHeight: 48,
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: 'monospace',
                      letterSpacing: '0.04em',
                      color: 'var(--muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.file_number ?? '—'}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--foreground)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.property_address ?? '—'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#c4a574' }}>
                    ${(c.amount ?? 0).toLocaleString()}
                  </span>
                  <ContactContractBadge status={c.status} />
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{dateLabel}</span>
                </div>

                {/* Mobile card row */}
                <div className="flex flex-col md:hidden" style={{ gap: 6, padding: '4px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.4 }}>
                      {c.property_address?.split(',')[0] ?? '—'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#c4a574' }}>
                        ${(c.amount ?? 0).toLocaleString()}
                      </span>
                      <ContactContractBadge status={c.status} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.04em', color: 'var(--muted)' }}>
                      {c.file_number ?? '—'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{dateLabel}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )

  // ── Activity History Card ──────────────────────────────────────────────────
  const ActivityHistoryCard = (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>Activity History</span>
        <span
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          {allActivities.length}
        </span>
      </div>

      {(contact.colleagues ?? []).map(c => (
        <p key={c.agent_id} style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>
          {c.name} also works with {contact.name} — last activity {relativeDays(c.last_activity_date).toLowerCase()}
        </p>
      ))}

      {allActivities.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>
          No activities logged yet.
        </p>
      ) : (
        <>
          {visibleActivities.map(activity => {
            const Icon = ACTIVITY_ICONS[activity.type] ?? Plus
            return (
              <div
                key={activity.id}
                onClick={() => openActivity(activity as any)}
                className="hover:bg-[var(--surface)]"
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  cursor: 'pointer',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Icon size={16} style={{ color: 'var(--muted)' }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>
                      {activity.type}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {activity.spend > 0 && (
                        <span style={{ fontSize: 12, color: '#c4a574', fontWeight: 600 }}>
                          ${activity.spend}
                        </span>
                      )}
                      <StatusBadge status={activity.status as ActivityStatus} />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {formatActivityDate(activity.date)}
                  </span>
                </div>
              </div>
            )
          })}

          {allActivities.length > 5 && (
            <button
              onClick={() => setShowAllActivities(prev => !prev)}
              style={{
                background: 'none',
                border: 'none',
                color: '#c4a574',
                fontSize: 13,
                cursor: 'pointer',
                padding: '12px 0 0',
                display: 'block',
              }}
            >
              {showAllActivities ? 'Show less' : `Load more (${allActivities.length - 5} more)`}
            </button>
          )}
        </>
      )}
    </div>
  )

  // ── Spend Breakdown Card ───────────────────────────────────────────────────
  const SpendBreakdownCard = (
    <div style={cardStyle}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 16px' }}>
        Spend Breakdown
      </p>

      {spendCategories.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>
          No spend recorded.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {spendCategories.map(([type, amount]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--body)', minWidth: 100 }}>{type}</span>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'var(--surface)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 4,
                      backgroundColor: '#c4a574',
                      width: `${(amount / totalSpend) * 100}%`,
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 48, textAlign: 'right' }}>
                  ${amount}
                </span>
              </div>
            ))}
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--body)' }}>Total</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#c4a574' }}>${contact.spend}</span>
          </div>
        </>
      )}
    </div>
  )

  // ── AI Insight Card ────────────────────────────────────────────────────────
  const AIInsightCard = (
    <AICard label="Insight">
      <p style={{ fontSize: 13, color: 'var(--body)', lineHeight: 1.6, margin: 0 }}>
        {contact.name} likely has 2–3 referrals available in the next 30 days — they respond best to lunches and CE classes.{contact.score !== null && ` Relationship score up ${Math.round(contact.score * 0.13)} pts since January.`}
      </p>
    </AICard>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppShell activeItem="Contacts">
      {/* Back link */}
      <Link
        href="/contacts"
        style={{
          display: 'inline-block',
          fontSize: 12,
          color: 'var(--muted)',
          textDecoration: 'none',
          marginBottom: 20,
        }}
      >
        ← Contacts
      </Link>

      {/* Desktop layout */}
      <div className="hidden md:flex" style={{ gap: 24, alignItems: 'flex-start' }}>
        {/* Left column — 30% */}
        <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ProfileHeaderCard}
          {ScoreCard}
          {StatsGrid}
        </div>

        {/* Right column — 70% */}
        <div style={{ flex: '0 0 calc(70% - 24px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {AIInsightCard}
          {ActivityHistoryCard}
          {SpendBreakdownCard}
          {ContractsCard}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex flex-col md:hidden" style={{ gap: 16 }}>
        {ProfileHeaderCard}
        {ScoreCard}
        {StatsGrid}
        {AIInsightCard}
        {ActivityHistoryCard}
        {SpendBreakdownCard}
        {ContractsCard}
      </div>
    </AppShell>
  )
}
