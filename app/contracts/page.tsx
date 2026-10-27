'use client'

import { Suspense } from 'react'
import { useState, useEffect, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, FileText, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app/AppShell'
import { FilterSearchBar, FilterDropdown } from '@/components/app/FilterBar'
import type { FilterOption } from '@/components/app/FilterBar'
import { SkeletonRows } from '@/components/app/SkeletonRows'
import { ContractDetailPanel } from '@/components/app/ContractDetailPanel'
import { useContract } from '@/lib/context/ContractContext'
import { useContracts } from '@/lib/hooks/useContracts'
import { useAgencyMembers } from '@/lib/hooks/useMyAgency'
import { AssignmentControl } from '@/components/app/AssignmentControl'
import { AcceptRecommendationsDialog } from '@/components/app/AcceptRecommendationsDialog'
import { getContract, type Contract } from '@/lib/api/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

const TYPE_FILTERS    = ['All', 'Regular', 'Refinance', 'Commercial'] as const
const STATUS_FILTERS  = ['All', 'Opened', 'Closed', 'Cancelled'] as const
const ASSIGN_FILTERS  = ['All', 'Unassigned', 'Mine'] as const
const REFERRAL_FILTERS = ['All', 'No referral source'] as const

type TypeFilter   = typeof TYPE_FILTERS[number]
type StatusFilter = typeof STATUS_FILTERS[number]
type AssignFilter = typeof ASSIGN_FILTERS[number]
type ReferralFilter = typeof REFERRAL_FILTERS[number]

const TYPE_OPTIONS:   FilterOption<TypeFilter>[]   = TYPE_FILTERS.map(t => ({ value: t, label: t }))
const STATUS_OPTIONS: FilterOption<StatusFilter>[] = STATUS_FILTERS.map(s => ({ value: s, label: s }))
const ASSIGN_OPTIONS: FilterOption<AssignFilter>[] = ASSIGN_FILTERS.map(s => ({ value: s, label: s }))
const REFERRAL_OPTIONS: FilterOption<ReferralFilter>[] = REFERRAL_FILTERS.map(s => ({ value: s, label: s }))

// Map display labels to API values
const TYPE_API_MAP: Record<string, string> = {
  Regular:    'purchase',
  Refinance:  'refinance',
  Commercial: 'commercial',
}
const STATUS_API_MAP = { Opened: 'open', Closed: 'closed', Cancelled: 'cancelled' } as const

const PAGE_SIZES = [10, 15, 20] as const

// Imported orders carry Qualia's Order Number, which is the title file number
const fileNumberOf = (c: Contract) => c.file_number ?? c.external_order_id ?? '—'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US')
}

