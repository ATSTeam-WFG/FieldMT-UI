'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app/AppShell'
import { SkeletonRows } from '@/components/app/SkeletonRows'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useContacts } from '@/lib/hooks/useContacts'
import { useScoreTrends } from '@/lib/hooks/useScoreTrends'
import { useAgentPerformance } from '@/lib/hooks/useAgentPerformance'
import { SponsorActivitySection } from '@/components/app/SponsorActivitySection'
import type { Contact } from '@/lib/api/contacts'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return `${Math.floor(diffDays / 7)}w ago`
}

function scoreZone(score: number): 'healthy' | 'watch' | 'risk' {
  if (score >= 80) return 'healthy'
  if (score >= 60) return 'watch'
  return 'risk'
}

const ZONE_COLOR = { healthy: '#16a34a', watch: '#d97706', risk: '#d4d4d8' }
const ZONE_BG    = { healthy: 'rgba(22,163,74,0.1)', watch: 'rgba(217,119,6,0.1)', risk: 'rgba(212,212,216,0.08)' }

// ── Score ring (compact, for list rows) ───────────────────────────────────

function ScoreRingSmall({ score }: { score: number }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const arc = (score / 100) * circ
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" aria-label={`Score ${score}`}>
      <circle cx={24} cy={24} r={r} fill="none" stroke="#27272a" strokeWidth={4} />
      <circle cx={24} cy={24} r={r} fill="none" stroke="#c4a574" strokeWidth={4}
        strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 24 24)" />
      <text x={24} y={24} fontSize={11} fontWeight={700} fill="#c4a574"
        textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif">
        {score}
      </text>
    </svg>
  )
}

// ── Breakdown bars ─────────────────────────────────────────────────────────

const DIMS = [
  { key: 'recency',    label: 'Recency'    },
  { key: 'frequency',  label: 'Frequency'  },
  { key: 'diversity',  label: 'Diversity'  },
  { key: 'engagement', label: 'Engagement' },
]

function dimColor(level: string) {
  if (level === 'high')   return '#16a34a'
  if (level === 'medium') return '#d97706'
  return 'var(--muted)'
}
function dimWidth(level: string) {
  if (level === 'high')   return '100%'
  if (level === 'medium') return '60%'
  return '30%'
}

type BreakdownType = NonNullable<Contact['score_breakdown']>

