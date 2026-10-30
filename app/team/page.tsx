'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, UserPlus, ChevronRight, Radio, FileBarChart2, Search, SlidersHorizontal } from 'lucide-react'
import { AppShell } from '@/components/app/AppShell'
import { SkeletonRows } from '@/components/app/SkeletonRows'
import { useInviteAgent } from '@/lib/context/InviteAgentContext'
import { useTeamBroadcast } from '@/lib/context/TeamBroadcastContext'
import { useMyTeam } from '@/lib/hooks/useMyTeam'
import { useMyAgency } from '@/lib/hooks/useMyAgency'
import { AddFirstRep, MakeManagerButton, TeamPeople } from '@/components/app/TeamPeople'
import { CodeField } from '@/components/app/CodeField'
import type { TeamAgentEntry } from '@/lib/api/teams'

type EmploymentStatus = 'active' | 'on-leave' | 'inactive'

const statusConfig: Record<EmploymentStatus, { dot: string; label: string; textColor: string; borderColor: string }> = {
  active:     { dot: '#4ade80', label: 'Active',   textColor: '#4ade80', borderColor: '#4ade80' },
  'on-leave': { dot: '#d97706', label: 'Watch',    textColor: '#d97706', borderColor: '#d97706' },
  inactive:   { dot: '#71717a', label: 'Inactive', textColor: '#71717a', borderColor: '#71717a' },
}

function toEmploymentStatus(status: string): EmploymentStatus {
  if (status === 'on-track') return 'active'
  if (status === 'watch') return 'on-leave'
  return 'inactive'
}