function closingDate(contract: Contract): string {
  const raw = contract.actual_closing_date ?? contract.expected_closing_date
  if (!raw) return '—'
  const [y, m, d] = raw.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const isOpen = (c: Contract) => c.status !== 'closed' && c.status !== 'cancelled'

/** "in 3 weeks" / "6 days past close" — only for an order that is still open */
function closingRelative(contract: Contract): string | null {
  // An unconfirmed order reads as closed, so it shows just its date
  if (!isOpen(contract) || contract.closed_unconfirmed || !contract.expected_closing_date) return null
  const [y, m, d] = contract.expected_closing_date.split('-').map(Number)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} past close`
  if (days === 0) return 'today'
  if (days < 14) return `in ${days} day${days === 1 ? '' : 's'}`
  return `in ${Math.round(days / 7)} weeks`
}

// ── Contract Status Badge ─────────────────────────────────────────────────────

// Four states. Amber is reserved for "closed, unconfirmed" (D18); cancelled recedes.
const BADGE = {
  open:        { label: 'Open',                color: 'var(--body)',    border: 'var(--border)',  bg: 'transparent' },
  closed:      { label: 'Closed',              color: 'var(--success)', border: 'transparent',    bg: 'color-mix(in srgb, var(--success) 12%, transparent)' },
  unconfirmed: { label: 'Closed',              color: 'var(--warning)', border: 'var(--warning)', bg: 'transparent' },
  cancelled:   { label: 'Cancelled',           color: 'var(--muted)',   border: 'var(--border)',  bg: 'transparent' },
}

function ContractBadge({ contract }: { contract: Contract }) {
  const cfg = contract.closed_unconfirmed ? BADGE.unconfirmed
    : contract.status === 'closed' ? BADGE.closed
    : contract.status === 'cancelled' ? BADGE.cancelled
    : BADGE.open
  return (
    <span
      className="inline-flex items-center justify-center rounded-[4px]"
      title={contract.closed_unconfirmed ? 'Not confirmed in Qualia — still pending 14+ days after the expected close, so counted as closed' : undefined}
      style={{
        height: 22,
        padding: '0 8px',
        fontSize: 11,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        backgroundColor: cfg.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  )
}

// ── Type: plain text — only status is a badge ─────────────────────────────────

const TYPE_DISPLAY: Record<string, string> = {
  purchase:   'Regular',
  refinance:  'Refinance',
  commercial: 'Commercial',
}

function TypeLabel({ type }: { type: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
      {TYPE_DISPLAY[type] ?? type}
    </span>
  )
}

// ── Contact cell: every party on hover ────────────────────────────────────────

function ContactCell({ contract }: { contract: Contract }) {
  const [open, setOpen] = useState(false)
  const parties = ([
    ['Seller agent', contract.contact],
    ['Buyer agent', contract.secondary_contact],
    ['Lender', contract.lender_contact],
  ] as const).filter(([, p]) => p) as [string, NonNullable<Contract['secondary_contact']>][]
  // The source of business leads — it's who the recommendation's evidence is about
  parties.sort(([, a], [, b]) => Number(b.id === contract.referring_contact_id) - Number(a.id === contract.referring_contact_id))
  const [first, ...rest] = parties
  const firstIsSource = first?.[1].id === contract.referring_contact_id
  if (!first) return <span style={{ fontSize: 13, color: 'var(--muted)' }}>—</span>
  return (
    <div
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      tabIndex={rest.length ? 0 : -1}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, outline: 'none' }}
    >
      <span className="truncate" style={{ fontSize: 13, color: 'var(--body)' }}>
        <span style={{ color: firstIsSource ? 'var(--gold)' : undefined }}>{first[1].name}</span>
        {firstIsSource && <span className="sr-only"> (source of business)</span>}
        {rest.length > 0 && <span style={{ color: 'var(--muted)' }}> +{rest.length}</span>}
      </span>
      <span className="truncate" style={{ fontSize: 11, color: 'var(--muted)' }}>
        {first[1].company ?? ''}
      </span>
      {open && rest.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 30, minWidth: 260, maxWidth: 340,
          padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {parties.map(([role, p]) => {
            const referrer = p.id === contract.referring_contact_id
            return (
              <div key={role} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {role}{referrer ? ' · referred this order' : ''}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: referrer ? 'var(--gold)' : 'var(--foreground)' }}>{p.name}</span>
                {p.company && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.company}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatSkeleton() {
  return <span className="inline-block animate-pulse rounded-[4px] align-middle" style={{ width: 40, height: 14, background: 'var(--surface)' }} />
}

// ── Pager ─────────────────────────────────────────────────────────────────────

function Pager({ page, size, total, onPage, onSize }: {
  page: number; size: number; total: number; onPage: (p: number) => void; onSize: (s: number) => void
}) {
  const last = Math.max(1, Math.ceil(total / size))
  const from = total ? (page - 1) * size + 1 : 0
  const to = Math.min(page * size, total)
  const btn = (disabled: boolean): React.CSSProperties => ({
    height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)',
    color: disabled ? 'var(--muted)' : 'var(--foreground)', opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
  })
  return (
    <div className="flex flex-wrap items-center justify-between" style={{ gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
      <div className="flex items-center" style={{ gap: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{from}–{to} of {total.toLocaleString('en-US')}</span>
        <div className="flex items-center" role="group" aria-label="Rows per page" style={{ gap: 2 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 4 }}>Rows</span>
          {PAGE_SIZES.map(n => (
            <button key={n} type="button" aria-pressed={n === size} onClick={() => onSize(n)}
              style={{
                height: 26, minWidth: 30, padding: '0 6px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${n === size ? 'var(--gold)' : 'transparent'}`,
                color: n === size ? 'var(--foreground)' : 'var(--muted)', background: 'none',
                fontWeight: n === size ? 600 : 400,
              }}>
              {n}
            </button>
          ))}
        </div>
      </div>
      {last > 1 && (
        <div className="flex items-center" style={{ gap: 8 }}>
          <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} style={btn(page <= 1)}>
            <ChevronLeft size={14} /> Previous
          </button>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {page} of {last}</span>
          <button type="button" disabled={page >= last} onClick={() => onPage(page + 1)} style={btn(page >= last)}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ContractsPageContent() {
  const { openLog, openContract } = useContract()
  const searchParams = useSearchParams()
  const { data: members } = useAgencyMembers()

  const [selectedType,   setSelectedType]   = useState<TypeFilter>('All')
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('All')
  const [selectedAssign, setSelectedAssign] = useState<AssignFilter>('All')
  const [selectedReferral, setSelectedReferral] = useState<ReferralFilter>(
    searchParams.get('referrer') === 'none' ? 'No referral source' : 'All'
  )
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0])
  const [detailContract, setDetailContract] = useState<Contract | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])
  // Any change to what's matched starts again from the first page
  useEffect(() => { setPage(1) }, [selectedType, selectedStatus, selectedAssign, selectedReferral, debouncedSearch, pageSize])

  // Filtering, search, paging and the summary figures are all server-side, so they cover
  // every contract in the agency, not just the rows loaded
  const { data, isLoading, isError, refetch } = useContracts({
    page,
    page_size: pageSize,
    assigned: selectedAssign === 'Unassigned' ? 'unassigned' : selectedAssign === 'Mine' ? 'mine' : undefined,
    referrer: selectedReferral === 'No referral source' ? 'none' : undefined,
    status_group: selectedStatus === 'All' ? undefined : STATUS_API_MAP[selectedStatus],
    transaction_type: selectedType === 'All' ? undefined : TYPE_API_MAP[selectedType],
    search: debouncedSearch || undefined,
  }, { keepPrevious: true })
  const contracts = useMemo(() => data?.items ?? [], [data])
  const total = data?.total ?? 0
  const filtered = selectedType !== 'All' || selectedStatus !== 'All' || selectedAssign !== 'All'
    || selectedReferral !== 'All' || !!debouncedSearch

  // Open detail panel when ?view={id} is present (e.g. from a notification) — once per id,
  // so a refetch after an assignment doesn't reopen a panel the user closed
  const [openedViewId, setOpenedViewId] = useState<string | null>(null)
  useEffect(() => {
    const viewId = searchParams.get('view')
    if (!viewId || viewId === openedViewId) return
    setOpenedViewId(viewId)
    // The contract may be on another page, so fetch it rather than look for it in this one
    const found = contracts.find(c => c.id === viewId)
    if (found) setDetailContract(found)
    else getContract(viewId).then(setDetailContract).catch(() => {})
  }, [searchParams, contracts, openedViewId])

  // Unassigned rows on this page that carry a recommendation — "Accept all" (D16)
  const recommendable = contracts.filter(c => !c.assigned_rep_id && c.recommendation)
  const [confirmAccept, setConfirmAccept] = useState(false)

  return (
    <AppShell activeItem="Contracts">
      <div className="flex flex-col" style={{ gap: 0 }}>

        {/* ── Page header ───────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col" style={{ gap: 4 }}>
            <h1
              className="font-semibold leading-tight"
              style={{ fontSize: 22, color: 'var(--foreground)' }}
            >
              Contracts
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>
              All logged contracts · MTD
            </p>
          </div>

          <button
            onClick={openLog}
            className="flex shrink-0 items-center gap-1.5 rounded-[8px] font-semibold transition-opacity hover:opacity-90 active:opacity-80 h-9 px-3.5 text-[13px] md:h-11 md:px-5 md:text-[14px]"
            style={{
              backgroundColor: 'var(--gold)',
              color: '#000000',
              border: 'none',
            }}
          >
            <Plus size={14} color="#000000" />
            Add Contract
          </button>
        </div>

        {/* ── Filter bar ───────────────────────────────── */}
        <div className="flex flex-col" style={{ gap: 10, marginTop: 16 }}>
          <FilterSearchBar value={search} onChange={setSearch} placeholder="Search by contact, address or file number…" />
          <div className="flex gap-2">
            <FilterDropdown className="flex-1" label="TYPE"   options={TYPE_OPTIONS}   value={selectedType}   onChange={setSelectedType} />
            <FilterDropdown className="flex-1" label="STATUS" options={STATUS_OPTIONS} value={selectedStatus} onChange={setSelectedStatus} />
            <FilterDropdown className="flex-1" label="ASSIGNED" options={ASSIGN_OPTIONS} value={selectedAssign} onChange={setSelectedAssign} />
            <FilterDropdown className="flex-1" label="REFERRAL" options={REFERRAL_OPTIONS} value={selectedReferral} onChange={setSelectedReferral} />
          </div>
        </div>

        {/* ── Summary stats row ────────────────────────── */}
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 md:gap-x-6"
          style={{ marginTop: 16 }}
        >
          <div className="flex items-baseline gap-1.5">
            <span
              className="font-semibold text-sm md:text-[15px]"
              style={{ color: 'var(--gold)' }}
            >
              {data ? total.toLocaleString('en-US') : <StatSkeleton />}
            </span>
            <span className="text-xs md:text-[13px]" style={{ color: 'var(--muted)' }}>contracts</span>
          </div>

          <div className="hidden md:block" style={{ width: 1, height: 14, backgroundColor: 'var(--border)' }} />

          <div className="flex items-baseline gap-1.5">
            <span
              className="font-semibold text-sm md:text-[15px]"
              style={{ color: 'var(--gold)' }}
            >
              {data ? formatCurrency(data.total_value) : <StatSkeleton />}
            </span>
            <span className="text-xs md:text-[13px]" style={{ color: 'var(--muted)' }}>total value</span>
          </div>

          <div className="hidden md:block" style={{ width: 1, height: 14, backgroundColor: 'var(--border)' }} />

          <div className="flex items-baseline gap-1.5">
            <span
              className="font-semibold text-sm md:text-[15px]"
              style={{ color: 'var(--gold)' }}
            >
              {data ? data.closing_this_month : <StatSkeleton />}
            </span>
            <span className="text-xs md:text-[13px]" style={{ color: 'var(--muted)' }}>closing this month</span>
          </div>
        </div>

        {/* ── Contracts table card ─────────────────────── */}
        <div className="app-card" style={{ marginTop: 16 }}>

          {/* Card header */}
          <div
            className="flex items-center justify-between"
            style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center" style={{ gap: 8 }}>
              <span
                className="font-semibold"
                style={{ fontSize: 14, color: 'var(--foreground)' }}
              >
                Contract Log
              </span>
              <span
                className="flex items-center justify-center rounded-full font-medium"
                style={{
                  height: 20,
                  minWidth: 20,
                  paddingLeft: 6,
                  paddingRight: 6,
                  fontSize: 11,
                  backgroundColor: 'var(--surface)',
                  color: 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {data ? total.toLocaleString('en-US') : '–'}
              </span>
            </div>
            {members?.can_manage && recommendable.length > 0 && (
              <button onClick={() => setConfirmAccept(true)}
                className="rounded-[8px] font-semibold border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black focus-visible:bg-[var(--gold)] focus-visible:text-black focus:outline-none transition-colors"
                style={{ height: 32, padding: '0 12px', fontSize: 12, background: 'none', cursor: 'pointer' }}>
                Accept recommendations
              </button>
            )}
          </div>

          {/* Desktop table header */}
          <div
            className="hidden md:flex items-center"
            style={{
              height: 32,
              padding: '0 20px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--background)',
            }}
          >
            {([
              { label: 'FILE NUMBER',  flex: 1.1 },
              { label: 'ADDRESS',      flex: 2 },
              { label: 'CONTACT',      flex: 1.5 },
              { label: 'AMOUNT',       flex: 1, right: true },
              { label: 'TYPE',         flex: 0.7 },
              { label: 'STATUS',       flex: 1.2 },
              { label: 'CLOSING DATE', flex: 1.2 },
              { label: 'ASSIGNED TO',  flex: 2.3, right: true },
            ] as { label: string; flex: number; right?: boolean }[]).map(col => (
              <span
                key={col.label}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  color: 'var(--muted)',
                  flex: col.flex,
                  minWidth: 0,
                  textAlign: col.right ? 'right' : undefined,
                  paddingRight: col.label === 'AMOUNT' ? 24 : undefined,
                }}
              >
                {col.label}
              </span>
            ))}
          </div>

          {/* Loading */}
          {isError && !data ? (
            <div className="flex flex-col items-center justify-center" style={{ height: 140, gap: 10 }}>
              <span style={{ fontSize: 14, color: 'var(--warning)' }}>Couldn’t load contracts.</span>
              <button type="button" onClick={() => refetch()}
                className="flex items-center rounded-[8px] hover:border-[var(--muted)]"
                style={{ height: 32, gap: 6, padding: '0 12px', fontSize: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', cursor: 'pointer' }}>
                <RotateCw size={13} /> Retry
              </button>
            </div>
          ) : isLoading ? (
            <SkeletonRows cols={5} rows={8} />
          ) : contracts.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center"
              style={{ height: filtered ? 120 : 180, gap: 8 }}
            >
              <FileText size={24} style={{ color: 'var(--border)' }} />
              {filtered ? (
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>No contracts match your filters</span>
              ) : <>
                <span style={{ fontSize: 14, color: 'var(--body)' }}>No contracts logged yet</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Add one by hand, or import your Qualia export from Exports.</span>
                <button type="button" onClick={openLog} className="flex items-center rounded-[8px] font-semibold"
                  style={{ marginTop: 4, height: 32, gap: 6, padding: '0 12px', fontSize: 12, background: 'var(--gold)', color: '#000000', border: 'none', cursor: 'pointer' }}>
                  <Plus size={13} /> Add Contract
                </button>
              </>}
            </div>
          ) : (
            contracts.map((contract, idx) => {
              const isLast = idx === contracts.length - 1
              return (
                <div
                  key={contract.id}
                  onClick={() => openContract(contract as any)}
                  className="flex items-center transition-colors hover:bg-[var(--surface)] px-3 md:px-5"
                  style={{
                    minHeight: 68,
                    paddingTop: 10,
                    paddingBottom: 10,
                    borderBottom: isLast ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                    opacity: contract.status === 'cancelled' ? 0.55 : 1,
                  }}
                >
                  {/* FILE NUMBER — desktop */}
                  <div className="hidden md:block" style={{ flex: 1.1, minWidth: 0 }}>
                    <span className="truncate block" style={{ fontSize: 12, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: 'var(--body)' }}>
                      {fileNumberOf(contract)}
                    </span>
                  </div>

                  {/* ADDRESS — desktop */}
                  <div className="hidden md:block" style={{ flex: 2, minWidth: 0 }}>
                    <span className="truncate block" style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>
                      {contract.property_address ?? '—'}
                    </span>
                    {contract.city && (
                      <span className="truncate block" style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {contract.city}
                      </span>
                    )}
                  </div>

                  {/* CONTACT — desktop */}
                  <div className="hidden md:block" style={{ flex: 1.5, minWidth: 0 }}>
                    <ContactCell contract={contract} />
                  </div>

                  {/* AMOUNT — desktop */}
                  <div className="hidden md:block" style={{ flex: 1, minWidth: 0, textAlign: 'right', paddingRight: 24 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--foreground)' }}>
                      {formatCurrency(contract.amount ?? 0)}
                    </span>
                  </div>

                  {/* TYPE — desktop */}
                  <div className="hidden md:flex items-center" style={{ flex: 0.7, minWidth: 0 }}>
                    <TypeLabel type={contract.transaction_type} />
                  </div>

                  {/* STATUS — desktop */}
                  <div className="hidden md:flex items-center" style={{ flex: 1.2, minWidth: 0 }}>
                    <ContractBadge contract={contract} />
                  </div>

                  {/* CLOSING DATE — desktop */}
                  <div className="hidden md:flex flex-col" style={{ flex: 1.2, minWidth: 0, gap: 2 }}>
                    <span style={{ fontSize: 13, color: 'var(--body)', fontVariantNumeric: 'tabular-nums' }}>
                      {closingDate(contract)}
                    </span>
                    {closingRelative(contract) && (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{closingRelative(contract)}</span>
                    )}
                  </div>

                  {/* ASSIGNED TO — desktop (D16) */}
                  <div className="hidden md:block" style={{ flex: 2.3, minWidth: 0 }}>
                    <AssignmentControl contract={contract} members={members} compact />
                  </div>

                  {/* Mobile: address + contact·date left, amount + status right */}
                  <div className="flex flex-1 items-center justify-between gap-3 md:hidden">
                    <div className="flex min-w-0 flex-col" style={{ gap: 2 }}>
                      <span className="truncate font-medium" style={{ fontSize: 13, color: 'var(--foreground)' }}>
                        {contract.property_address ?? '—'}
                      </span>
                      <span className="truncate" style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {contract.contact?.name ?? '—'} · {closingDate(contract)}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end" style={{ gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--foreground)' }}>
                        {formatCurrency(contract.amount ?? 0)}
                      </span>
                      <ContractBadge contract={contract} />
                    </div>
                  </div>
                </div>
              )
            })
          )}
          {total > PAGE_SIZES[0] && <Pager page={page} size={pageSize} total={total} onPage={setPage} onSize={setPageSize} />}
        </div>

      </div>

      {confirmAccept && <AcceptRecommendationsDialog contracts={recommendable} onClose={() => setConfirmAccept(false)} />}

      {/* Contract detail panel — opened from ?view= param or notification */}
      <AnimatePresence>
        {detailContract && (
          <ContractDetailPanel
            contract={detailContract}
            onClose={() => setDetailContract(null)}
          />
        )}
      </AnimatePresence>

    </AppShell>
  )
}

export default function ContractsPage() {
  return <Suspense><ContractsPageContent /></Suspense>
}
