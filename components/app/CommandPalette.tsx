'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, Users, Activity, Circle, Utensils, Gift, GraduationCap, Coffee, Package, Phone, Star } from 'lucide-react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { useSearch } from '@/lib/context/SearchContext'
import { useContacts } from '@/lib/hooks/useContacts'
import { useActivities } from '@/lib/hooks/useActivities'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contact {
  id: string
  name: string
  initials: string
  company: string
  type?: string
  /** null = Dormant for the viewer */
  score?: number | null
  lastActivityDate?: string
}

interface ActivityItem {
  id: string
  type: string
  contactName: string
  date: string
  notes?: string
}

// ── Icon map ──────────────────────────────────────────────────────────────────

const activityIconMap: Record<string, LucideIcon> = {
  'Lunch':        Utensils,
  'Pop-by':       Gift,
  'CE Class':     GraduationCap,
  'Coffee':       Coffee,
  'Closing Gift': Package,
  'Call':         Phone,
  'Sponsorship':  Star,
  'Other':        Circle,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function fuzzyMatch(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase())
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '10px 16px 4px',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: 'var(--muted)',
        textTransform: 'uppercase' as const,
        borderTop: '1px solid var(--border)',
      }}
    >
      {label}
    </div>
  )
}

function ContactRow({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const initials = contact.initials || getInitials(contact.name)
  return (
    <Link
      href={`/contacts/${contact.id}`}
      onClick={onClose}
      className="flex items-center transition-colors hover:bg-[var(--surface)]"
      style={{ padding: '10px 16px', gap: 12, textDecoration: 'none' }}
    >
      <div
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: 32,
          height: 32,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          fontSize: 11,
          fontWeight: 600,
          color: '#c4a574',
        }}
      >
        {initials}
      </div>
      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 1 }}>
        <span style={{ fontSize: 14, color: 'var(--foreground)' }}>{contact.name}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{contact.company}</span>
      </div>
      {contact.score != null ? (
        <span style={{ fontSize: 13, fontWeight: 600, color: '#c4a574', flexShrink: 0 }}>
          {contact.score}
        </span>
      ) : contact.type !== 'vendor' && (
        <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Dormant</span>
      )}
    </Link>
  )
}

function ActivityRow({ activity, onClose }: { activity: ActivityItem; onClose: () => void }) {
  const Icon = activityIconMap[activity.type] ?? Circle
  return (
    <Link
      href="/activities"
      onClick={onClose}
      className="flex items-center transition-colors hover:bg-[var(--surface)]"
      style={{ padding: '10px 16px', gap: 12, textDecoration: 'none' }}
    >
      <div
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: 32,
          height: 32,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <Icon size={14} style={{ color: 'var(--muted)' }} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 1 }}>
        <span style={{ fontSize: 14, color: 'var(--foreground)' }}>{activity.contactName}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{activity.type}</span>
      </div>
      <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
        {activity.date}
      </span>
    </Link>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CommandPalette() {
  const { closeSearch } = useSearch()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Autofocus on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // ESC to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeSearch()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeSearch])

  const { data: contactsData } = useContacts()
  const { data: activitiesData } = useActivities()

  const contacts: Contact[] = (contactsData?.items ?? []) as Contact[]
  const activities: ActivityItem[] = (activitiesData?.items ?? []).map(a => ({
    id: a.id,
    type: a.type,
    contactName: a.contactName,
    date: a.date,
    notes: a.notes,
  }))

  // Filtered results
  const filteredContacts = query
    ? contacts.filter(c =>
        fuzzyMatch(c.name, query) || fuzzyMatch(c.company ?? '', query)
      )
    : []

  const filteredActivities = query
    ? activities.filter(a =>
        fuzzyMatch(a.type, query) ||
        fuzzyMatch(a.contactName, query) ||
        (a.notes ? fuzzyMatch(a.notes, query) : false)
      )
    : []

  // Recent contacts (zero-query state): last 5 by last_activity_date
  const recentContacts = [...contacts]
    .filter(c => (c as any).last_activity_date)
    .sort((a, b) =>
      new Date((b as any).last_activity_date).getTime() -
      new Date((a as any).last_activity_date).getTime()
    )
    .slice(0, 5)

  const hasResults = filteredContacts.length > 0 || filteredActivities.length > 0
  const noResults = query.length > 0 && !hasResults

  return (
    <>
      {/* Backdrop */}
      <motion.div
        onClick={closeSearch}
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Centering wrapper — static, no transform conflicts */}
      <div
        className="fixed z-[60] inset-x-0 flex justify-center px-4"
        style={{ top: 64, pointerEvents: 'none' }}
      >
      {/* Dialog */}
      <motion.div
        style={{
          width: '100%',
          maxWidth: 560,
          pointerEvents: 'auto',
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.32)',
        }}
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        {/* Search input */}
        <div
          className="flex items-center"
          style={{
            padding: '12px 16px',
            gap: 10,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Search size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search contacts, activities…"
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 16, color: 'var(--foreground)' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>

          {/* Zero-query state: Recent contacts */}
          {!query && (
            <div>
              <SectionHeader label="Recent" />
              {recentContacts.map(contact => (
                <ContactRow key={contact.id} contact={contact} onClose={closeSearch} />
              ))}
            </div>
          )}

          {/* Contact results */}
          {filteredContacts.length > 0 && (
            <div>
              <SectionHeader label="Contacts" />
              {filteredContacts.map(contact => (
                <ContactRow key={contact.id} contact={contact} onClose={closeSearch} />
              ))}
            </div>
          )}

          {/* Activity results */}
          {filteredActivities.length > 0 && (
            <div>
              <SectionHeader label="Activities" />
              {filteredActivities.map(activity => (
                <ActivityRow key={activity.id} activity={activity} onClose={closeSearch} />
              ))}
            </div>
          )}

          {/* No results */}
          {noResults && (
            <div
              className="flex items-center justify-center"
              style={{ height: 80 }}
            >
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>
                No results for &quot;{query}&quot;
              </span>
            </div>
          )}

        </div>

        {/* Footer hint */}
        <div
          className="flex items-center"
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border)',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>↵ to select</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>esc to close</span>
        </div>
      </motion.div>
      </div>
    </>
  )
}