function formatLastActive(isoDate: string | null): string {
  if (!isoDate) return '—'
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const cardStyle = {
  backgroundColor: 'var(--card)',
  borderTop: '2px solid #c4a574',
  borderRight: '1px solid var(--border)',
  borderBottom: '1px solid var(--border)',
  borderLeft: '1px solid var(--border)',
  borderRadius: 8,
} as const

export default function TeamRosterPage() {
  const router = useRouter()
  const { openInviteAgent } = useInviteAgent()
  const { openBroadcast } = useTeamBroadcast()
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)

  const { data, isLoading } = useMyTeam()
  const { data: agency } = useMyAgency()

  function handleCopyCode() {
    if (!agency?.join_code) return
    navigator.clipboard.writeText(agency.join_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }
  const agents: TeamAgentEntry[] = data?.agents ?? []
  const isTeamEmpty = data !== undefined && agents.length === 0

  // Derived KPIs
  const totalAgents = data?.totalAgents ?? 0
  const activeCount = agents.filter(a => a.status === 'on-track').length
  const watchCount = agents.filter(a => a.status === 'watch').length
  const avgScore = agents.length > 0
    ? Math.round(agents.reduce((s, a) => s + a.avgScore, 0) / agents.length)
    : 0
  const teamActivitiesMTD = agents.reduce((s, a) => s + a.activitiesMtd, 0)
  const topPerformer = agents[0] ?? null

  const filteredAgents = search
    ? agents.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : agents

  const MOBILE_PREVIEW = 4
  const mobileAgents = showAll ? filteredAgents : filteredAgents.slice(0, MOBILE_PREVIEW)

  // G3 — a single-user agency's owner sees the promise, not an empty team.
  if (agency?.type === 'single') {
    return (
      <AppShell activeItem="Team">
        <AddFirstRep onAdd={openInviteAgent} />
      </AppShell>
    )
  }

  return (
    <AppShell activeItem="Team">
      <div className="mx-auto max-w-6xl" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
                Team
              </h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                {totalAgents} reps in your team
              </p>
            </div>

            {/* Desktop buttons */}
            <div className="hidden md:flex items-center shrink-0" style={{ gap: 8 }}>
              <button
                className="flex items-center"
                style={{
                  height: 34, paddingLeft: 12, paddingRight: 12, gap: 6,
                  fontSize: 13, fontWeight: 500, color: 'var(--foreground)',
                  backgroundColor: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 8, cursor: 'pointer',
                }}
              >
                <Download size={14} />
                Export
              </button>
              <button
                onClick={openInviteAgent}
                className="flex items-center"
                style={{
                  height: 34, paddingLeft: 12, paddingRight: 12, gap: 6,
                  fontSize: 13, fontWeight: 500, color: '#000000',
                  backgroundColor: '#c4a574', border: 'none',
                  borderRadius: 8, cursor: 'pointer',
                }}
              >
                <UserPlus size={14} />
                Invite Rep
              </button>
            </div>
          </div>

          {/* Mobile: full-width Invite Rep button */}
          <button
            onClick={openInviteAgent}
            className="flex md:hidden w-full items-center justify-center"
            style={{
              height: 40, gap: 6, fontSize: 14, fontWeight: 600,
              color: '#000000', backgroundColor: '#c4a574',
              border: 'none', borderRadius: 8, cursor: 'pointer',
            }}
          >
            <UserPlus size={15} />
            Invite Rep
          </button>
        </div>

        {/* ── Agency join code banner ── */}
        {agency?.join_code && (
          <div className="flex flex-col rounded-[8px]" style={{ gap: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Agency code
            </span>
            <div style={{ maxWidth: 360 }}>
              <CodeField code={agency.join_code} size="lg" />
            </div>
            <span style={{ fontSize: 13, color: 'var(--body)' }}>Anyone with this code can join as a rep.</span>
          </div>
        )}

        {/* ── People and invitations still out (G1) ── */}
        <TeamPeople />

        {/* ── Mobile search bar ── */}
        <div
          className="flex md:hidden items-center rounded-[8px] px-3"
          style={{
            height: 40, gap: 8,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <Search size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search reps..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 13, color: 'var(--foreground)' }}
          />
          <SlidersHorizontal size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        </div>

        {/* ── KPI cards ── */}
        {/* Desktop: 4 columns */}
        <div className="hidden md:grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase' }}>Total Reps</span>
            <span style={{ fontSize: 28, fontWeight: 600, color: '#c4a574', lineHeight: 1 }}>{totalAgents}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{watchCount} need attention</span>
          </div>
          <div style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase' }}>Avg Relationship Score</span>
            <span style={{ fontSize: 28, fontWeight: 600, color: '#c4a574', lineHeight: 1 }}>{avgScore}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Across {totalAgents} reps</span>
          </div>
          <div style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase' }}>Team Activities (MTD)</span>
            <span style={{ fontSize: 28, fontWeight: 600, color: '#c4a574', lineHeight: 1 }}>{teamActivitiesMTD}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{activeCount} reps active this month</span>
          </div>
          <div style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase' }}>Top Performer</span>
            <span style={{ fontSize: 20, fontWeight: 600, color: '#c4a574', lineHeight: 1.2 }}>
              {topPerformer?.name ?? '—'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {topPerformer
                ? `Score: ${topPerformer.avgScore} · ${topPerformer.activitiesMtd} activities`
                : 'No activity yet'}
            </span>
          </div>
        </div>

        {/* Mobile: 2×2 grid */}
        <div className="grid md:hidden" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Total Reps',    value: totalAgents,                    isName: false },
            { label: 'Active Now',    value: activeCount,                    isName: false },
            { label: 'Avg Score',     value: avgScore,                       isName: false },
            { label: 'Top Performer', value: topPerformer?.name.split(' ').map((w, i) => i === 0 ? w[0] + '.' : w).join(' ') ?? '—', isName: true },
          ].map(({ label, value, isName }) => (
            <div
              key={label}
              className="rounded-[8px] p-4"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
              <span style={{ fontSize: isName ? 17 : 24, fontWeight: 600, color: isName ? '#c4a574' : 'var(--foreground)', lineHeight: 1.1 }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Agent table — desktop ── */}
        <div
          className="hidden md:block rounded-[8px] overflow-hidden"
          style={{
            backgroundColor: 'var(--card)',
            borderTop: '2px solid #c4a574',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            borderLeft: '1px solid var(--border)',
          }}
        >
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Rep', 'Territory', 'Activities', 'Score', 'Status', 'Last Active', 'Actions'].map(col => (
                  <th
                    key={col}
                    className="text-left"
                    style={{
                      padding: '10px 16px', fontSize: 10, letterSpacing: '0.06em',
                      fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} style={{ padding: 0 }}>
                    <SkeletonRows cols={5} rows={5} />
                  </td>
                </tr>
              )}
              {!isLoading && isTeamEmpty && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center" style={{ padding: '40px 20px', gap: 12 }}>
                      <UserPlus size={28} style={{ color: 'var(--border)' }} />
                      <div className="flex flex-col items-center text-center" style={{ gap: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>No reps yet</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Invite your first rep or share your agency code to get started.</span>
                      </div>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <button
                          onClick={openInviteAgent}
                          style={{
                            height: 34, paddingLeft: 16, paddingRight: 16, fontSize: 13, fontWeight: 600,
                            backgroundColor: '#c4a574', color: '#000000', border: 'none', borderRadius: 8, cursor: 'pointer',
                          }}
                        >
                          Invite Rep
                        </button>
                        {agency?.join_code && (
                          <button
                            onClick={handleCopyCode}
                            style={{
                              height: 34, paddingLeft: 16, paddingRight: 16, fontSize: 13, fontWeight: 500,
                              backgroundColor: 'transparent', color: 'var(--foreground)',
                              border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                            }}
                          >
                            {codeCopied ? 'Copied!' : `Copy Code: ${agency.join_code}`}
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {filteredAgents.map((agent, i) => {
                const empStatus = toEmploymentStatus(agent.status)
                const statusCfg = statusConfig[empStatus]
                const isLast = i === filteredAgents.length - 1
                return (
                  <tr
                    key={agent.id}
                    style={{ height: 44, borderBottom: isLast ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    onClick={() => router.push(`/agent/${agent.id}`)}
                  >
                    <td style={{ padding: '0 16px' }}>
                      <div className="flex items-center" style={{ gap: 10 }}>
                        <div
                          className="flex items-center justify-center rounded-full shrink-0"
                          style={{ width: 28, height: 28, backgroundColor: '#c4a574', fontSize: 10, fontWeight: 600, color: '#000000' }}
                        >
                          {agent.initials}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{agent.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0 16px', fontSize: 13, color: 'var(--body)' }}>{agent.territory ?? '—'}</td>
                    <td style={{ padding: '0 16px', fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>{agent.activitiesMtd}</td>
                    <td style={{ padding: '0 16px', fontSize: 13, color: '#c4a574', fontWeight: 600 }}>{agent.avgScore}</td>
                    <td style={{ padding: '0 16px' }}>
                      <span className="flex items-center" style={{ gap: 6 }}>
                        <span className="rounded-full shrink-0" style={{ width: 6, height: 6, backgroundColor: statusCfg.dot, display: 'inline-block' }} />
                        <span style={{ fontSize: 13, color: statusCfg.textColor }}>{statusCfg.label}</span>
                      </span>
                    </td>
                    <td style={{ padding: '0 16px', fontSize: 13, color: 'var(--muted)' }}>
                      {formatLastActive(agent.lastActivity)}
                    </td>
                    <td style={{ padding: '0 16px' }}>
                      <span className="flex items-center" style={{ gap: 12 }}>
                        <Link href={`/agent/${agent.id}`} style={{ fontSize: 13, fontWeight: 500, color: '#c4a574', textDecoration: 'none' }}>
                          View
                        </Link>
                        <MakeManagerButton userId={agent.id} name={agent.name} />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Agent list — mobile (3 cols: Agent, Last Active, Status) ── */}
        <div
          className="md:hidden rounded-[8px] overflow-hidden"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Table header */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: '1fr auto auto',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {['Rep', 'Last Active', 'Status'].map(col => (
              <span
                key={col}
                style={{ fontSize: 10, letterSpacing: '0.06em', fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
              >
                {col}
              </span>
            ))}
          </div>

          {/* Empty state */}
          {isTeamEmpty && (
            <div className="flex flex-col items-center justify-center" style={{ padding: '36px 20px', gap: 12 }}>
              <UserPlus size={26} style={{ color: 'var(--border)' }} />
              <div className="flex flex-col items-center text-center" style={{ gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>No reps yet</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Invite your first rep to get started.</span>
              </div>
              <button
                onClick={openInviteAgent}
                style={{
                  height: 34, paddingLeft: 16, paddingRight: 16, fontSize: 13, fontWeight: 600,
                  backgroundColor: '#c4a574', color: '#000000', border: 'none', borderRadius: 8, cursor: 'pointer',
                }}
              >
                Invite Rep
              </button>
            </div>
          )}

          {/* Rows */}
          {mobileAgents.map((agent, i) => {
            const empStatus = toEmploymentStatus(agent.status)
            const statusCfg = statusConfig[empStatus]
            const isLast = i === mobileAgents.length - 1
            return (
              <Link
                key={agent.id}
                href={`/agent/${agent.id}`}
                className="grid items-center"
                style={{
                  gridTemplateColumns: '1fr auto auto',
                  height: 52, padding: '0 16px', gap: 12,
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  textDecoration: 'none',
                }}
              >
                {/* Agent */}
                <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
                  <div
                    className="flex items-center justify-center rounded-full shrink-0"
                    style={{ width: 28, height: 28, backgroundColor: '#c4a574', fontSize: 10, fontWeight: 600, color: '#000000' }}
                  >
                    {agent.initials}
                  </div>
                  <span className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>
                    {agent.name}
                  </span>
                </div>

                {/* Last Active */}
                <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', paddingRight: 16 }}>
                  {formatLastActive(agent.lastActivity)}
                </span>

                {/* Status badge */}
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    height: 22, paddingLeft: 8, paddingRight: 8,
                    fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
                    color: statusCfg.textColor,
                    border: `1px solid ${statusCfg.borderColor}`,
                    borderRadius: 4,
                  }}
                >
                  {statusCfg.label}
                </span>
              </Link>
            )
          })}

          {/* View all / collapse */}
          {filteredAgents.length > MOBILE_PREVIEW && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full flex items-center justify-center"
              style={{
                height: 40,
                fontSize: 13, fontWeight: 500, color: '#c4a574',
                backgroundColor: 'transparent', border: 'none',
                borderTop: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              {showAll
                ? 'Show less'
                : `View all ${filteredAgents.length} reps`}
            </button>
          )}
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>Quick Actions</span>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
            {[
              { icon: Radio,         title: 'Send Team Broadcast',    sub: 'Message all reps at once', onClick: openBroadcast },
              { icon: FileBarChart2, title: 'View Performance Report', sub: 'Weekly team analytics summary', onClick: undefined },
            ].map(({ icon: Icon, title, sub, onClick }) => (
              <button
                key={title}
                onClick={onClick}
                className="flex items-center rounded-[8px] p-4 text-left w-full"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', gap: 12, cursor: 'pointer' }}
              >
                <div
                  className="flex items-center justify-center rounded-[6px] shrink-0"
                  style={{ width: 36, height: 36, backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  <Icon size={16} style={{ color: 'var(--muted)' }} />
                </div>
                <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{title}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</span>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  )
}
