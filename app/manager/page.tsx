'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { TriangleAlert, ChevronRight, Users, BarChart2 } from 'lucide-react'
import { AICard } from '@/components/app/AICard'
import { AppShell } from '@/components/app/AppShell'
import { StatusBadge } from '@/components/app/StatusBadge'
import { OnboardingChecklist } from '@/components/app/OnboardingChecklist'
import { SkeletonRows } from '@/components/app/SkeletonRows'
import { Skeleton } from '@/components/ui/skeleton'
import type { ActivityStatus } from '@/components/app/StatusBadge'
import { useTheme } from '@/lib/context/ThemeContext'
import { useManagerDashboard } from '@/lib/hooks/useManagerDashboard'
import { useInviteAgent } from '@/lib/context/InviteAgentContext'
import { useOnboarding } from '@/lib/hooks/useOnboarding'
import type { Period } from '@/lib/api/analytics'

const PERIOD_LABELS: Record<Period, string> = { mtd: 'MTD', qtd: 'QTD', ytd: 'YTD' }

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US')
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function weekLevel(count: number): 'none' | 'low' | 'medium' | 'high' {
  if (count === 0) return 'none'
  if (count <= 2) return 'low'
  if (count <= 5) return 'medium'
  return 'high'
}

export default function ManagerPage() {
  const [period, setPeriod] = useState<Period>('mtd')
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [narrativeDismissed, setNarrativeDismissed] = useState(false)
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { openInviteAgent } = useInviteAgent()

  const { data, isLoading } = useManagerDashboard(period)
  // Ground rule: while any setup step is outstanding the checklist is the only
  // thing on the dashboard. The KPI and AI cards arrive together once it clears.
  const { holdDashboard } = useOnboarding()

  const kpis = data?.kpis ?? {
    totalActivities: 0,
    activitiesDelta: '0',
    totalSpend: 0,
    avgSpendPerAgent: 0,
    activeAgents: 0,
    totalAgents: 0,
    avgActivitiesPerAgent: 0,
    target: 20,
  }
  const breakdown = data?.breakdown ?? []
  const leaderboard = data?.leaderboard ?? []
  const alerts = data?.alerts ?? []
  const agentActivity = data?.agentActivity ?? []

  const maxCount = breakdown.reduce((m, i) => Math.max(m, i.count), 0)
  const totalActivities = breakdown.reduce((s, i) => s + i.count, 0)

  // Heatmap square colors — dark and light variants
  const heatmapColor: Record<string, string> = isDark
    ? { none: '#1f1f1f', low: '#2e2a23', medium: '#5b4a30', high: '#c4a574' }
    : { none: '#f4f4f5', low: '#fdf3e3', medium: 'rgba(125,100,70,0.2)', high: '#c4a574' }

  // Activity by Type bar colors — alternating gold / gold-dark
  const barColors = ['#c4a574', '#a68751']

  return (
    <AppShell activeItem="Dashboard">
      <div className="flex flex-col gap-4 p-6">

        {/* ── Page header ─────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--foreground)' }}>
              Dashboard
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>
              Team performance overview
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {/* Period selector */}
            <div
              className="w-full sm:w-auto flex overflow-hidden rounded-[8px]"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', height: 38, padding: 2, gap: 2 }}
            >
              {(['mtd', 'qtd', 'ytd'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="flex flex-1 items-center justify-center rounded-[6px] font-semibold transition-colors"
                  style={{
                    height: 30,
                    paddingLeft: 14,
                    paddingRight: 14,
                    fontSize: 13,
                    backgroundColor: period === p ? '#c4a574' : 'transparent',
                    color: period === p ? '#000000' : 'var(--muted)',
                  }}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Onboarding checklist — until every setup step is done ── */}
        <OnboardingChecklist />

        {/* ── AI Team Narrative ───────────────────────────── */}
        <AnimatePresence>
          {!narrativeDismissed && !holdDashboard && (
            <motion.div
              key="narrative"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden', transition: { duration: 0.18 } }}
            >
              <AICard
                label="Team Summary"
                sublabel="This week"
                readAloud
                onDismiss={() => setNarrativeDismissed(true)}
              >
                <p style={{ fontSize: 13, color: 'var(--body)', lineHeight: 1.6, margin: 0 }}>
                  Your team had a strong week. Total activities are up 12% from last month. Jane Carter continues to lead with 21 activities. Your main concern is Kevin Ross. He hasn&apos;t logged in 9 days and his relationship scores are dropping. Amy Torres is showing early warning signs too. A quick check-in with both this week would help.
                </p>
              </AICard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── KPI cards — held back until onboarding is complete ── */}
        {!holdDashboard && isLoading && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        )}
        {!holdDashboard && !isLoading && <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Total Team Activities */}
          <div
            className="flex flex-col rounded-[8px]"
            style={{
              borderTop: '2px solid #c4a574',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              backgroundColor: 'var(--card)',
              gap: 6,
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 20,
              paddingTop: 14,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.66px', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Total Team Activities
            </span>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#c4a574', lineHeight: 1 }}>
              {kpis.totalActivities}
            </span>
            <span style={{ fontSize: 12, color: '#16a34a' }}>
              ↑ {kpis.activitiesDelta}% from last month
            </span>
          </div>

          {/* Total Team Spend */}
          <div
            className="flex flex-col rounded-[8px]"
            style={{
              borderTop: '2px solid #c4a574',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              backgroundColor: 'var(--card)',
              gap: 6,
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 20,
              paddingTop: 14,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.66px', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Total Team Spend
            </span>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#c4a574', lineHeight: 1 }}>
              {formatCurrency(kpis.totalSpend)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {formatCurrency(kpis.avgSpendPerAgent)} avg per agent
            </span>
          </div>

          {/* Active Agents */}
          <div
            className="flex flex-col rounded-[8px]"
            style={{
              borderTop: '2px solid #c4a574',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              backgroundColor: 'var(--card)',
              gap: 6,
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 20,
              paddingTop: 14,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.66px', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Active Reps
            </span>
            <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>
              {kpis.activeAgents} / {kpis.totalAgents}
            </span>
            <span style={{ fontSize: 12, color: kpis.activeAgents < kpis.totalAgents ? '#d97706' : '#16a34a' }}>
              {kpis.activeAgents < kpis.totalAgents
                ? `${kpis.totalAgents - kpis.activeAgents} rep below threshold`
                : 'All reps active'}
            </span>
          </div>

          {/* Avg Activities / Agent */}
          <div
            className="flex flex-col rounded-[8px]"
            style={{
              borderTop: '2px solid #c4a574',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              backgroundColor: 'var(--card)',
              gap: 6,
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 20,
              paddingTop: 14,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.66px', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Avg Activities / Rep
            </span>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#c4a574', lineHeight: 1 }}>
              {kpis.avgActivitiesPerAgent.toFixed(1)}
            </span>
            <span style={{ fontSize: 12, color: kpis.avgActivitiesPerAgent >= kpis.target ? '#16a34a' : '#d97706' }}>
              Target: {kpis.target} · {kpis.avgActivitiesPerAgent >= kpis.target ? 'On track' : 'Below target'}
            </span>
          </div>
        </div>}

        {/* ── Two-column row ──────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="app-card min-w-0 flex-1">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <Skeleton className="h-5 w-32" />
              </div>
              <SkeletonRows cols={5} rows={5} />
            </div>
            <Skeleton className="w-full lg:w-[340px] h-64 rounded-lg" />
          </div>
        )}
        {!isLoading && <div className="flex flex-col gap-4 lg:flex-row">

          {/* ─ Team Leaderboard ─────────────────────────── */}
          <div
            className="min-w-0 flex-1 overflow-hidden rounded-[8px]"
            style={{
              borderTop: '2px solid #c4a574',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              backgroundColor: 'var(--card)',
            }}
          >
            {/* Alert banner — attached to top of leaderboard */}
            <AnimatePresence>
              {!alertDismissed && alerts.length > 0 && (
                <motion.div
                  initial={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between overflow-hidden"
                  style={{
                    height: 36,
                    paddingLeft: 14,
                    paddingRight: 14,
                    borderLeft: '3px solid #c4a574',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <TriangleAlert size={14} color="#c4a574" className="shrink-0" />
                    <span
                      className="truncate"
                      style={{ fontSize: 12, fontWeight: 600, color: 'var(--body)' }}
                    >
                      {alerts[0].agentName}: {alerts[0].message}{' '}
                      <span
                        className="cursor-pointer hover:underline"
                        style={{ color: '#c4a574' }}
                        onClick={() => router.push('/coming-soon')}
                      >
                        Review now →
                      </span>
                    </span>
                  </div>
                  <button
                    onClick={() => setAlertDismissed(true)}
                    className="shrink-0"
                    style={{ fontSize: 12, color: 'var(--muted)' }}
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Card header */}
            <div
              className="flex items-center justify-between"
              style={{ height: 44, paddingLeft: 16, paddingRight: 16, borderBottom: '1px solid var(--border)' }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
                Team Leaderboard
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                Top {leaderboard.length} reps
              </span>
            </div>

            {/* Column headers — desktop */}
            <div
              className="hidden items-center lg:flex"
              style={{ height: 32, paddingLeft: 16, paddingRight: 16, borderBottom: '1px solid var(--border)' }}
            >
              {([
                { label: 'RANK',       w: 40,         flex: undefined },
                { label: 'REP',        w: undefined,  flex: 1         },
                { label: 'ACTIVITIES', w: 80,         flex: undefined },
                { label: 'SPEND',      w: 80,         flex: undefined },
                { label: 'SCORE',      w: 70,         flex: undefined },
                { label: 'LAST LOG',   w: 90,         flex: undefined },
                { label: 'STATUS',     w: 110,        flex: undefined },
              ] as { label: string; w?: number; flex?: number }[]).map(col => (
                <span
                  key={col.label}
                  style={{
                    width: col.w,
                    flex: col.flex,
                    flexShrink: col.flex ? undefined : 0,
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.8px',
                    color: 'var(--muted)',
                  }}
                >
                  {col.label}
                </span>
              ))}
            </div>

            {/* Empty state */}
            {leaderboard.length === 0 && (
              <div className="flex flex-col items-center justify-center" style={{ padding: '40px 20px', gap: 10 }}>
                <Users size={28} style={{ color: 'var(--border)' }} />
                <div className="flex flex-col items-center text-center" style={{ gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>No reps yet</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Invite your first rep to see team performance here.</span>
                </div>
                <button
                  onClick={openInviteAgent}
                  style={{
                    height: 32, paddingLeft: 16, paddingRight: 16, fontSize: 12, fontWeight: 600,
                    backgroundColor: '#c4a574', color: '#000000', border: 'none', borderRadius: 6, cursor: 'pointer',
                  }}
                >
                  Invite Rep
                </button>
              </div>
            )}

            {/* Rows */}
            {leaderboard.map((agent, idx) => {
              const isFirst = idx === 0
              const isLast = idx === leaderboard.length - 1
              return (
                <div
                  key={agent.rank}
                  className="group flex cursor-pointer items-center transition-colors hover:bg-[var(--surface)]"
                  style={{
                    height: 36,
                    paddingLeft: 16,
                    paddingRight: 16,
                    borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  }}
                  onClick={() => router.push(`/agent/${agent.id}`)}
                >
                  {/* RANK */}
                  <div className="flex shrink-0 items-center gap-1.5" style={{ width: 40 }}>
                    {isFirst && (
                      <div
                        className="rounded-full"
                        style={{ width: 8, height: 8, backgroundColor: '#c4a574', flexShrink: 0 }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isFirst ? 600 : 400,
                        color: isFirst ? '#c4a574' : 'var(--muted)',
                      }}
                    >
                      {agent.rank}
                    </span>
                  </div>

                  {/* AGENT — desktop */}
                  <div className="hidden shrink-0 items-center gap-2 lg:flex" style={{ flex: 1 }}>
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: isFirst ? '#c4a574' : 'var(--surface)',
                        color: isFirst ? '#000000' : 'var(--muted)',
                        border: isFirst ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      {agent.initials}
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isFirst ? 600 : 500,
                        color: 'var(--foreground)',
                      }}
                    >
                      {agent.name}
                    </span>
                  </div>

                  {/* AGENT — mobile */}
                  <div className="flex flex-1 items-center gap-2 lg:hidden">
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: isFirst ? '#c4a574' : 'var(--surface)',
                        color: isFirst ? '#000000' : 'var(--muted)',
                      }}
                    >
                      {agent.initials}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)' }}>
                      {agent.name}
                    </span>
                  </div>

                  {/* ACTIVITIES */}
                  <span
                    className="hidden shrink-0 lg:block"
                    style={{
                      width: 80,
                      fontSize: 12,
                      fontWeight: 700,
                      color: isFirst ? '#c4a574' : 'var(--foreground)',
                    }}
                  >
                    {agent.activities}
                  </span>

                  {/* SPEND */}
                  <span
                    className="hidden shrink-0 lg:block"
                    style={{ width: 80, fontSize: 12, color: 'var(--muted)' }}
                  >
                    {formatCurrency(agent.spend)}
                  </span>

                  {/* SCORE */}
                  <span
                    className="hidden shrink-0 lg:block"
                    style={{ width: 70, fontSize: 12, fontWeight: 600, color: '#c4a574' }}
                  >
                    {agent.score ? Math.round(agent.score) : '—'}
                  </span>

                  {/* LAST LOG */}
                  <span
                    className="hidden shrink-0 lg:block"
                    style={{ width: 90, fontSize: 12, color: 'var(--muted)' }}
                  >
                    {agent.lastLog ? formatDate(agent.lastLog) : '—'}
                  </span>

                  {/* STATUS */}
                  <div className="hidden shrink-0 items-center lg:flex" style={{ width: 110 }}>
                    <StatusBadge status={agent.status as ActivityStatus} />
                  </div>

                  {/* Mobile: activities + status */}
                  <div className="flex shrink-0 items-center gap-2 lg:hidden">
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {agent.activities}
                    </span>
                    <StatusBadge status={agent.status as ActivityStatus} />
                  </div>

                  {/* Desktop hover chevron */}
                  <ChevronRight
                    size={12}
                    className="ml-auto hidden shrink-0 opacity-0 transition-opacity group-hover:opacity-100 lg:block"
                    style={{ color: 'var(--muted)' }}
                  />
                </div>
              )
            })}

            {/* View all link */}
            <div
              className="flex items-center justify-end"
              style={{ height: 36, paddingRight: 16, borderTop: '1px solid var(--border)' }}
            >
              <button
                onClick={() => router.push('/team')}
                style={{ fontSize: 12, color: '#c4a574' }}
                className="hover:underline"
              >
                View all {kpis.totalAgents} reps →
              </button>
            </div>
          </div>

          {/* ─ Activity by Type card ─────────────────────── */}
          <div
            className="w-full shrink-0 overflow-hidden rounded-[8px] lg:w-[326px]"
            style={{
              borderTop: '2px solid #c4a574',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              backgroundColor: 'var(--card)',
            }}
          >
            {/* Card header */}
            <div
              className="flex items-center justify-between"
              style={{ height: 44, paddingLeft: 16, paddingRight: 16, borderBottom: '1px solid var(--border)' }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
                Activity by Type
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                Total {totalActivities}
              </span>
            </div>

            {/* Bar rows */}
            <div className="flex flex-col gap-[10px]" style={{ padding: '10px 16px 12px' }}>
              {breakdown.length === 0 && (
                <div className="flex flex-col items-center justify-center" style={{ padding: '24px 0', gap: 8 }}>
                  <BarChart2 size={24} style={{ color: 'var(--border)' }} />
                  <span style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                    Activity data will appear once reps start logging.
                  </span>
                </div>
              )}
              {breakdown.map((item, i) => {
                const barPct = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                const pct = totalActivities > 0 ? Math.round((item.count / totalActivities) * 100) : 0
                const barColor = barColors[i % barColors.length]
                return (
                  <div key={item.type} className="flex flex-col gap-[5px]">
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 12, color: 'var(--body)' }}>{item.type}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>
                        {item.count} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div
                      className="overflow-hidden rounded-[4px]"
                      style={{ height: 10, backgroundColor: isDark ? '#2a2a2a' : '#f4f4f5' }}
                    >
                      <div
                        className="h-full rounded-[4px] transition-all duration-300"
                        style={{ width: `${barPct}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                )
              })}

              {/* Divider + total */}
              <div style={{ height: 1, backgroundColor: 'var(--border)', marginTop: 2 }} />
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Total</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>
                  {totalActivities}
                </span>
              </div>
            </div>
          </div>
        </div>}

        {/* ── Agent Activity heatmap card ─────────────────── */}
        {isLoading && <Skeleton className="h-48 w-full rounded-lg" />}
        {!isLoading && <div
          className="overflow-hidden rounded-[8px]"
          style={{
            borderTop: '2px solid #c4a574',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            borderLeft: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            backgroundColor: 'var(--card)',
          }}
        >
          {/* Card header */}
          <div
            className="flex items-center justify-between"
            style={{ height: 44, paddingLeft: 16, paddingRight: 16, borderBottom: '1px solid var(--border)' }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
              Rep Activity This Month
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {PERIOD_LABELS[period]}
            </span>
          </div>

          {/* Grid — 2 rows × 4 cols */}
          <div className="flex flex-col gap-3" style={{ padding: '12px 16px 14px' }}>
            {agentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center" style={{ padding: '28px 0', gap: 8 }}>
                <Users size={24} style={{ color: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                  Rep activity heatmap will appear once your team is active.
                </span>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {agentActivity.map(agent => (
                <div
                  key={agent.name}
                  onClick={() => router.push(`/agent/${agent.id}`)}
                  className="flex flex-col gap-[10px] rounded-[8px] p-[10px] hover:opacity-90 transition-opacity"
                  style={{
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    cursor: 'pointer',
                  }}
                >
                  {/* Row 1: avatar + name + status badge */}
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: agent.level === 'high' ? '#c4a574' : 'var(--border)',
                        color: agent.level === 'high' ? '#000000' : 'var(--muted)',
                      }}
                    >
                      {agent.initials}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span
                        className="truncate"
                        style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.3 }}
                      >
                        {agent.name.split(' ')[0]}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.2 }}>
                        {agent.activities} acts
                      </span>
                    </div>
                    <StatusBadge status={agent.status as ActivityStatus} />
                  </div>

                  {/* Row 2: week labels */}
                  <div className="flex gap-[6px]">
                    {['Wk1', 'Wk2', 'Wk3', 'Wk4'].map(wk => (
                      <span
                        key={wk}
                        className="flex-1 text-center"
                        style={{ fontSize: 9, color: 'var(--muted)' }}
                      >
                        {wk}
                      </span>
                    ))}
                  </div>

                  {/* Row 3: 4 colored squares */}
                  <div className="flex gap-[6px]">
                    {agent.weeks.map((weekCount, wi) => {
                      const level = weekLevel(weekCount)
                      return (
                        <div
                          key={wi}
                          className="flex-1 rounded-[3px]"
                          style={{
                            height: 28,
                            backgroundColor: heatmapColor[level],
                          }}
                          title={`Wk${wi + 1}: ${weekCount} activities`}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            )}

            {/* Legend */}
            {agentActivity.length > 0 && (
            <div className="flex items-center justify-end gap-1.5">
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>Less</span>
              {(['none', 'low', 'medium', 'high'] as const).map(level => (
                <div
                  key={level}
                  className="rounded-[2px]"
                  style={{ width: 10, height: 10, backgroundColor: heatmapColor[level] }}
                />
              ))}
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>More</span>
            </div>
            )}
          </div>
        </div>}

      </div>
    </AppShell>
  )
}
