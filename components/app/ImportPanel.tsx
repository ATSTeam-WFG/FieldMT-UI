'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import {
  X, UploadCloud, FileText, Users, FileSpreadsheet, CheckCircle2, AlertTriangle,
  RotateCcw, ChevronLeft, ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react'
import { SlideOverPanel } from './SlideOverPanel'
import { FieldLabel } from './FieldLabel'
import { ScoreRing } from './ScoreRing'
import { useImportInsights } from '@/lib/hooks/useImports'
import {
  previewImport, commitImport,
  type ImportPlatform, type ImportPlan, type StagedContact, type ContactField,
  type StagedContract, type CommitResult, type FieldChange,
} from '@/lib/api/imports'
import { toast } from '@/lib/hooks/use-toast'
import { BRAND } from '@/lib/brand'

const GOLD = '#c4a574'
const AMBER = '#d97706'
const GREEN = '#16a34a'

// Review groups, the same for contacts and contracts.
type Status = 'new' | 'updated' | 'review' | 'existing'

// tone per status → { text color, bg, border }
const TONE: Record<Status, { c: string; bg: string; bd: string }> = {
  new:           { c: GREEN, bg: 'rgba(22,163,74,0.12)',  bd: 'rgba(22,163,74,0.35)' },
  updated:       { c: 'var(--foreground)', bg: 'var(--surface)', bd: 'var(--border)' },
  review:        { c: AMBER, bg: 'rgba(217,119,6,0.12)',  bd: 'rgba(217,119,6,0.35)' },
  existing:      { c: 'var(--muted)', bg: 'var(--surface)', bd: 'var(--border)' },
}

const CONTACT_LABEL: Partial<Record<Status, string>> = { new: 'New', updated: 'Updated from Qualia', review: 'Possible match', existing: 'Up to date' }
const CONTACT_GROUP: Partial<Record<Status, string>> = { new: 'New contacts', updated: 'Updated from Qualia', review: 'Needs review', existing: 'Already up to date' }
const CONTRACT_GROUP: Record<Status, string> = {
  new: 'New contracts', updated: 'Updated from Qualia',
  review: 'Needs review', existing: 'Already up to date',
}
// Within "Updated from Qualia", orders that closed come first, then cancelled, then other changes.
const CHANGE_RANK = { now_closed: 0, now_cancelled: 1, updated: 2 }

const TRANSACTION_LABEL: Record<StagedContract['transactionType'], string> = {
  purchase: 'Purchase', refinance: 'Refinance', commercial: 'Commercial', other: 'Other',
}
const FIELD_LABEL: Record<string, string> = {
  status: 'Status', transaction_type: 'Transaction type', actual_closing_date: 'Closed on',
  expected_closing_date: 'Close date', opening_date: 'Opened', property_address: 'Address', city: 'City',
  state: 'State', zipcode: 'Zip', county: 'County', underwriter_name: 'Underwriter', amount: 'Amount',
  loan_amount: 'Loan amount', contact: 'Primary agent', secondary_contact: 'Second agent',
  lender_contact: 'Lender', referrer: 'Referred by', company: 'Company', email: 'Email', phone: 'Phone',
  address: 'Address', job_title: 'Title', license_id: 'Licence ID', referrer_source: 'Referrer set by',
}
// Enum values arrive lowercase ("pending"); show them capitalised.
const CAPITALISED = new Set(['status', 'transaction_type', 'referrer_source'])
const shown = (field: string, v: string) => CAPITALISED.has(field) && v ? v.charAt(0).toUpperCase() + v.slice(1) : v

