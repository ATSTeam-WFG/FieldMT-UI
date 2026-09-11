'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Utensils,
  Gift,
  GraduationCap,
  Coffee,
  Package,
  Phone,
  Star,
  Circle,
  ClipboardList,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AppShell } from '@/components/app/AppShell'
import { KPICard } from '@/components/app/KPICard'
import { AICard } from '@/components/app/AICard'
import { StatusBadge } from '@/components/app/StatusBadge'
import { OnboardingChecklist } from '@/components/app/OnboardingChecklist'
import { SkeletonRows } from '@/components/app/SkeletonRows'
import { Skeleton } from '@/components/ui/skeleton'
import type { ActivityStatus } from '@/components/app/StatusBadge'
import { useRole } from '@/lib/context/RoleContext'
import { useActivityLog } from '@/lib/context/ActivityLogContext'
import { useContract } from '@/lib/context/ContractContext'
import { useAgentKpis } from '@/lib/hooks/useAgentKpis'
import { useAgentNudge } from '@/lib/hooks/useAgentNudge'
import { useActivities } from '@/lib/hooks/useActivities'
import { useContracts } from '@/lib/hooks/useContracts'
import { useOnboarding } from '@/lib/hooks/useOnboarding'

function formatPipelineValue(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'k'
  return '$' + n
}

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

