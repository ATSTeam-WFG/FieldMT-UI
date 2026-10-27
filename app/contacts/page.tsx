'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Star, ChevronRight, Search } from 'lucide-react'
import { AppShell } from '@/components/app/AppShell'
import { FilterSearchBar } from '@/components/app/FilterBar'
import { SkeletonRows } from '@/components/app/SkeletonRows'
import { useAddContact } from '@/lib/context/AddContactContext'
import { useContacts } from '@/lib/hooks/useContacts'
import type { Contact } from '@/lib/api/contacts'

// ── Sub-components ──────────────────────────────────────────────────────────

function ContactAvatar({ initials, size = 36 }: { initials: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: '#c4a574',
        fontSize: size <= 32 ? 11 : 13,
        fontWeight: 700,
        color: '#000',
      }}
    >
      {initials}
    </div>
  )
}

const TYPE_LABEL: Record<string, string> = {
  realtor: 'Realtor',
  lender:  'Lender',
  vendor:  'Vendor',
}

function ScoreBadge({ score, type }: { score: number | null; type: string }) {
  if (type === 'vendor') return null
  if (score === null) {
    return <span style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'right' }}>Dormant</span>
  }
  return (
    <span style={{ color: '#c4a574', fontWeight: 700, fontSize: 14, minWidth: 28, textAlign: 'right' }}>
      {score}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const label = TYPE_LABEL[type] ?? type
  return (
    <span
      style={{
        border: '1px solid var(--border)',
        borderRadius: 4,
        fontSize: 11,
        color: 'var(--muted)',
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '20px 0 6px',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--muted)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  )
}

function FavoriteButton({
  active,
  onToggle,
}: {
  active: boolean
  onToggle: (e: React.MouseEvent) => void
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Star
        size={14}
        fill={active ? '#c4a574' : 'none'}
        style={{ color: active ? '#c4a574' : 'var(--muted)', transition: 'color 0.15s' }}
      />
    </button>
  )
}

function ContactRow({
  contact,
  isFavorite,
  onToggleFavorite,
  onClick,
}: {
  contact: Contact
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onClick: () => void
}) {
  function handleStar(e: React.MouseEvent) {
    e.stopPropagation()
    onToggleFavorite(contact.id)
  }

  return (
    <div
      onClick={onClick}
      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      onTouchStart={e => (e.currentTarget.style.backgroundColor = 'var(--surface)')}
      onTouchEnd={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {/* Desktop row */}
      <div
        className="hidden md:grid items-center"
        style={{
          gridTemplateColumns: '2fr 1.5fr 80px 56px 32px',
          height: 56,
          gap: 16,
        }}
      >
        {/* Name + job title */}
        <div className="flex items-center gap-3 min-w-0">
          <ContactAvatar initials={contact.initials} size={34} />
          <div className="flex flex-col min-w-0" style={{ gap: 1 }}>
            <span className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>
              {contact.name}
            </span>
            {contact.job_title && (
              <span className="truncate" style={{ fontSize: 11, color: 'var(--muted)' }}>
                {contact.job_title}
              </span>
            )}
          </div>
        </div>

        {/* Company */}
        <span className="truncate" style={{ fontSize: 13, color: 'var(--body)' }}>
          {contact.company ?? '—'}
        </span>

        {/* Type */}
        <TypeBadge type={contact.type} />

        {/* Score */}
        <div style={{ textAlign: 'right' }}>
          <ScoreBadge score={contact.score} type={contact.type} />
        </div>

        {/* Star */}
        <FavoriteButton active={isFavorite} onToggle={handleStar} />
      </div>

      {/* Mobile row */}
      <div className="md:hidden flex items-center gap-3" style={{ padding: '11px 16px' }}>
        <ContactAvatar initials={contact.initials} size={36} />
        <div className="flex flex-1 flex-col min-w-0" style={{ gap: 2 }}>
          <span className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
            {contact.name}
          </span>
          {contact.company && (
            <span className="truncate" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {contact.company}
            </span>
          )}
        </div>
        <FavoriteButton active={isFavorite} onToggle={handleStar} />
      </div>
    </div>
  )
}

function AlphaScrubber({
  letters,
  onSelect,
}: {
  letters: string[]
  onSelect: (letter: string) => void
}) {
  return (
    <div
      className="md:hidden fixed flex flex-col justify-center"
      style={{ right: 4, top: 48, bottom: 56, zIndex: 50, gap: 0, pointerEvents: 'none' }}
    >
      {letters.map(l => (
        <button
          key={l}
          onTouchStart={() => onSelect(l)}
          onClick={() => onSelect(l)}
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '1px 5px',
            lineHeight: 1.5,
            pointerEvents: 'auto',
          }}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--muted)' }}>
      <Search size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
      <p style={{ fontSize: 14 }}>No contacts match your search</p>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const router = useRouter()
  const { openAddContact } = useAddContact()
  const { data, isLoading } = useContacts()
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = localStorage.getItem('app_contact_favorites')
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set()
    } catch {
      return new Set()
    }
  })
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const allContacts = useMemo(() => data?.items ?? [], [data])

  function toggleFavorite(id: string) {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem('app_contact_favorites', JSON.stringify([...next]))
      return next
    })
  }

  const scrollToSection = useCallback((letter: string) => {
    sectionRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const filteredContacts = useMemo(() => {
    let list = [...allContacts]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        c => c.name.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [allContacts, search])

  const favoriteContacts = useMemo(
    () => filteredContacts.filter(c => favorites.has(c.id)),
    [filteredContacts, favorites]
  )

  const alphabetGroups = useMemo(() => {
    const nonFavs = filteredContacts.filter(c => !favorites.has(c.id))
    const groups: Record<string, Contact[]> = {}
    for (const c of nonFavs) {
      const letter = c.name[0]?.toUpperCase() ?? '#'
      if (!groups[letter]) groups[letter] = []
      groups[letter].push(c)
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, contacts]) => ({ letter, contacts }))
  }, [filteredContacts, favorites])

  const scrubberLetters = alphabetGroups.map(g => g.letter)

  return (
    <AppShell activeItem="Contacts">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>
            Contacts
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            {allContacts.length} contacts
          </p>
        </div>
        <button
          onClick={openAddContact}
          className="flex items-center gap-1.5"
          style={{
            backgroundColor: '#c4a574',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <UserPlus size={14} />
          <span className="hidden sm:inline">Add Contact</span>
        </button>
      </div>

      {/* Search bar — half-width on desktop, full-width on mobile */}
      <div className="w-full md:w-1/2 mb-6">
        <FilterSearchBar value={search} onChange={setSearch} placeholder="Search name or company…" />
      </div>

      {/* Contact list */}
      <div className="relative pr-8 md:pr-0">
        {isLoading ? (
          <SkeletonRows cols={3} rows={10} />
        ) : filteredContacts.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {favoriteContacts.length > 0 && (
              <div>
                <SectionLabel label="Favorites" />
                {favoriteContacts.map(c => (
                  <ContactRow
                    key={c.id}
                    contact={c}
                    isFavorite
                    onToggleFavorite={toggleFavorite}
                    onClick={() => router.push(`/contacts/${c.id}`)}
                  />
                ))}
              </div>
            )}

            {alphabetGroups.map(({ letter, contacts }) => (
              <div
                key={letter}
                ref={el => { sectionRefs.current[letter] = el }}
              >
                <SectionLabel label={letter} />
                {contacts.map(c => (
                  <ContactRow
                    key={c.id}
                    contact={c}
                    isFavorite={favorites.has(c.id)}
                    onToggleFavorite={toggleFavorite}
                    onClick={() => router.push(`/contacts/${c.id}`)}
                  />
                ))}
              </div>
            ))}
          </>
        )}

        {scrubberLetters.length > 0 && (
          <AlphaScrubber letters={scrubberLetters} onSelect={scrollToSection} />
        )}
      </div>
    </AppShell>
  )
}