const IMPORTED: { icon: React.ElementType; title: string; desc: string; bullets: { tone: Status; label: string; text: string }[] }[] = [
  {
    icon: FileText, title: 'Contracts',
    desc: 'Each order — open, closed or cancelled — becomes a contract with its status, property, amount and dates.',
    bullets: [
      { tone: 'new', label: 'New', text: 'orders not yet imported, selected to import by default.' },
      { tone: 'updated', label: 'Updated from Qualia', text: `orders that changed since your last import (now closed, now cancelled, new details), selected so ${BRAND.name} stays in step.` },
      { tone: 'existing', label: 'Already up to date', text: 'orders you brought in before that haven\'t changed.' },
    ],
  },
  {
    icon: Users, title: 'Contacts',
    desc: 'The agents, lenders and referral sources on each deal, de-duplicated and linked to their contracts automatically.',
    bullets: [
      { tone: 'new', label: 'New', text: 'people not in your book yet, selected to import by default.' },
      { tone: 'updated', label: 'Updated from Qualia', text: 'contacts you have whose details changed in Qualia. Your old value is kept in their tags.' },
      { tone: 'review', label: 'Needs review', text: 'same name as a contact you already have, so you decide.' },
    ],
  },
]

export interface PlatformCard {
  platform: ImportPlatform
  name: string
  description: string
  icon: React.ElementType
  status: 'active' | 'soon'
}

interface ImportPanelProps {
  platform: PlatformCard
  onClose: () => void
  onCommitted: () => void
}

// ── formatting ──────────────────────────────────────────────────────────────────