export default function DashboardPage() {
  const { persona } = useRole()
  const { openLog, openLogWithContact, openActivity } = useActivityLog()
  const { openLog: openContract } = useContract()
  const firstName = persona.name.split(' ')[0]
  const [nudgeDismissed, setNudgeDismissed] = useState(false)

  const { data: kpis, isLoading: kpisLoading } = useAgentKpis()
  const { data: nudge } = useAgentNudge()
  const { data: activitiesData, isLoading: activitiesLoading } = useActivities({ page_size: 5 })
  const { data: contractsData, isLoading: contractsLoading } = useContracts()
  // Ground rule: while any setup step is outstanding the checklist is the only
  // thing on the dashboard. The KPI and AI cards arrive together once it clears.
  const { holdDashboard } = useOnboarding()

  const isLoading = kpisLoading || activitiesLoading || contractsLoading
  const recentActivities = activitiesData?.items ?? []

  const now = new Date()
  const closedThisMonth = (contractsData?.items ?? []).filter(c => {
    if (c.status !== 'closed' || !c.actual_closing_date) return false
    const d = new Date(c.actual_closing_date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const pipelineValue = (contractsData?.items ?? [])
    .filter(c => c.status !== 'closed')
    .reduce((sum, c) => sum + (c.amount ?? 0), 0)

  return (
    <AppShell activeItem="Dashboard">
      <div className="flex flex-col" style={{ gap: 0 }}>

        {/* ── Page header ───────────────────────────────── */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col" style={{ gap: 4 }}>
            <h1
              className="font-semibold leading-tight"
              style={{ fontSize: 22, color: 'var(--foreground)' }}
            >
              Dashboard
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>
              Good morning, {firstName}. Here&apos;s your activity summary.
            </p>
          </div>

          {/* Header action buttons — full-width row on mobile, inline on desktop */}
          <div className="flex items-center" style={{ gap: 10 }}>
            <button
              onClick={openContract}
              className="flex flex-1 md:flex-none items-center justify-center gap-1.5 rounded-[8px] font-semibold transition-opacity hover:opacity-90 active:opacity-80"
              style={{
                height: 40,
                paddingLeft: 16,
                paddingRight: 16,
                fontSize: 13,
                backgroundColor: '#c4a574',
                color: '#000000',
                border: 'none',
              }}
            >
              <Plus size={13} color="#000000" />
              Add Contract
            </button>
            <button
              onClick={openLog}
              className="flex flex-1 md:flex-none items-center justify-center gap-1.5 rounded-[8px] font-semibold transition-opacity hover:opacity-90 active:opacity-80"
              style={{
                height: 40,
                paddingLeft: 16,
                paddingRight: 16,
                fontSize: 13,
                backgroundColor: '#c4a574',
                color: '#000000',
                border: 'none',
              }}
            >
              <Plus size={13} color="#000000" />
              Log Activity
            </button>
          </div>
        </div>

        {/* ── Onboarding checklist — until every setup step is done ── */}
        <OnboardingChecklist style={{ marginTop: 16 }} />

        {/* ── AI Priority Nudge ─────────────────────────── */}
        <AnimatePresence>
          {!nudgeDismissed && !holdDashboard && nudge && (
            <motion.div
              key="nudge"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
              exit={{ opacity: 0, height: 0, marginTop: 0, overflow: 'hidden', transition: { duration: 0.18 } }}
              style={{ marginTop: 16 }}
            >
              <AICard label="Daily Nudge" onDismiss={() => setNudgeDismissed(true)}>
                <p style={{ fontSize: 13, color: 'var(--body)', lineHeight: 1.6, maxWidth: 560, margin: 0 }}>
                  {nudge.message}{' '}
                  <button
                    onClick={() => openLogWithContact(nudge.contact_name)}
                    className="hover:underline"
                    style={{ color: '#c4a574', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
                  >
                    Log activity now →
                  </button>
                </p>
              </AICard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── KPI cards — held back until onboarding is complete ── */}
        {holdDashboard ? null : isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4" style={{ marginTop: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4"
            style={{ marginTop: 20 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
            initial="hidden"
            animate="show"
          >
            {[
              { label: 'ACTIVITIES THIS WEEK', value: kpis?.activitiesThisWeek ?? '—', subLabel: kpis?.activitiesWeekDelta ?? '', subLabelColor: kpis?.activitiesWeekDeltaPositive ? '#16a34a' : '#d97706', href: '/activities' },
              { label: 'TOTAL SPEND MTD',      value: kpis?.totalSpendMTD ?? '—',       subLabel: kpis?.spendSubLabel ?? '',                                                                                   href: '/performance' },
              { label: 'CONTACTS ENGAGED',     value: kpis?.contactsEngaged ?? '—',     subLabel: kpis?.contactsSubLabel ?? '',                                                                                href: '/contacts' },
              { label: 'FOLLOW-UPS PENDING',   value: kpis?.followUpsPending ?? '—',    subLabel: `${kpis?.followUpsOverdue ?? 0} overdue`, subLabelColor: '#d97706',                                         href: '/follow-ups' },
              { label: 'CLOSED THIS MONTH',    value: closedThisMonth,                  subLabel: 'Contracts closed MTD', subLabelColor: '#16a34a',                                                           href: '/contracts' },
              { label: 'PIPELINE VALUE',       value: formatPipelineValue(pipelineValue), subLabel: 'Non-closed contracts',                                                                                    href: '/contracts' },
            ].map(card => (
              <motion.div
                key={card.label}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.2 } } }}
              >
                <KPICard {...card} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── AI Performance Summary ────────────────────── */}
        {!holdDashboard && (
          <div style={{ marginTop: 16 }}>
            <AICard label="Summary" sublabel="Updated today" readAloud>
              <p style={{ fontSize: 13, color: 'var(--body)', lineHeight: 1.6, margin: 0 }}>
                This week you&apos;ve logged {kpis?.activitiesThisWeek ?? '—'} {kpis?.activitiesThisWeek === 1 ? 'activity' : 'activities'}.
                {kpis?.topContactName
                  ? ` Your strongest relationship is ${kpis.topContactName} (score ${kpis.topRelationshipScore}).`
                  : ''}
                {nudge
                  ? ` ${nudge.message}`
                  : ' All your key relationships are looking healthy.'}
              </p>
            </AICard>
          </div>
        )}

        {/* ── Two-column row ────────────────────────────── */}
        {isLoading ? (
          <div className="flex flex-col md:flex-row" style={{ gap: 16, marginTop: 24 }}>
            <Skeleton className="app-card min-w-0 flex-1 h-64 rounded-lg" />
            <Skeleton className="w-full md:w-[310px] h-64 rounded-lg" />
          </div>
        ) : (
        <div
          className="flex flex-col md:flex-row"
          style={{ gap: 16, marginTop: 24 }}
        >
          {/* ─ Recent Activity card ───────────────────── */}
          <div className="app-card min-w-0 flex-1">
            {/* Card header */}
            <div
              className="flex items-center justify-between"
              style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}
            >
              <span
                className="font-semibold"
                style={{ fontSize: 14, color: 'var(--foreground)' }}
              >
                Recent Activity
              </span>
              <Link
                href="/activities"
                style={{ fontSize: 12, color: '#c4a574' }}
                className="hover:underline"
              >
                View all →
              </Link>
            </div>

            {/* Table header — hidden on mobile */}
            <div
              className="hidden md:flex items-center"
              style={{
                height: 32,
                padding: '0 20px',
                borderBottom: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
              }}
            >
              {(['TYPE', 'CONTACT', 'DATE', 'COST', 'STATUS'] as const).map((col, i) => (
                <span
                  key={col}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.06em',
                    color: 'var(--muted)',
                    flex: i === 0 ? 1.5 : i === 1 ? 2 : i === 2 ? 1 : i === 3 ? 0.8 : 1,
                    minWidth: 0,
                  }}
                >
                  {col}
                </span>
              ))}
            </div>

            {/* Rows area — min-height matches 5 rows so the card stays balanced against the streak card */}
            <div style={{ minHeight: 260 }}>

            {/* Empty state */}
            {recentActivities.length === 0 && (
              <div className="flex flex-col items-center justify-center" style={{ padding: '36px 20px', gap: 10 }}>
                <ClipboardList size={28} style={{ color: 'var(--border)' }} />
                <div className="flex flex-col items-center text-center" style={{ gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>No activities yet</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Log your first activity to see it here.</span>
                </div>
                <button
                  onClick={openLog}
                  style={{
                    height: 32, paddingLeft: 16, paddingRight: 16, fontSize: 12, fontWeight: 600,
                    backgroundColor: '#c4a574', color: '#000000', border: 'none', borderRadius: 6, cursor: 'pointer',
                  }}
                >
                  Log Activity
                </button>
              </div>
            )}

            {/* Table rows */}
            {recentActivities.map((act, idx) => {
              const Icon = activityIconMap[act.type] ?? Circle
              const isLast = idx === recentActivities.length - 1

              return (
                <div
                  key={act.id}
                  onClick={() => openActivity(act as any)}
                  className="flex items-center px-4 md:px-5 hover:bg-[var(--surface)]"
                  style={{
                    height: 52,
                    borderBottom: isLast ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {/* TYPE — fixed width on mobile, flex on desktop */}
                  <div
                    className="flex shrink-0 items-center md:shrink md:flex-[1.5] md:min-w-0"
                    style={{ gap: 6, width: 80 }}
                  >
                    <Icon size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span className="truncate" style={{ fontSize: 13, color: 'var(--body)' }}>
                      {act.type}
                    </span>
                  </div>

                  {/* CONTACT — hidden on mobile, shown inline on mobile below */}
                  <div
                    className="hidden md:flex flex-col justify-center"
                    style={{ gap: 2, flex: 2, minWidth: 0 }}
                  >
                    <span className="truncate" style={{ fontSize: 13, color: 'var(--body)' }}>
                      {act.contactName}
                    </span>
                    <span className="truncate" style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {act.contactCompany}
                    </span>
                  </div>

                  {/* DATE */}
                  <span
                    className="hidden md:block truncate"
                    style={{ fontSize: 13, color: 'var(--muted)', flex: 1, minWidth: 0 }}
                  >
                    {formatRelativeDate(act.date)}
                  </span>

                  {/* COST */}
                  <span
                    className="hidden md:block"
                    style={{ fontSize: 13, color: 'var(--body)', flex: 0.8, minWidth: 0 }}
                  >
                    {act.spend > 0 ? `$${act.spend}` : '—'}
                  </span>

                  {/* STATUS */}
                  <div className="hidden md:flex items-center" style={{ flex: 1, minWidth: 0 }}>
                    <StatusBadge status={act.status as ActivityStatus} />
                  </div>

                  {/* Mobile: contact + status stacked on right */}
                  <div className="flex flex-1 min-w-0 items-center justify-between gap-2 md:hidden">
                    <div className="flex min-w-0 flex-col" style={{ gap: 2 }}>
                      <span className="truncate" style={{ fontSize: 13, color: 'var(--body)' }}>
                        {act.contactName}
                      </span>
                      <span className="truncate" style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {formatRelativeDate(act.date)}
                      </span>
                    </div>
                    <StatusBadge status={act.status as ActivityStatus} />
                  </div>
                </div>
              )
            })}

            </div>{/* end rows area */}
          </div>

          {/* ─ Activity Streak card ───────────────────── */}
          <div className="app-card w-full shrink-0 md:w-[310px]">
            {/* Card header */}
            <div
              className="flex items-center justify-between"
              style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}
            >
              <span
                className="font-semibold"
                style={{ fontSize: 14, color: 'var(--foreground)' }}
              >
                This Week
              </span>
              <span
                className="font-semibold"
                style={{ fontSize: 13, color: '#c4a574' }}
              >
                {kpis?.weekStreak.label ?? '—'}
              </span>
            </div>

            {/* Day pills */}
            <div
              className="flex items-center justify-between"
              style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', gap: 4 }}
            >
              {(kpis?.weekStreak.days ?? ['M','T','W','T','F','S','S']).map((day, i) => {
                const active = kpis?.weekStreak.active[i] ?? false
                const isToday = kpis?.weekStreak.isToday[i] ?? false
                return (
                  <div
                    key={i}
                    className="flex items-center justify-center rounded-[4px]"
                    style={{
                      width: isToday ? 34 : 32,
                      height: isToday ? 30 : 28,
                      backgroundColor: active ? '#c4a574' : 'transparent',
                      border: active
                        ? isToday ? '1px solid var(--gold-hover)' : 'none'
                        : '1px solid var(--border)',
                      fontSize: isToday ? 12 : 11,
                      fontWeight: active ? (isToday ? 700 : 600) : 400,
                      color: active ? '#000000' : 'var(--muted)',
                    }}
                  >
                    {day}
                  </div>
                )
              })}
            </div>

            {/* Stats */}
            <div className="flex flex-col" style={{ padding: '12px 20px' }}>
              {holdDashboard && (
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, marginBottom: 8, lineHeight: 1.5 }}>
                  Log activities to build your weekly streak and track consistency.
                </p>
              )}
              {[
                { label: 'Avg cost per activity', value: kpis?.streakStats.avgCostPerActivity ?? '—', gold: false },
                { label: 'Most active type',      value: kpis?.streakStats.mostActiveType ?? '—',     gold: false },
                { label: 'Longest streak',        value: kpis?.streakStats.longestStreak ?? '—',      gold: true  },
              ].map(({ label, value, gold }, i, arr) => (
                <div
                  key={label}
                  className="flex items-center justify-between"
                  style={{
                    height: 36,
                    borderTop:    i > 0           ? '1px solid var(--border)' : 'none',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: gold ? 600 : 400,
                      color: gold ? '#c4a574' : 'var(--body)',
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

      </div>
    </AppShell>
  )
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  const diffWeeks = Math.floor(diffDays / 7)
  return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`
}