function BreakdownBars({ bd }: { bd: BreakdownType }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', width: '100%', maxWidth: 420 }}>
      {DIMS.map(({ key, label }) => {
        const level = (bd as unknown as Record<string, string>)[key] ?? 'low'
        return (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {label}
            </span>
            <div style={{ width: '100%', height: 6, borderRadius: 3, backgroundColor: 'var(--surface)', overflow: 'hidden' }}>
              <div style={{ width: dimWidth(level), height: '100%', borderRadius: 3, backgroundColor: dimColor(level) }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Trend icon ─────────────────────────────────────────────────────────────

function TrendIcon({ delta }: { delta: number | null }) {
  if (delta === null) return <Minus size={16} style={{ color: 'var(--muted)' }} />
  if (delta > 0)  return <TrendingUp   size={16} style={{ color: '#16a34a' }} />
  if (delta < 0)  return <TrendingDown size={16} style={{ color: 'var(--muted)' }} />
  return <Minus size={16} style={{ color: '#d97706' }} />
}

// ── Health distribution bar ────────────────────────────────────────────────

function HealthBar({ healthy, watch, risk }: { healthy: number; watch: number; risk: number }) {
  const total = healthy + watch + risk
  if (total === 0) return null
  const hp = (healthy / total) * 100
  const wp = (watch   / total) * 100
  const rp = (risk    / total) * 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Stacked bar */}
      <div style={{ height: 10, borderRadius: 5, display: 'flex', overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
        {hp > 0 && <div style={{ width: `${hp}%`, backgroundColor: '#16a34a', transition: 'width 0.4s ease' }} />}
        {wp > 0 && <div style={{ width: `${wp}%`, backgroundColor: '#d97706', transition: 'width 0.4s ease' }} />}
        {rp > 0 && <div style={{ width: `${rp}%`, backgroundColor: '#52525b', transition: 'width 0.4s ease' }} />}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[
          { label: `${healthy} Healthy`, color: '#16a34a', range: '80+' },
          { label: `${watch} Watch`,     color: '#d97706', range: '60–79' },
          { label: `${risk} At Risk`,    color: '#52525b', range: '<60'  },
        ].map(({ label, color, range }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--body)' }}>{label}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>({range})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

type SortMode = 'risk-first' | 'score-desc'

export default function MyRelationsPage() {
  const router = useRouter()
  const [sort, setSort] = useState<SortMode>('risk-first')

  // Only contacts this rep works — a contact they've never logged an activity with is
  // Dormant for them and lives on /contacts, not here (D17).
  const { data, isLoading } = useContacts({ scope: 'mine' })
  const { data: perfData } = useAgentPerformance('mtd')
  const { data: trendsData } = useScoreTrends()

  const trendsMap = Object.fromEntries(
    (trendsData ?? []).map(t => [t.contact_id, t.delta])
  )

  // Scored contacts only: realtors and lenders (vendors are not scored)
  const allContacts = (data?.items ?? []).filter(
    (c): c is Contact & { score: number } => c.type !== 'vendor' && c.score !== null
  )

  const healthy = allContacts.filter(c => c.score >= 80)
  const watch   = allContacts.filter(c => c.score >= 60 && c.score < 80)
  const atRisk  = allContacts.filter(c => c.score < 60)
  const avgScore = allContacts.length
    ? Math.round(allContacts.reduce((s, c) => s + c.score, 0) / allContacts.length)
    : 0

  const sorted = [...allContacts].sort((a, b) =>
    sort === 'risk-first' ? a.score - b.score : b.score - a.score
  )

  const colHeaders = [
    { label: '#',            w: 32,  grow: false, center: false },
    { label: 'CONTACT',      w: 220, grow: false, center: false },
    { label: 'SCORE',        w: 60,  grow: false, center: true  },
    { label: 'BREAKDOWN',    w: 180, grow: true,  center: false },
    { label: 'LAST CONTACT', w: 110, grow: false, center: false },
    { label: 'TREND',        w: 80,  grow: false, center: true  },
  ]

  return (
    <AppShell activeItem="My Relations">
      <div className="flex flex-col" style={{ gap: 0 }}>

        {/* ── Page header ────────────────────────────────────────── */}
        <div className="flex flex-col" style={{ gap: 4 }}>
          <h1 className="font-semibold leading-tight" style={{ fontSize: 22, color: 'var(--foreground)' }}>
            My Relations
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            Health of your referral agent relationships
          </p>
        </div>

        {/* ── Overview stat cards ─────────────────────────────────── */}
        <div
          className="grid grid-cols-2 md:grid-cols-4"
          style={{ gap: 12, marginTop: 20 }}
        >
          {[
            { label: 'AVG SCORE',  value: avgScore,          color: '#c4a574' },
            { label: 'HEALTHY',    value: healthy.length,    color: '#16a34a' },
            { label: 'WATCH',      value: watch.length,      color: '#d97706' },
            { label: 'AT RISK',    value: atRisk.length,     color: '#71717a' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="app-card"
              style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                {label}
              </span>
              <span style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Health distribution bar ─────────────────────────────── */}
        {!isLoading && allContacts.length > 0 && (
          <div
            className="app-card"
            style={{ marginTop: 12, padding: '16px 20px' }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 12 }}>
              Relationship Health
            </p>
            <HealthBar healthy={healthy.length} watch={watch.length} risk={atRisk.length} />
          </div>
        )}

        {/* ── Contacts table ──────────────────────────────────────── */}
        <div className="app-card" style={{ marginTop: 12 }}>

          {/* Card header with sort toggle */}
          <div
            className="flex items-center justify-between"
            style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center" style={{ gap: 8 }}>
              <span className="font-semibold" style={{ fontSize: 14, color: 'var(--foreground)' }}>
                All Contacts
              </span>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 22, height: 20, padding: '0 7px', borderRadius: 10,
                  fontSize: 11, fontWeight: 600, backgroundColor: 'var(--surface)', color: 'var(--muted)',
                }}
              >
                {allContacts.length}
              </span>
            </div>

            {/* Sort toggle */}
            <div
              className="flex overflow-hidden rounded-[6px]"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', height: 30, padding: 2, gap: 2 }}
            >
              {([
                { mode: 'risk-first' as SortMode, label: 'At Risk First' },
                { mode: 'score-desc' as SortMode, label: 'Top Score'     },
              ]).map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => setSort(mode)}
                  style={{
                    height: 22, paddingLeft: 10, paddingRight: 10, fontSize: 11,
                    fontWeight: sort === mode ? 600 : 400,
                    borderRadius: 4, border: 'none', cursor: 'pointer',
                    backgroundColor: sort === mode ? '#c4a574' : 'transparent',
                    color: sort === mode ? '#000' : 'var(--muted)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div
            className="hidden md:flex items-center"
            style={{ height: 32, padding: '0 20px', backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
          >
            {colHeaders.map(({ label, w, grow, center }) => (
              <span
                key={label}
                style={{
                  ...(grow ? { flex: 1, minWidth: w } : { width: w, flexShrink: 0 }),
                  fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase',
                  ...(center ? { textAlign: 'center' } : {}),
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Loading / empty */}
          {isLoading && <SkeletonRows cols={4} rows={8} />}
          {!isLoading && sorted.length === 0 && (
            <div className="flex items-center justify-center" style={{ padding: '48px 20px' }}>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>No contacts yet.</span>
            </div>
          )}

          {/* Rows */}
          {sorted.map((contact, idx) => {
            const isLast = idx === sorted.length - 1
            const bd = contact.score_breakdown
            const zone = scoreZone(contact.score)
            const delta = trendsMap[contact.id] ?? null

            return (
              <div
                key={contact.id}
                onClick={() => router.push('/contacts/' + contact.id)}
                className="flex items-center hover:bg-[var(--surface)]"
                style={{
                  minHeight: 64,
                  padding: '0 20px',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                {/* # */}
                <span
                  className="hidden md:block shrink-0"
                  style={{ width: 32, fontSize: 12, color: 'var(--muted)' }}
                >
                  {idx + 1}
                </span>

                {/* CONTACT */}
                <div className="flex items-center shrink-0" style={{ gap: 10, width: 220 }}>
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 34, height: 34, borderRadius: '50%',
                      backgroundColor: '#c4a574',
                      boxShadow: `0 0 0 2px var(--card), 0 0 0 4px ${ZONE_COLOR[zone]}`,
                      fontSize: 11, fontWeight: 700,
                      color: '#000',
                    }}
                  >
                    {contact.initials}
                  </div>
                  <div className="flex flex-col" style={{ gap: 2, minWidth: 0 }}>
                    <span className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>
                      {contact.name}
                    </span>
                    <span className="truncate" style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {contact.job_title ?? ''}
                    </span>
                  </div>
                </div>

                {/* SCORE */}
                <div style={{ width: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="md:hidden" style={{ fontSize: 15, fontWeight: 700, color: '#c4a574' }}>
                    {contact.score}
                  </span>
                  <span className="hidden md:flex items-center justify-center">
                    <ScoreRingSmall score={contact.score} />
                  </span>
                </div>

                {/* BREAKDOWN */}
                {bd ? (
                  <div className="hidden md:flex items-center" style={{ flex: 1, minWidth: 180 }}>
                    <BreakdownBars bd={bd} />
                  </div>
                ) : (
                  <div className="hidden md:block" style={{ flex: 1, minWidth: 180, fontSize: 12, color: 'var(--muted)' }}>—</div>
                )}

                {/* LAST CONTACT */}
                <span className="hidden md:block shrink-0" style={{ width: 110, fontSize: 13, color: 'var(--muted)' }}>
                  {formatRelativeDate(contact.last_activity_date)}
                </span>

                {/* TREND */}
                <div className="hidden md:flex shrink-0 items-center justify-center" style={{ width: 80, gap: 4 }}>
                  <TrendIcon delta={delta} />
                  {delta !== null && (
                    <span style={{ fontSize: 11, color: delta > 0 ? '#16a34a' : delta < 0 ? 'var(--muted)' : '#d97706' }}>
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Sponsor Activity ────────────────────────────── */}
        <div style={{ marginTop: 12 }}>
          <SponsorActivitySection items={perfData?.sponsorActivity ?? []} />
        </div>

      </div>
    </AppShell>
  )
}