const fmtBytes = (n: number) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`
const fmtMoney = (n: number | null) => n == null ? '—' : `$${n.toLocaleString('en-US')}`
function fmtDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Conflict fields are the backend's snake_case names; the staged contact is camelCase.
const CONTACT_KEY: Record<ContactField, 'company' | 'email' | 'phone' | 'address' | 'jobTitle' | 'licenseId'> = {
  company: 'company', email: 'email', phone: 'phone', address: 'address', job_title: 'jobTitle', license_id: 'licenseId',
}

const contactNeedsReview = (c: StagedContact) =>
  c.conflicts.length > 0 || c.possibleDuplicate || !!c.candidateId || c.changes.length > 0

// One compact chip per change. When it scrolls into view the old value is struck through,
// then the new value slides in highlighted.
function Changes({ changes }: { changes: FieldChange[] }) {
  if (!changes.length) return null
  return (
    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {changes.map((ch, i) => (
        <motion.div key={ch.field} initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.8 }}
          transition={{ delayChildren: 0.15 + i * 0.08, staggerChildren: 0.25 }}
          style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, maxWidth: '100%', fontSize: 12, lineHeight: 1.4, padding: '3px 4px 3px 8px', borderRadius: 6, border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
          <span style={{ color: 'var(--muted)' }}>{FIELD_LABEL[ch.field] ?? ch.field}</span>
          <span style={{ position: 'relative', color: 'var(--muted)' }}>
            {shown(ch.field, ch.old) || '—'}
            {ch.old && (
              <motion.span variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }} transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ position: 'absolute', left: 0, right: 0, top: '52%', height: 1, backgroundColor: 'var(--muted)', transformOrigin: 'left' }} />
            )}
          </span>
          <ArrowRight size={11} color="var(--muted)" style={{ flexShrink: 0 }} />
          <motion.span variants={{ hidden: { opacity: 0, x: -4 }, shown: { opacity: 1, x: 0 } }} transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ padding: '1px 6px', borderRadius: 4, backgroundColor: 'rgba(196,165,116,0.16)', color: 'var(--foreground)', fontWeight: 600 }}>
            {shown(ch.field, ch.new)}
          </motion.span>
        </motion.div>
      ))}
    </div>
  )
}

function Notes({ items, color }: { items: string[]; color: string }) {
  if (!items.length) return null
  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map(t => (
        <div key={t} style={{ fontSize: 12, color: 'var(--body)', lineHeight: 1.5 }}>
          <AlertTriangle size={12} color={color} style={{ display: 'inline', marginRight: 5, verticalAlign: '-1px' }} />{t}
        </div>
      ))}
    </div>
  )
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', marginBottom: 14, borderRadius: 8, border: `1px solid ${TONE.review.bd}`, backgroundColor: TONE.review.bg, fontSize: 12, color: 'var(--body)', lineHeight: 1.5 }}>
      <AlertTriangle size={14} color={AMBER} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{children}</span>
    </div>
  )
}

function StatusPill({ status, label }: { status: Status; label: string }) {
  const t = TONE[status]
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap', backgroundColor: t.bg, color: t.c, border: `1px solid ${t.bd}` }}>
      {label}
    </span>
  )
}

function GroupHeader({ label, color, count, collapsed, onToggle }: {
  label: string; color: string; count: number; collapsed: boolean; onToggle: () => void
}) {
  return (
    <button type="button" onClick={onToggle}
      style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 2px', background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: color }} />
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {count}</span>
      {collapsed ? <ChevronDown size={13} color="var(--muted)" style={{ marginLeft: 2 }} /> : <ChevronUp size={13} color="var(--muted)" style={{ marginLeft: 2 }} />}
    </button>
  )
}

// Full-width segmented toggle (matches the Buyer/Seller control in contact creation).
function Segmented({ options, value, onChange }: {
  options: { value: string; label: string }[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex overflow-hidden rounded-[8px]" style={{ border: '1px solid var(--border)', height: 40 }}>
      {options.map((o, i) => {
        const active = value === o.value
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className="flex flex-1 items-center justify-center transition-colors"
            style={{
              fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
              backgroundColor: active ? GOLD : 'var(--surface)', color: active ? '#000' : 'var(--muted)',
              border: 'none', borderRight: i < options.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function groupBy<T>(items: T[], statusOf: (i: T) => Status): { status: Status; items: T[] }[] {
  const order: Status[] = ['new', 'updated', 'review', 'existing']
  return order
    .map(status => ({ status, items: items.filter(i => statusOf(i) === status) }))
    .filter(g => g.items.length > 0)
}

// ── contract card ──────────────────────────────────────────────────────────────

function Role({ label, name, referrer }: { label: string; name: string | null; referrer: boolean }) {
  if (!name) return null
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.7 }}>
      <span style={{ color: 'var(--muted)', width: 84, flexShrink: 0 }}>{label}</span>
      <span style={{ color: referrer ? GOLD : 'var(--body)', fontWeight: 500 }}>{name}</span>
    </div>
  )
}

function ContractCard({ ct, nameOf, onToggle, onAction }: {
  ct: StagedContract
  nameOf: (key: string | null) => string | null
  onToggle: () => void
  onAction: (a: 'skip' | 'update') => void
}) {
  const st = ct.status
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${st === 'review' ? TONE.review.bd : 'var(--border)'}`, backgroundColor: ct.include ? 'var(--surface)' : 'transparent', opacity: ct.include ? 1 : 0.55, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* A row with an error can never be imported, so it can't be selected */}
        <input type="checkbox" checked={ct.include && !ct.errors.length} disabled={ct.errors.length > 0} onChange={onToggle} style={{ marginTop: 3, accentColor: GOLD, cursor: ct.errors.length ? 'not-allowed' : 'pointer', width: 15, height: 15 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>Order #{ct.orderNumber}</span>
                {ct.orderStatus && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, backgroundColor: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>{ct.orderStatus}</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                {[ct.propertyAddress, ct.city, ct.state].filter(Boolean).join(', ') || '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--body)', fontWeight: 500, marginTop: 2 }}>
                {TRANSACTION_LABEL[ct.transactionType]} · {fmtMoney(ct.amount)}{ct.loanAmount != null ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · Financed {fmtMoney(ct.loanAmount)}</span> : null}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(ct.closeDate)}</span>
            </div>
          </div>
          <div style={{ marginTop: 10 }} />
          {/* The referrer is always one of these parties; their name is shown in gold */}
          <Role label="Seller agent" name={nameOf(ct.sellerAgentKey)} referrer={!!ct.referringKey && ct.referringKey === ct.sellerAgentKey} />
          <Role label="Buyer agent" name={nameOf(ct.buyerAgentKey)} referrer={!!ct.referringKey && ct.referringKey === ct.buyerAgentKey} />
          <Role label="Lender" name={nameOf(ct.lenderKey)} referrer={!!ct.referringKey && ct.referringKey === ct.lenderKey} />
          {ct.changes.length > 0 && <div style={{ height: 1, backgroundColor: 'rgba(196,165,116,0.35)', margin: '12px 0 10px' }} />}
          {ct.duplicate && ct.changes.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Accept or skip order updates</div>
          )}
          <Changes changes={ct.changes} />
          <Notes items={[...ct.errors, ...ct.warnings]} color={AMBER} />
          {ct.duplicate && ct.changes.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Segmented
                options={[{ value: 'skip', label: 'Skip' }, { value: 'update', label: 'Accept' }]}
                value={ct.duplicateAction}
                onChange={v => onAction(v as 'skip' | 'update')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── contact card ───────────────────────────────────────────────────────────────

function ContactCard({ c, expanded, onToggleExpand, onToggleInclude, onResolve, onMergeAction }: {
  c: StagedContact
  expanded: boolean
  onToggleExpand: () => void
  onToggleInclude: () => void
  onResolve: (field: ContactField, value: string) => void
  onMergeAction: (v: 'merge' | 'new') => void
}) {
  const st = c.status as Status
  const review = contactNeedsReview(c)
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${st === 'review' ? TONE.review.bd : 'var(--border)'}`, backgroundColor: c.include ? 'var(--surface)' : 'transparent', opacity: c.include ? 1 : 0.55, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <input type="checkbox" checked={c.include} onChange={onToggleInclude} style={{ marginTop: 3, accentColor: GOLD, cursor: 'pointer', width: 15, height: 15 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{c.name}</span>
              {c.type === 'lender' && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, backgroundColor: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>{c.jobTitle || 'Lender'}</span>}
            </div>
            {(review || st === 'review') && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                {review && (
                  <button type="button" onClick={onToggleExpand}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: AMBER, fontSize: 12, fontWeight: 600, padding: 0 }}>
                    <AlertTriangle size={13} /> Review {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}
                {st === 'review' && <StatusPill status={st} label={CONTACT_LABEL[st] ?? ''} />}
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            {[c.company, c.email, c.phone].filter(Boolean).join(' · ') || 'No other details'}
          </div>

          {review && expanded && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {c.candidateId && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--body)', marginBottom: 6, lineHeight: 1.5 }}>
                    You already have <strong>{c.name}</strong> with no email. Is this the same person?
                  </div>
                  <Segmented
                    options={[{ value: 'merge', label: 'Update existing' }, { value: 'new', label: 'Create new' }]}
                    value={c.mergeAction}
                    onChange={v => onMergeAction(v as 'merge' | 'new')}
                  />
                </div>
              )}
              {c.changes.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--body)' }}>New from Qualia</div>
                  <Changes changes={c.changes} />
                </div>
              )}
              {c.possibleDuplicate && (
                <div style={{ fontSize: 12, color: 'var(--body)', lineHeight: 1.5 }}>
                  <AlertTriangle size={12} color={AMBER} style={{ display: 'inline', marginRight: 5, verticalAlign: '-1px' }} />
                  A contact named <strong>{c.name}</strong> already exists.
                </div>
              )}
              {/* Creating a new person leaves the existing contact alone, so its values aren't a choice */}
              {c.conflicts.filter(cf => !(cf.existing && c.candidateId && c.mergeAction === 'new')).map(cf => {
                const what = (FIELD_LABEL[cf.field] ?? cf.field).toLowerCase()
                // A fixed order, so the options don't swap places when one is picked: existing, then new
                const options = [cf.kept, cf.alternate].sort((a, b) =>
                  cf.existing ? Number(a !== cf.existing) - Number(b !== cf.existing) : a.localeCompare(b))
                return (
                  <div key={cf.field}>
                    <div style={{ fontSize: 12, color: 'var(--body)', marginBottom: 6 }}>
                      {cf.existing ? `Qualia has a different ${what} — keep which one?` : `Qualia lists two ${what} values — keep which one?`}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {options.map(v => {
                        const active = c[CONTACT_KEY[cf.field]] === v
                        const ours = !!cf.existing && v === cf.existing
                        return (
                          <button key={v} type="button" onClick={() => onResolve(cf.field, v)}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, textAlign: 'left',
                              padding: '6px 12px', borderRadius: 6, cursor: 'pointer', minWidth: 140, maxWidth: '100%',
                              border: active ? `1px solid ${GOLD}` : '1px solid var(--border)',
                              background: active ? 'rgba(196,165,116,0.12)' : 'var(--card)',
                            }}>
                            {/* Two values from the file are both new, so only Qualia-vs-ours gets labels */}
                            {cf.existing && (
                              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                                {ours ? 'Existing' : 'New'}
                              </span>
                            )}
                            <span style={{ fontSize: 12, color: active ? GOLD : 'var(--body)', fontWeight: active ? 600 : 400, overflowWrap: 'anywhere' }}>{v}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── delta summary (D20) ────────────────────────────────────────────────────────

function Tile({ value, label }: { value: number; label: string }) {
  const on = value > 0
  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${on ? GOLD : 'var(--border)'}`, minWidth: 0 }}>
      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, color: on ? GOLD : 'var(--muted)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

/** What this file changes, as tiles: orders on one row, contacts on the next (D20). */
function DeltaTiles({ plan }: { plan: ImportPlan }) {
  const ct = plan.contracts
  const rows: { label: string; tiles: [number, string][] }[] = [
    { label: 'CONTRACTS', tiles: [
      [ct.filter(c => c.status === 'new').length, 'New'],
      [ct.filter(c => c.changeKind === 'now_closed').length, 'Now closed'],
      [ct.filter(c => c.changeKind === 'now_cancelled').length, 'Cancelled'],
      [ct.filter(c => c.changeKind === 'updated').length, 'Other updates'],
    ] },
    { label: 'CONTACTS', tiles: [
      [plan.contacts.filter(c => c.status === 'new').length, 'New'],
      [plan.contacts.filter(c => c.status === 'updated').length, 'Updated'],
      [plan.contacts.filter(c => c.status === 'review').length, 'Need review'],
    ] },
  ]
  const nothing = rows.every(r => r.tiles.every(([v]) => v === 0))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {nothing && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>Everything is already up to date</div>}
      <TileRows rows={rows} />
    </div>
  )
}

