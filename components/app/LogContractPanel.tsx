'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, Search, Plus, DollarSign, Users, Pencil, Trash2, Sparkles } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { SlideOverPanel } from './SlideOverPanel'
import { FieldLabel } from './FieldLabel'
import { useContract } from '@/lib/context/ContractContext'
import { useAddContact } from '@/lib/context/AddContactContext'
import { useSuccessToast } from '@/components/app/SuccessToast'
import { useContacts } from '@/lib/hooks/useContacts'
import {
  useCreateContract, useDeleteContract, useRecommendationPreview, useSetAssignment, useUpdateContract,
} from '@/lib/hooks/useContracts'
import { useAgencyMembers } from '@/lib/hooks/useMyAgency'
import { toast } from '@/lib/hooks/use-toast'
import { recommendationEvidence } from './AssignmentControl'
import { AI_CARD_BASE } from './AICard'
import { DatePickerInput } from '@/components/app/DatePickerInput'
import { TimePickerInput } from '@/components/app/TimePickerInput'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contact {
  id: string
  name: string
  initials: string
  company: string | null
  type?: string
}

type ContractStatus = 'opened' | 'closed' | 'cancelled'
type ContractType   = 'Regular' | 'Refinance' | 'Commercial'

const STATUS_OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: 'opened',    label: 'Opened'    },
  { value: 'closed',    label: 'Closed'    },
  { value: 'cancelled', label: 'Cancelled' },
]

const TYPE_OPTIONS: ContractType[] = ['Regular', 'Refinance', 'Commercial']

// ── PanelSelect ───────────────────────────────────────────────────────────────

function PanelSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center rounded-[8px] transition-colors"
        style={{
          height: 40,
          paddingLeft: 12,
          paddingRight: 12,
          gap: 8,
          backgroundColor: 'var(--surface)',
          border: open ? '1px solid #c4a574' : '1px solid var(--border)',
        }}
      >
        <span className="flex-1 text-left" style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>
          {selected?.label ?? value}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--muted)',
            flexShrink: 0,
            transition: 'transform 0.15s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-30 overflow-hidden rounded-[8px]"
          style={{
            top: 46,
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}
        >
          {options.map((opt, i) => {
            const active = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className="flex w-full items-center transition-colors hover:bg-[var(--surface)]"
                style={{
                  height: 44,
                  paddingLeft: 16,
                  paddingRight: 16,
                  gap: 10,
                  borderBottom: i < options.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {active && (
                  <div style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: '#c4a574', flexShrink: 0 }} />
                )}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#c4a574' : 'var(--body)',
                    marginLeft: active ? 0 : 13,
                  }}
                >
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── ContactPicker ───────────────────────────────────────────────────────────

function ContactPicker({
  value,
  onChange,
  contacts,
  placeholder,
  clearable,
  onAddNew,
  disabled = false,
  searchPlaceholder = 'Search contacts…',
  tag,
}: {
  value: Contact | null
  onChange: (c: Contact | null) => void
  contacts: Contact[]
  placeholder: string
  clearable?: boolean
  onAddNew?: () => void
  disabled?: boolean
  searchPlaceholder?: string
  /** A small gold annotation beside an option, e.g. "Recommended" */
  tag?: (c: Contact) => string | null
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = search
    ? contacts.filter(
        c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.company ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : contacts

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-[8px]"
        style={{
          padding: value ? '8px 12px' : '0 12px',
          minHeight: 40,
          gap: 8,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          textAlign: 'left',
        }}
      >
        {value ? (
          <div className="flex items-center" style={{ gap: 8, minWidth: 0 }}>
            <div
              className="flex shrink-0 items-center justify-center rounded-full"
              style={{ width: 24, height: 24, backgroundColor: '#c4a574', fontSize: 10, fontWeight: 600, color: '#000' }}
            >
              {value.initials}
            </div>
            <div className="flex min-w-0 flex-col" style={{ gap: 1 }}>
              <span className="truncate" style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>{value.name}</span>
              <span className="truncate" style={{ fontSize: 11, color: 'var(--muted)' }}>{value.company}</span>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{placeholder}</span>
        )}
        <div className="flex items-center" style={{ gap: 4, flexShrink: 0 }}>
          {value && clearable && !disabled && (
            <span
              role="button"
              aria-label="Clear"
              onClick={e => { e.stopPropagation(); onChange(null) }}
              className="rounded-[4px] p-0.5 transition-colors hover:bg-[var(--border)]"
              style={{ display: 'flex', color: 'var(--muted)', cursor: 'pointer' }}
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={14} style={{ color: 'var(--muted)' }} />
        </div>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-10 overflow-hidden rounded-[8px]"
          style={{ top: 46, backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', maxHeight: 260, display: 'flex', flexDirection: 'column' }}
        >
          <div className="flex items-center" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', gap: 8 }}>
            <Search size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 13, color: 'var(--foreground)' }}
            />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
            {onAddNew && (
              <button
                type="button"
                className="flex w-full items-center transition-colors hover:bg-[var(--surface)]"
                style={{ height: 40, padding: '0 12px', gap: 8 }}
                onClick={() => { setOpen(false); onAddNew() }}
              >
                <div
                  className="flex shrink-0 items-center justify-center rounded-full"
                  style={{ width: 24, height: 24, backgroundColor: 'var(--surface)', border: '1px dashed var(--border)' }}
                >
                  <Plus size={12} style={{ color: 'var(--muted)' }} />
                </div>
                <span style={{ fontSize: 13, color: '#c4a574', fontWeight: 500 }}>+ Add new contact</span>
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center" style={{ height: 48, fontSize: 13, color: 'var(--muted)' }}>
                No contacts found
              </div>
            ) : (
              filtered.map(contact => (
                <button
                  key={contact.id}
                  type="button"
                  className="flex w-full items-center transition-colors hover:bg-[var(--surface)]"
                  style={{ height: 44, padding: '0 12px', gap: 10 }}
                  onClick={() => { onChange(contact); setOpen(false); setSearch('') }}
                >
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full"
                    style={{ width: 28, height: 28, backgroundColor: '#c4a574', fontSize: 10, fontWeight: 600, color: '#000' }}
                  >
                    {contact.initials}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 2, textAlign: 'left' }}>
                    <span className="truncate" style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>{contact.name}</span>
                    <span className="truncate" style={{ fontSize: 11, color: 'var(--muted)' }}>{contact.company}</span>
                  </div>
                  {tag?.(contact) && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, color: 'var(--gold)', border: '1px solid var(--gold)', flexShrink: 0 }}>
                      {tag(contact)}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── RecommendationCard ────────────────────────────────────────────────────────

/** One AI card: the action as its heading, the reason beneath. Choosing it only sets the
 *  dropdown — nothing is assigned until Save. */
function RecommendationCard({ action, reason, onApply }: {
  action: string; reason: string; onApply: () => void
}) {
  return (
    <div className="flex flex-col" style={{ ...AI_CARD_BASE, padding: '12px 16px', gap: 6 }}>
      <button type="button" onClick={onApply}
        className="flex items-center self-start hover:underline focus:outline-none focus-visible:underline underline-offset-4"
        style={{ gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gold)' }}>
        <Sparkles size={13} aria-hidden style={{ flexShrink: 0 }} />
        {action}
      </button>
      <span style={{ fontSize: 12, lineHeight: '17px', color: 'var(--body)' }}>{reason}</span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LogContractPanel() {
  const { isOpen, closeLog, editingContract } = useContract()
  const [isEditing, setIsEditing] = useState(false)
  const isViewMode = editingContract !== null && !isEditing
  const isEditMode = editingContract !== null && isEditing
  const { data: members } = useAgencyMembers()
  const canManage = !!members?.can_manage
  const { openAddContactWithCallback } = useAddContact()
  const showToast = useSuccessToast()
  const { data: contactsData } = useContacts()
  const createContract = useCreateContract()
  const updateContract = useUpdateContract()
  const setAssignment = useSetAssignment()
  const deleteContract = useDeleteContract()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const reduceMotion = useReducedMotion()
  // The saved contract (API shape), for diffing an edit and for the assignment block
  const saved = editingContract as any

  // Form state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedSecondary, setSelectedSecondary] = useState<Contact | null>(null)
  const [selectedLender, setSelectedLender] = useState<Contact | null>(null)
  const [referrer, setReferrer] = useState<'primary' | 'secondary' | 'none'>('none')
  const [fileNumber, setFileNumber] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [contractType, setContractType] = useState<ContractType>('Regular')
  const [amount, setAmount] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [status, setStatus] = useState<ContractStatus>('opened')
  const [openingDate, setOpeningDate] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [expectedTime, setExpectedTime] = useState('')
  const [notes, setNotes] = useState('')
  const [assignedRepId, setAssignedRepId] = useState<string | null>(null)
  // The referrer choice as loaded, so an untouched toggle never rewrites the referrer
  const [loadedReferrer, setLoadedReferrer] = useState<'primary' | 'secondary' | 'none'>('none')

  // Reset editing state when panel closes
  useEffect(() => {
    if (!isOpen) { setIsEditing(false); setConfirmDelete(false) }
  }, [isOpen])

  // Pre-populate from editingContract
  // Handles both ContractRecord (camelCase) and API Contract (snake_case) shapes
  useEffect(() => {
    if (editingContract) {
      const rec = editingContract as any

      setFileNumber(rec.fileNumber ?? rec.file_number ?? '')
      setAddress(rec.address ?? rec.property_address ?? '')

      const rawType = rec.type ?? rec.transaction_type ?? 'Regular'
      const REVERSE_TYPE: Record<string, ContractType> = {
        purchase: 'Regular', refinance: 'Refinance', commercial: 'Commercial',
        Regular: 'Regular', Refinance: 'Refinance', Commercial: 'Commercial',
      }
      setContractType(REVERSE_TYPE[rawType] ?? 'Regular')

      setAmount((rec.amount ?? 0) > 0 ? String(rec.amount) : '')

      const rawStatus = rec.status ?? 'opened'
      const REVERSE_STATUS: Record<string, ContractStatus> = {
        initiated: 'opened', opened: 'opened', closed: 'closed', cancelled: 'cancelled',
      }
      setStatus(REVERSE_STATUS[rawStatus] ?? 'opened')

      setOpeningDate(rec.openingDate ?? rec.opening_date ?? '')
      setExpectedDate(
        rec.expectedClosingDate ?? rec.expected_closing_date ??
        rec.actualClosingDate  ?? rec.actual_closing_date  ?? ''
      )
      setCity(rec.city ?? '')
      setLoanAmount((rec.loanAmount ?? rec.loan_amount ?? 0) > 0 ? String(rec.loanAmount ?? rec.loan_amount) : '')
      setNotes(rec.notes ?? '')

      const items = (contactsData?.items ?? []) as Contact[]
      // The contract embeds its parties, so they show even before the contact list loads
      const embedded = (c: { id: string; name: string; company: string | null } | null | undefined): Contact | null =>
        c ? { id: c.id, name: c.name, company: c.company, initials: c.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() } : null
      const byId = (id: string | null | undefined, emb?: Parameters<typeof embedded>[0]) =>
        id ? (items.find(c => c.id === id) ?? embedded(emb)) : null
      // Fall back to name match for the legacy ContractRecord shape (primary only)
      const primary =
        byId(rec.contact_id ?? rec.contact?.id, rec.contact) ??
        (items.find(c => c.name === (rec.contactName ?? rec.contact?.name)) ?? null)
      const secondary = byId(rec.secondary_contact_id ?? rec.secondary_contact?.id, rec.secondary_contact)
      setSelectedContact(primary)
      setSelectedSecondary(secondary)
      setSelectedLender(byId(rec.lender_contact_id ?? rec.lender_contact?.id, rec.lender_contact))

      const refId = rec.referring_contact_id ?? null
      const choice = refId && primary && refId === primary.id ? 'primary'
        : refId && secondary && refId === secondary.id ? 'secondary' : 'none'
      setReferrer(choice)
      setLoadedReferrer(choice)
      setAssignedRepId(rec.assigned_rep_id ?? null)
    } else {
      setSelectedContact(null)
      setSelectedSecondary(null)
      setSelectedLender(null)
      setReferrer('none')
      setLoadedReferrer('none')
      setAssignedRepId(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingContract])

  const allContacts = (contactsData?.items ?? []) as Contact[]
  // Realtors fill the two deal slots; lenders finance the loan.
  const realtorContacts = allContacts.filter(c => c.type === 'realtor')
  const lenderContacts = allContacts.filter(c => c.type === 'lender')
  // Keep the secondary picker from re-offering the primary and vice-versa
  const secondaryOptions = realtorContacts.filter(c => c.id !== selectedContact?.id)

  const TYPE_MAP: Record<ContractType, string> = {
    Regular:    'purchase',
    Refinance:  'refinance',
    Commercial: 'commercial',
  }
  const STATUS_MAP: Record<ContractStatus, string> = {
    opened:    'initiated',
    closed:    'closed',
    cancelled: 'cancelled',
  }

  const hasTwoRealtors = !!selectedContact && !!selectedSecondary

  function referringContactId(): string | null {
    if (referrer === 'primary') return selectedContact?.id ?? null
    if (referrer === 'secondary') return selectedSecondary?.id ?? null
    return null
  }

  // Did the edit change the source of business? A lender referrer shows as "none" in the
  // toggle, so only a toggle the user moved (or a changed realtor behind it) counts.
  const referrerChanged = !!saved && (
    referrer !== loadedReferrer || (referrer !== 'none' && referringContactId() !== (saved.referring_contact_id ?? null))
  )
  const changedId = (now: Contact | null, was: string | null | undefined) =>
    (now?.id ?? null) !== (was ?? null) ? (now?.id ?? '') : undefined
  // The parties as edited, for the recommendation preview; undefined keeps the saved one
  const draftParties = isEditing && saved ? {
    contact_id: changedId(selectedContact, saved.contact_id),
    secondary_contact_id: changedId(selectedSecondary, saved.secondary_contact_id),
    referring_contact_id: referrerChanged ? (referringContactId() ?? '') : undefined,
  } : {}
  const partiesEdited = Object.values(draftParties).some(v => v !== undefined)
  const preview = useRecommendationPreview(saved?.id ?? null, draftParties, canManage && !!saved?.id)

  function addRealtor(setter: (c: Contact) => void) {
    openAddContactWithCallback(newContact => setter({
      id: newContact.id,
      name: newContact.name,
      initials: newContact.initials,
      company: newContact.company,
      type: newContact.type,
    }))
  }

  async function handleSubmit() {
    if (!selectedContact || !address.trim()) return
    try {
      await createContract.mutateAsync({
        contact_id: selectedContact.id,
        secondary_contact_id: selectedSecondary?.id ?? null,
        referring_contact_id: referringContactId(),
        lender_contact_id: selectedLender?.id ?? null,
        property_address: address,
        city: city || null,
        transaction_type: TYPE_MAP[contractType],
        status: STATUS_MAP[status],
        file_number: fileNumber || null,
        amount: amount ? parseFloat(amount) : null,
        loan_amount: loanAmount ? parseFloat(loanAmount) : null,
        opening_date: openingDate || null,
        expected_closing_date: expectedDate || null,
        notes: notes || null,
      })
      showToast('Contract logged successfully')
      closeLog()
    } catch {}
  }

  async function handleSave() {
    if (!saved) return
    const num = (v: string) => (v ? parseFloat(v) : null)
    const loadedStatus: ContractStatus = saved.status === 'closed' ? 'closed' : saved.status === 'cancelled' ? 'cancelled' : 'opened'
    const loadedExpected = saved.expected_closing_date ?? saved.actual_closing_date ?? ''
    // Send only what the user changed, so an edit never rewrites fields the form can't show
    // (a pending status, a lender referrer) or an assignment it didn't touch
    const payload: Record<string, unknown> = {}
    const put = (key: string, now: unknown, was: unknown) => { if ((now ?? null) !== (was ?? null)) payload[key] = now }
    put('contact_id', selectedContact?.id, saved.contact_id)
    put('secondary_contact_id', selectedSecondary?.id, saved.secondary_contact_id)
    put('lender_contact_id', selectedLender?.id, saved.lender_contact_id)
    if (referrerChanged) payload.referring_contact_id = referringContactId()
    put('file_number', fileNumber || null, saved.file_number)
    put('property_address', address.trim() || null, saved.property_address)
    put('city', city || null, saved.city)
    put('transaction_type', TYPE_MAP[contractType], saved.transaction_type)
    put('amount', num(amount), saved.amount ? saved.amount : null)
    put('loan_amount', num(loanAmount), saved.loan_amount ? saved.loan_amount : null)
    put('opening_date', openingDate || null, saved.opening_date)
    if ((expectedDate || '') !== loadedExpected) payload.expected_closing_date = expectedDate || null
    put('notes', notes || null, saved.notes)
    if (status !== loadedStatus) {
      payload.status = STATUS_MAP[status]
      if (status === 'closed') payload.actual_closing_date = saved.actual_closing_date ?? expectedDate ?? new Date().toISOString().slice(0, 10)
    }
    try {
      if (Object.keys(payload).length) await updateContract.mutateAsync({ id: saved.id, payload })
      if (canManage && assignedRepId !== (saved.assigned_rep_id ?? null)) {
        await setAssignment.mutateAsync({ id: saved.id, repId: assignedRepId })
      }
      showToast('Contract updated')
      closeLog()
    } catch {
      toast({ title: 'Could not save', description: 'Please check the fields and try again.', variant: 'destructive' })
    }
  }

  async function handleDelete() {
    if (!saved) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    try {
      await deleteContract.mutateAsync(saved.id)
      showToast('Contract deleted')
      closeLog()
    } catch {
      toast({ title: 'Could not delete', description: 'Please try again.', variant: 'destructive' })
    }
  }

  const saving = updateContract.isPending || setAssignment.isPending
  const canSubmit = !!selectedContact && address.trim().length > 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SlideOverPanel onClose={closeLog} width={560}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-col" style={{ padding: '24px 28px 16px 28px', gap: 4 }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--foreground)' }}>
            {isViewMode ? 'View Contract' : isEditMode ? 'Edit Contract' : 'Add Contract'}
          </span>
          <div className="flex items-center gap-2">
            {isViewMode && (
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-[6px] p-1 transition-colors hover:bg-[var(--surface)]"
                aria-label="Edit contract"
              >
                <Pencil size={20} style={{ color: 'var(--muted)' }} />
              </button>
            )}
            <button onClick={closeLog} className="rounded-[6px] p-1 transition-colors hover:bg-[var(--surface)]">
              <X size={20} style={{ color: 'var(--muted)' }} />
            </button>
          </div>
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {isViewMode ? 'Contract details' : isEditMode ? 'Edit the details for this contract' : 'Record a new title closing deal'}
        </span>
      </div>
      <div style={{ height: 1, backgroundColor: 'var(--border)', flexShrink: 0 }} />

      {/* ── Scrollable content ───────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '20px 28px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, ...(isViewMode ? { pointerEvents: 'none', opacity: 0.75 } : {}) }}>

        {/* ── SELLER AGENT (primary slot) ─────────────────────────── */}
        <div className="flex flex-col" style={{ gap: 6 }}>
          <FieldLabel>SELLER AGENT *</FieldLabel>
          {realtorContacts.length === 0 && !selectedContact ? (
            <div
              className="flex flex-col items-center justify-center rounded-[8px]"
              style={{ padding: '20px 16px', gap: 10, textAlign: 'center', border: '1px dashed var(--border)', backgroundColor: 'var(--surface)' }}
            >
              <Users size={20} style={{ color: 'var(--muted)' }} />
              <div className="flex flex-col" style={{ gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>No realtors yet</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Add a realtor contact to link it to this contract.</span>
              </div>
              <button
                type="button"
                onClick={() => addRealtor(setSelectedContact)}
                className="flex items-center gap-2 rounded-[8px] transition-opacity hover:opacity-80"
                style={{ height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600, backgroundColor: '#c4a574', color: '#000000', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={13} />
                Add your first realtor
              </button>
            </div>
          ) : (
            <ContactPicker
              value={selectedContact}
              onChange={c => {
                setSelectedContact(c)
                // A cleared/changed primary can invalidate a 'primary' referrer choice
                if (!c && referrer === 'primary') setReferrer('none')
              }}
              contacts={realtorContacts}
              placeholder="Select the seller agent…"
              onAddNew={() => addRealtor(setSelectedContact)}
            />
          )}
        </div>

        {/* ── BUYER AGENT (optional) ───────────────────────────────── */}
        {selectedContact && (
          <div className="flex flex-col" style={{ gap: 6 }}>
            <FieldLabel>BUYER AGENT <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></FieldLabel>
            <ContactPicker
              value={selectedSecondary}
              onChange={c => {
                setSelectedSecondary(c)
                if (!c && referrer === 'secondary') setReferrer('none')
              }}
              contacts={secondaryOptions}
              placeholder="Add the buyer agent…"
              clearable
              onAddNew={() => addRealtor(setSelectedSecondary)}
            />
          </div>
        )}

        {/* ── WHO BROUGHT THE BUSINESS (only with 2 realtors) ──────── */}
        {hasTwoRealtors && (
          <div className="flex flex-col" style={{ gap: 6 }}>
            <FieldLabel>WHO BROUGHT THE BUSINESS?</FieldLabel>
            <div className="flex overflow-hidden rounded-[8px]" style={{ border: '1px solid var(--border)', height: 40 }}>
              {([
                { value: 'primary' as const,   label: selectedContact!.name },
                { value: 'secondary' as const, label: selectedSecondary!.name },
                { value: 'none' as const,      label: 'Unknown' },
              ]).map((opt, i, arr) => {
                const active = referrer === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReferrer(opt.value)}
                    className="flex flex-1 items-center justify-center transition-colors"
                    style={{
                      fontSize: 12,
                      fontWeight: active ? 600 : 400,
                      backgroundColor: active ? '#c4a574' : 'var(--surface)',
                      color: active ? '#000000' : 'var(--muted)',
                      borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                      padding: '0 8px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <span className="truncate">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── ASSIGNED REP (D16) — credit, set by whoever can assign ───── */}
        {saved?.id && canManage && (() => {
          const repOptions: Contact[] = (members?.members ?? []).map(m => ({
            id: m.id, name: m.name,
            initials: m.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(),
            company: m.role === 'agent' ? 'Rep' : m.role === 'executive' ? 'Executive' : 'Manager',
          }))
          const rec = preview.data ?? null
          const cancelled = status === 'cancelled'
          const savedRep = saved.assigned_rep_id ?? null
          // Never change an assignment as a side effect: a saved assignee only gets a prompt,
          // and only when the edited parties now point to someone else
          const state = cancelled ? 'cancelled'
            : preview.isFetching ? 'loading'
            : rec && rec.rep_id !== assignedRepId && savedRep && partiesEdited ? 'reassign'
            : rec && rec.rep_id !== assignedRepId && !savedRep ? 'recommend'
            : 'none'
          const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 },
            transition: { duration: reduceMotion ? 0 : 0.16, ease: [0.2, 0, 0, 1] } }
          return (
            <div className="flex flex-col" style={{ gap: 6 }}>
              <FieldLabel>ASSIGNED REP</FieldLabel>
              <ContactPicker
                value={repOptions.find(r => r.id === assignedRepId) ?? null}
                onChange={c => setAssignedRepId(c?.id ?? null)}
                contacts={[...repOptions].sort((a, b) => Number(b.id === rec?.rep_id) - Number(a.id === rec?.rep_id))}
                placeholder="Unassigned"
                searchPlaceholder="Search reps…"
                clearable
                disabled={cancelled}
                tag={c => (c.id === rec?.rep_id ? 'Recommended' : null)}
              />
              <AnimatePresence mode="wait" initial={false}>
                {state === 'cancelled' && (
                  <motion.span key="cancelled" {...fade} style={{ fontSize: 11, color: 'var(--muted)' }}>
                    A cancelled order earns no credit, so it can’t be assigned.
                  </motion.span>
                )}
                {state === 'loading' && (
                  <motion.span key="loading" {...fade} className="animate-pulse rounded-[4px]"
                    style={{ display: 'block', height: 30, width: '60%', background: 'var(--surface)' }} />
                )}
                {(state === 'recommend' || state === 'reassign') && rec && (
                  <motion.div key={`${state}-${rec.rep_id}`} {...fade} style={{ marginTop: 4 }}>
                    <RecommendationCard
                      action={`${state === 'reassign' ? 'Reassign to' : 'Assign'} ${rec.rep_name}`}
                      reason={(state === 'reassign' ? `Source changed — ${rec.rep_name} would now be recommended: `
                        : rec.activity_count >= 2 ? `${rec.rep_name} recommended: ` : 'Only candidate: ') + recommendationEvidence(rec)}
                      onApply={() => setAssignedRepId(rec.rep_id)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })()}

        {/* ── FILE NUMBER ───────────────────────────────────────────── */}
        <div className="flex flex-col" style={{ gap: 6 }}>
          <FieldLabel>FILE NUMBER / GF NUMBER</FieldLabel>
          <input
            type="text"
            inputMode="numeric"
            maxLength={12}
            placeholder="e.g. 202603150001"
            value={fileNumber}
            onChange={e => setFileNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
            className="w-full rounded-[8px] outline-none focus:ring-1 focus:ring-[#c4a574] transition-shadow"
            style={{
              height: 40,
              padding: '0 12px',
              fontSize: 13,
              fontFamily: 'monospace',
              letterSpacing: '0.06em',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fileNumber.length}/12 digits</span>
        </div>

        {/* ── ADDRESS + CITY ────────────────────────────────────────── */}
        <div className="flex flex-col" style={{ gap: 6 }}>
          <FieldLabel>ADDRESS *</FieldLabel>
          <input
            type="text"
            placeholder="e.g. 123 Peachtree Rd NE"
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full rounded-[8px] outline-none focus:ring-1 focus:ring-[#c4a574] transition-shadow"
            style={{
              height: 40,
              padding: '0 12px',
              fontSize: 13,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </div>

        <div className="flex flex-col" style={{ gap: 6 }}>
          <FieldLabel>CITY</FieldLabel>
          <input
            type="text"
            placeholder="e.g. Atlanta"
            value={city}
            onChange={e => setCity(e.target.value)}
            className="w-full rounded-[8px] outline-none focus:ring-1 focus:ring-[#c4a574] transition-shadow"
            style={{
              height: 40,
              padding: '0 12px',
              fontSize: 13,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </div>

        {/* ── TYPE ─────────────────────────────────────────────────── */}
        <div className="flex flex-col" style={{ gap: 6 }}>
          <FieldLabel>TYPE</FieldLabel>
          <div
            className="flex overflow-hidden rounded-[8px]"
            style={{ border: '1px solid var(--border)', height: 40 }}
          >
            {TYPE_OPTIONS.map((opt, i) => {
              const active = contractType === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setContractType(opt)}
                  className="flex flex-1 items-center justify-center transition-colors"
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    backgroundColor: active ? '#c4a574' : 'var(--surface)',
                    color: active ? '#000000' : 'var(--muted)',
                    borderRight: i < TYPE_OPTIONS.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── AMOUNT + STATUS ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <FieldLabel>AMOUNT</FieldLabel>
            <div
              className="flex items-center rounded-[8px]"
              style={{ height: 40, padding: '0 12px', gap: 4, backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <DollarSign size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <input
                type="number"
                min="0"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: 14, color: 'var(--foreground)' }}
              />
            </div>
          </div>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <FieldLabel>STATUS</FieldLabel>
            <PanelSelect options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          </div>
        </div>

        {/* ── LENDER + LOAN AMOUNT (refinance/financed deals) ───────── */}
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <FieldLabel>LENDER <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></FieldLabel>
            <ContactPicker
              value={selectedLender}
              onChange={setSelectedLender}
              contacts={lenderContacts}
              placeholder="Select a lender…"
              clearable
            />
          </div>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <FieldLabel>LOAN AMOUNT <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></FieldLabel>
            <div
              className="flex items-center rounded-[8px]"
              style={{ height: 40, padding: '0 12px', gap: 4, backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <DollarSign size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <input
                type="number"
                min="0"
                placeholder="0"
                value={loanAmount}
                onChange={e => setLoanAmount(e.target.value)}
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: 14, color: 'var(--foreground)' }}
              />
            </div>
          </div>
        </div>

        {/* ── OPENING DATE ──────────────────────────────────────────── */}
        <div className="flex flex-col" style={{ gap: 6 }}>
          <FieldLabel>OPENING DATE</FieldLabel>
          <DatePickerInput value={openingDate} onChange={setOpeningDate} />
        </div>

        {/* ── EXPECTED CLOSING DATE + TIME ──────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <FieldLabel>EXPECTED CLOSING DATE</FieldLabel>
            <DatePickerInput value={expectedDate} onChange={setExpectedDate} />
          </div>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <FieldLabel>EXPECTED CLOSING TIME</FieldLabel>
            <TimePickerInput value={expectedTime} onChange={setExpectedTime} />
          </div>
        </div>

        {/* ── NOTES ─────────────────────────────────────────────────── */}
        <div className="flex flex-col" style={{ gap: 6 }}>
          <FieldLabel>NOTES <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></FieldLabel>
          <div
            className="flex flex-col rounded-[8px]"
            style={{ height: 88, padding: 12, backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <textarea
              placeholder="Any notes about this contract…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="flex-1 resize-none bg-transparent outline-none"
              style={{ fontSize: 14, color: 'var(--foreground)' }}
            />
          </div>
        </div>

        <div style={{ height: 8 }} />
      </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div style={{ height: 1, backgroundColor: 'var(--border)', flexShrink: 0 }} />
      <div
        className="flex shrink-0 items-center"
        style={{ height: 72, padding: '0 28px', justifyContent: isEditMode ? 'space-between' : 'flex-end' }}
      >
        {isEditMode && (
          <>
            {canManage ? (
              <button
                onClick={handleDelete}
                disabled={deleteContract.isPending}
                className="flex h-10 items-center justify-center rounded-[8px] transition-colors hover:bg-[var(--surface)]"
                style={{ minWidth: 40, padding: confirmDelete ? '0 12px' : 0, gap: 6, fontSize: 13, color: confirmDelete ? 'var(--warning)' : 'var(--muted)', flexShrink: 0 }}
                aria-label={confirmDelete ? 'Confirm delete' : 'Delete contract'}
              >
                <Trash2 size={16} />
                {confirmDelete && 'Delete this contract?'}
              </button>
            ) : <span />}
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-[8px] font-medium transition-opacity hover:opacity-90"
              style={{
                height: 40,
                padding: '0 32px',
                fontSize: 14,
                fontWeight: 500,
                backgroundColor: '#c4a574',
                color: '#000000',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        )}
        {!isViewMode && !isEditMode && (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || createContract.isPending}
            className="rounded-[8px] font-medium transition-opacity hover:opacity-90"
            style={{
              height: 40,
              padding: '0 32px',
              fontSize: 14,
              fontWeight: 500,
              backgroundColor: canSubmit ? '#c4a574' : 'var(--surface)',
              color: canSubmit ? '#000000' : 'var(--muted)',
              border: 'none',
              cursor: (canSubmit && !createContract.isPending) ? 'pointer' : 'not-allowed',
              opacity: createContract.isPending ? 0.6 : 1,
            }}
          >
            {createContract.isPending ? 'Saving…' : 'Add Contract'}
          </button>
        )}
      </div>
    </SlideOverPanel>
  )
}