/** Labelled rows of tiles on one 4-column grid, so tiles line up across rows. */
/** `fill`: each row's tiles share the full width; otherwise rows align on a 4-column grid. */
function TileRows({ rows, fill = false }: { rows: { label: string; tiles: [number, string][] }[]; fill?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map(r => (
        <div key={r.label}>
          <div style={{ marginBottom: 6 }}><FieldLabel>{r.label}</FieldLabel></div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fill ? r.tiles.length : 4}, minmax(0, 1fr))`, gap: 8 }}>
            {r.tiles.map(([v, l]) => <Tile key={l} value={v} label={l} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function Legend() {
  const items: React.ReactNode[] = [
    <><span style={{ color: GOLD, fontWeight: 600 }}>Gold name</span> — the contact who referred the order.</>,
    <>Qualia&apos;s changes show the old value struck through and the new one highlighted.</>,
    <>Where a contact has two values, the one you don&apos;t keep is saved to its tags — nothing is lost.</>,
  ]
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((t, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, lineHeight: 1.45, color: 'var(--muted)' }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--muted)', marginTop: 7, flexShrink: 0 }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

// ── first-import insight (D20) ───────────────────────────────────────────────────

function InsightStep() {
  const { data, isLoading } = useImportInsights(true)
  if (isLoading || !data) {
    return <div style={{ fontSize: 13, color: 'var(--muted)' }}>Reading your book of business…</div>
  }
  const pct = (share: number) => `${Math.round(share * 100)}%`
  // Before anyone has logged an activity, every source would read Dormant and "nobody works
  // them" — true of all of them, so it says nothing. Show the sources plainly instead.
  const worked = data.teamHasActivity
  return (
    <>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>Who sends you business</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 18 }}>
        Your top referral sources across {data.totalOrders} imported order{data.totalOrders === 1 ? '' : 's'}{worked ? ', and how your team is looking after them' : ''}.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
        {data.topSources.map(src => (
          <div key={src.contactId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
            {worked && <div style={{ flexShrink: 0 }}><ScoreRing score={src.health} size={56} strokeWidth={5} compact /></div>}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>
                <strong>{src.name}</strong> sent {src.orders} of your {data.totalOrders} orders ({pct(src.share)}).
              </div>
              {worked && src.dormantForEveryone && (
                <div style={{ fontSize: 12, color: AMBER, marginTop: 2 }}>
                  Nobody on your team has logged an activity with {src.name} in the last 6 months.
                </div>
              )}
            </div>
          </div>
        ))}
        {data.topSources.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>None of these orders has a referral source yet.</div>
        )}
        {!worked && data.topSources.length > 0 && (
          <div style={{ fontSize: 13, color: 'var(--body)', marginTop: 4 }}>
            Your team hasn&apos;t logged any activity yet. These are the relationships to start with.
          </div>
        )}
      </div>
      {data.unattributed > 0 && (
        <Banner>
          {data.unattributed} of {data.totalOrders} orders have no referral source in Qualia.{' '}
          <Link href="/contracts?referrer=none" style={{ color: GOLD, fontWeight: 600 }}>You can set one from the Contracts page.</Link>
        </Banner>
      )}
    </>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

export function ImportPanel({ platform, onClose, onCommitted }: ImportPanelProps) {
  const Icon = platform.icon
  const inputRef = useRef<HTMLInputElement>(null)

  const queryClient = useQueryClient()
  const [step, setStep] = useState<'upload' | 'review' | 'insight' | 'done'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [result, setResult] = useState<CommitResult | null>(null)
  const [openReview, setOpenReview] = useState<Set<string>>(new Set())
  // Unchanged rows start collapsed — a routine re-import should take seconds to confirm.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['contract-existing', 'contact-existing']))

  function pickFile(f: File | null) {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) {
      toast({ title: 'Unsupported file', description: 'Please upload a .csv export.', variant: 'destructive' })
      return
    }
    setFile(f)
  }

  async function handleReview() {
    if (!file) return
    setLoading(true)
    try {
      const p = await previewImport(file, platform.platform)
      if (p.fileErrors.length) {
        toast({ title: 'Could not read file', description: p.fileErrors[0], variant: 'destructive' })
        return
      }
      setPlan(p)
      setStep('review')
    } catch {
      toast({ title: 'Import failed', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!plan) return
    setLoading(true)
    try {
      const res = await commitImport(plan)
      setResult(res)
      // An agency's first import gets the insight screen before the usual summary (D20)
      setStep(res.firstImport && res.contractsImported > 0 ? 'insight' : 'done')
      queryClient.invalidateQueries({ queryKey: ['import-history'] })
      queryClient.invalidateQueries({ queryKey: ['import-insights'] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      onCommitted()
      toast({
        title: 'Import complete',
        description: `${res.contractsImported} new, ${res.contractsUpdated} updated.`,
      })
    } catch {
      toast({ title: 'Import failed', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setFile(null); setPlan(null); setResult(null); setStep('upload'); setOpenReview(new Set())
    if (inputRef.current) inputRef.current.value = ''
  }

  // plan editors
  const toggleContact = (key: string) => setPlan(p => p && ({ ...p, contacts: p.contacts.map(c => c.key === key ? { ...c, include: !c.include } : c) }))
  const toggleContract = (key: string) => setPlan(p => p && ({ ...p, contracts: p.contracts.map(c => c.key === key ? { ...c, include: !c.include } : c) }))
  const setDupAction = (key: string, a: 'skip' | 'update') => setPlan(p => p && ({ ...p, contracts: p.contracts.map(c => c.key === key ? { ...c, duplicateAction: a, include: true } : c) }))
  const setMergeAction = (key: string, v: 'merge' | 'new') => setPlan(p => p && ({ ...p, contacts: p.contacts.map(c => c.key === key ? { ...c, mergeAction: v } : c) }))
  const resolveConflict = (contactKey: string, field: ContactField, value: string) =>
    setPlan(p => p && ({
      ...p, contacts: p.contacts.map(c => {
        if (c.key !== contactKey) return c
        return {
          ...c, [CONTACT_KEY[field]]: value,
          conflicts: c.conflicts.map(cf => cf.field === field ? { ...cf, kept: value, alternate: value === cf.kept ? cf.alternate : cf.kept } : cf),
        }
      }),
    }))
  const toggleExpand = (key: string) => setOpenReview(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const toggleGroup = (key: string) => setCollapsed(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const nameOf = (key: string | null) => key ? (plan?.contacts.find(c => c.key === key)?.name ?? null) : null

  const contractsIncl = plan?.contracts.filter(c => c.include && !c.errors.length && !(c.duplicate && c.duplicateAction === 'skip')) ?? []
  // Contacts count too: a re-import that only updates contact details is still worth confirming.
  const contactsIncl = plan?.contacts.filter(c => c.include && c.status !== 'existing') ?? []
  const toCommit = contractsIncl.length + contactsIncl.length
  const contactGroups = plan ? groupBy(plan.contacts, c => c.status) : []
  const contractGroups = plan
    ? groupBy([...plan.contracts].sort((a, b) => CHANGE_RANK[a.changeKind ?? 'updated'] - CHANGE_RANK[b.changeKind ?? 'updated']), c => c.status)
    : []

  return (
    <SlideOverPanel onClose={onClose} width={780}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={20} color="var(--muted)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>Import from {platform.name}</span>
            <p className="hidden md:block" style={{ fontSize: 12, color: 'var(--muted)', margin: '3px 0 0', lineHeight: 1.4 }}>
              Import orders and referral contacts from a {platform.name} CSV export to your agency.
            </p>
          </div>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', backgroundColor: 'var(--surface)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} color="var(--muted)" />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px' }}>
        {step === 'upload' && (
          <>
            <div style={{ marginBottom: 10 }}><FieldLabel>SOURCE FILE</FieldLabel></div>
            <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => pickFile(e.target.files?.[0] ?? null)} />
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0] ?? null) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '32px 20px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                border: `1.5px dashed ${dragging ? GOLD : 'var(--border)'}`,
                backgroundColor: dragging ? 'rgba(196,165,116,0.06)' : 'var(--surface)', transition: 'border-color 0.15s, background 0.15s',
              }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {file ? <FileSpreadsheet size={20} color={GOLD} /> : <UploadCloud size={20} color="var(--muted)" />}
              </div>
              {file ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', wordBreak: 'break-all' }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtBytes(file.size)} · click to replace</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>Drop your CSV here, or click to browse</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{platform.name} order export · .csv only</div>
                </>
              )}
            </div>

            <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '20px 0' }} />
            <div style={{ marginBottom: 10 }}><FieldLabel>WHAT GETS IMPORTED</FieldLabel></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {IMPORTED.map(r => (
                <div key={r.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 8, backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <r.icon size={16} color={GOLD} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }}>{r.desc}</div>
                    <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {r.bullets.map(b => (
                        <li key={b.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, lineHeight: 1.45, color: 'var(--muted)' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: TONE[b.tone].c, marginTop: 5, flexShrink: 0 }} />
                          <span><strong style={{ color: TONE[b.tone].c, fontWeight: 600 }}>{b.label}:</strong> {b.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ margin: '20px 0 10px' }}><FieldLabel>READING THE PREVIEW</FieldLabel></div>
            <div style={{ padding: '14px 16px', borderRadius: 8, backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Legend />
            </div>
          </>
        )}

        {step === 'review' && plan && (
          <>
            {plan.legacyFormat && (
              <Banner>This looks like an older export. Statuses were not included, so every order was imported as closed.</Banner>
            )}
            {plan.skippedRows > 0 && (
              <Banner>{plan.skippedRows} row{plan.skippedRows === 1 ? '' : 's'} had no order number and {plan.skippedRows === 1 ? 'was' : 'were'} skipped.</Banner>
            )}
            {/* summary — what this file changes, first (D20) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 14, minWidth: 0 }}>
              <FileSpreadsheet size={14} color="var(--muted)" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--body)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.fileName}</span>
              <span style={{ flexShrink: 0 }}>· {plan.contracts.length} orders · {plan.contacts.length} contacts</span>
            </div>
            <div style={{ marginBottom: 24 }}><DeltaTiles plan={plan} /></div>

            {/* CONTRACTS first */}
            <div style={{ marginBottom: 12 }}><FieldLabel>CONTRACTS ({plan.contracts.length})</FieldLabel></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 26 }}>
              {contractGroups.map(g => {
                const gkey = `contract-${g.status}`
                const isCollapsed = collapsed.has(gkey)
                return (
                  <div key={g.status} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <GroupHeader label={CONTRACT_GROUP[g.status]} color={TONE[g.status].c} count={g.items.length} collapsed={isCollapsed} onToggle={() => toggleGroup(gkey)} />
                    {!isCollapsed && g.items.map(ct => (
                      <ContractCard key={ct.key} ct={ct} nameOf={nameOf} onToggle={() => toggleContract(ct.key)} onAction={a => setDupAction(ct.key, a)} />
                    ))}
                  </div>
                )
              })}
            </div>

            {/* CONTACTS second */}
            <div style={{ marginBottom: 12 }}><FieldLabel>CONTACTS ({plan.contacts.length})</FieldLabel></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {contactGroups.map(g => {
                const gkey = `contact-${g.status}`
                const isCollapsed = collapsed.has(gkey)
                // within a group, push the ones needing a decision to the end
                const items = [...g.items].sort((a, b) => Number(contactNeedsReview(a)) - Number(contactNeedsReview(b)))
                return (
                  <div key={g.status} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <GroupHeader label={CONTACT_GROUP[g.status] ?? g.status} color={TONE[g.status].c} count={g.items.length} collapsed={isCollapsed} onToggle={() => toggleGroup(gkey)} />
                    {!isCollapsed && items.map(c => (
                      <ContactCard
                        key={c.key} c={c} expanded={openReview.has(c.key)}
                        onToggleExpand={() => toggleExpand(c.key)}
                        onToggleInclude={() => toggleContact(c.key)}
                        onResolve={(f, v) => resolveConflict(c.key, f, v)}
                        onMergeAction={v => setMergeAction(c.key, v)}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {step === 'insight' && <InsightStep />}

        {step === 'done' && result && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <CheckCircle2 size={22} color={GREEN} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>Import complete</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{plan?.fileName}</div>
              </div>
            </div>
            {result.errors > 0 && (
              <Banner>{result.errors} row{result.errors === 1 ? '' : 's'} had errors and {result.errors === 1 ? 'was' : 'were'} not imported.</Banner>
            )}
            <TileRows fill rows={[
              { label: 'CONTRACTS', tiles: [[result.contractsImported, 'Imported'], [result.contractsUpdated, 'Updated'], [result.contractsSkipped, 'Skipped']] },
              { label: 'CONTACTS', tiles: [[result.contactsCreated, 'Created'], [result.contactsUpdated, 'Updated'], [result.contactsSkipped, 'Skipped']] },
            ]} />
            <button onClick={reset} style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
              <RotateCcw size={13} /> Import another file
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        {step === 'upload' && (
          <button onClick={handleReview} disabled={!file || loading}
            style={{ flex: 1, height: 44, borderRadius: 8, border: 'none', cursor: !file || loading ? 'not-allowed' : 'pointer', background: !file ? 'var(--surface)' : GOLD, color: !file ? 'var(--muted)' : '#000', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? 'Reading file…' : 'Review Import'}
          </button>
        )}
        {step === 'review' && (
          <>
            <button onClick={() => setStep('upload')} style={{ height: 44, padding: '0 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChevronLeft size={15} /> Back
            </button>
            {/* Enabled even with nothing to apply: a no-change import still counts as the last import (D20) */}
            <button onClick={handleConfirm} disabled={loading}
              style={{ flex: 1, height: 44, borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: GOLD, color: '#000', fontSize: 13, fontWeight: 600 }}>
              {loading ? 'Importing…' : `Confirm Import${toCommit ? ` (${toCommit})` : ''}`}
            </button>
          </>
        )}
        {step === 'insight' && (
          <button onClick={() => setStep('done')} style={{ flex: 1, height: 44, borderRadius: 8, border: 'none', cursor: 'pointer', background: GOLD, color: '#000', fontSize: 13, fontWeight: 600 }}>
            Continue
          </button>
        )}
        {step === 'done' && (
          <button onClick={onClose} style={{ flex: 1, height: 44, borderRadius: 8, border: 'none', cursor: 'pointer', background: GOLD, color: '#000', fontSize: 13, fontWeight: 600 }}>
            Done
          </button>
        )}
      </div>
    </SlideOverPanel>
  )
}
