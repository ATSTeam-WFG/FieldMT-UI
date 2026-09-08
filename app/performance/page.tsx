'use client'

import { useState } from 'react'
import { useMyAgency } from '@/lib/hooks/useMyAgency'
import { TrendingUp } from 'lucide-react'
import { AICard } from '@/components/app/AICard'
import { AppShell } from '@/components/app/AppShell'
import { KPICard } from '@/components/app/KPICard'
import { Skeleton } from '@/components/ui/skeleton'
import { useRole } from '@/lib/context/RoleContext'
import { useAgentKpis } from '@/lib/hooks/useAgentKpis'
import { useAgentNudge } from '@/lib/hooks/useAgentNudge'
import { useAgentPerformance } from '@/lib/hooks/useAgentPerformance'
import { useManagerPerformance } from '@/lib/hooks/useManagerPerformance'
import { SponsorActivitySection } from '@/components/app/SponsorActivitySection'
import { ActivityHeatmap } from '@/components/app/ActivityHeatmap'
import { useActivityHeatmap } from '@/lib/hooks/useActivityHeatmap'
import type { Period, SponsorSpendItem, AgentEfficiencyEntry } from '@/lib/api/analytics'
import {
  BarChart,
  Bar as BarRecharts,
  XAxis as XAxisRecharts,
  YAxis as YAxisRecharts,
  CartesianGrid as CartesianGridRecharts,
  Tooltip as TooltipRecharts,
  ResponsiveContainer as ResponsiveContainerRecharts,
} from 'recharts'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        backgroundColor: '#171717',
        border: '1px solid #27272a',
        borderRadius: 8,
        padding: '10px 14px',
        color: '#ffffff',
        fontSize: 13,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 6 }}>{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color, margin: '2px 0' }}>
          {entry.name === 'spend' ? `Spend: $${entry.value}` : `Activities: ${entry.value}`}
        </p>
      ))}
    </div>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────

const PERIOD_LABEL: Record<Period, string> = { mtd: 'MTD', qtd: 'QTD', ytd: 'YTD' }

function PeriodToggle({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  return (
    <div style={{
      display: 'flex', gap: 2, alignSelf: 'flex-start',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 6, padding: 2,
    }}>
      {(['mtd', 'qtd', 'ytd'] as Period[]).map(p => (
        <button key={p} onClick={() => onChange(p)} style={{
          height: 28, padding: '0 14px', borderRadius: 4, border: 'none',
          background: period === p ? '#c4a574' : 'transparent',
          color: period === p ? '#000' : 'var(--muted)',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {p}
        </button>
      ))}
    </div>
  )
}

function SectionToggle<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{
      display: 'flex', gap: 2,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 6, padding: 2,
    }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          height: 24, padding: '0 10px', borderRadius: 4, border: 'none',
          background: value === o.value ? '#c4a574' : 'transparent',
          color: value === o.value ? '#000' : 'var(--muted)',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function InitialsAvatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: '#c4a574', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.34, fontWeight: 700, color: '#000',
    }}>
      {initials}
    </div>
  )
}

function SectionEmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: '32px 20px', textAlign: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>{text}</p>
    </div>
  )
}

// ── Spend Efficiency section ───────────────────────────────────────────────────

type EffMode = 'score' | 'spend' | 'activities'

const EFF_OPTIONS: { value: EffMode; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'spend', label: '$/Closing' },
  { value: 'activities', label: 'Activities/Closing' },
]

function SpendEfficiencySection({
  eff,
}: { eff: { spendPerClosing: number | null; activitiesPerClosing: number | null; efficiencyScore: number; totalSpend: number; totalActivities: number; closedContracts: number } }) {
  const [mode, setMode] = useState<EffMode>('score')

  const hasClosings = eff.closedContracts > 0

  const displayValue =
    mode === 'score'      ? String(eff.efficiencyScore) :
    mode === 'spend'      ? (eff.spendPerClosing != null ? `$${eff.spendPerClosing.toFixed(0)}` : '—') :
                            (eff.activitiesPerClosing != null ? eff.activitiesPerClosing.toFixed(1) : '—')

  const displayLabel =
    mode === 'score'      ? 'out of 100' :
    mode === 'spend'      ? 'per closing' :
                            'activities per closing'

  return (
    <div className="app-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Desktop header: title + inline toggle */}
      <div className="hidden md:flex items-center justify-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span className="font-semibold" style={{ fontSize: 14, color: 'var(--foreground)' }}>Spend Efficiency</span>
        {hasClosings && <SectionToggle options={EFF_OPTIONS} value={mode} onChange={setMode} />}
      </div>
      {/* Mobile header: title row + full-width tab bar */}
      <div className="flex flex-col md:hidden" style={{ flexShrink: 0 }}>
        <div style={{ padding: '14px 20px 10px' }}>
          <span className="font-semibold" style={{ fontSize: 14, color: 'var(--foreground)' }}>Spend Efficiency</span>
        </div>
        <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
          {hasClosings ? EFF_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setMode(o.value as EffMode)}
              style={{
                flex: 1, height: 36, border: 'none', background: 'transparent', cursor: 'pointer',
                borderBottom: mode === o.value ? '2px solid #c4a574' : '2px solid transparent',
                color: mode === o.value ? '#c4a574' : 'var(--muted)',
                fontSize: 12, fontWeight: mode === o.value ? 600 : 400,
                marginBottom: -1,
              }}
            >
              {o.label}
            </button>
          )) : null}
        </div>
      </div>
      <div style={{ flex: 1, padding: '12px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {hasClosings ? (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div className="text-[28px] md:text-[40px]" style={{ fontWeight: 700, color: '#c4a574', lineHeight: 1 }}>{displayValue}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>{displayLabel}</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              No closings recorded this period.
              <br />
              Mark contracts as closed to track your ROI.
            </div>
          </div>
        )}
        <div className="grid grid-cols-3" style={{ gap: 1, backgroundColor: 'var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { label: 'Total Spend', value: `$${eff.totalSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
            { label: 'Activities', value: String(eff.totalActivities) },
            { label: 'Closings', value: String(eff.closedContracts) },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '8px 16px', backgroundColor: 'var(--surface)', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sponsor Activity section ───────────────────────────────────────────────────


// ── Agent Efficiency section (manager) ────────────────────────────────────────

function AgentEfficiencySection({ agents }: { agents: AgentEfficiencyEntry[] }) {
  const [mode, setMode] = useState<EffMode>('score')

  const sorted = [...agents].sort((a, b) => {
    if (mode === 'score') return b.efficiencyScore - a.efficiencyScore
    if (mode === 'spend') {
      const av = a.spendPerClosing ?? Infinity
      const bv = b.spendPerClosing ?? Infinity
      return av - bv  // lower is better
    }
    const av = a.activitiesPerClosing ?? Infinity
    const bv = b.activitiesPerClosing ?? Infinity
    return av - bv
  })

  return (
    <div className="app-card" style={{ marginTop: 16 }}>
      <div className="flex items-center justify-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <span className="font-semibold" style={{ fontSize: 14, color: 'var(--foreground)' }}>Spend Efficiency by Agent</span>
        <SectionToggle options={EFF_OPTIONS} value={mode} onChange={setMode} />
      </div>
      {sorted.length === 0
        ? <SectionEmptyState text="No performance data this period." />
        : sorted.map((agent, i) => {
          const metric =
            mode === 'score' ? `${agent.efficiencyScore}/100` :
            mode === 'spend' ? (agent.spendPerClosing != null ? `$${agent.spendPerClosing.toFixed(0)}/closing` : '—') :
            (agent.activitiesPerClosing != null ? `${agent.activitiesPerClosing.toFixed(1)} acts/closing` : '—')

          return (
            <div key={agent.agentId} className="flex items-center" style={{
              padding: '12px 20px', gap: 12,
              borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <InitialsAvatar initials={agent.initials} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center justify-between flex-wrap" style={{ gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{agent.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#c4a574', flexShrink: 0 }}>{metric}</span>
                </div>
              </div>
            </div>
          )
        })
      }
    </div>
  )
}

// ── Manager view ──────────────────────────────────────────────────────────────

function ManagerPerformancePage() {
  const { data: agency } = useMyAgency()
  const [period, setPeriod] = useState<Period>('mtd')
  const { data, isLoading } = useManagerPerformance(period)

  const teamWeeklyData = data?.teamWeekly ?? []
  const activityTypeBreakdown = data?.activityBreakdown ?? []
  const agents = data?.agents ?? []
  const maxCount = activityTypeBreakdown.reduce((m, r) => Math.max(m, r.count), 0)

  return (
    <AppShell activeItem="Performance">
      <div className="flex flex-col">
        <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <h1 className="font-semibold leading-tight" style={{ fontSize: 22, color: 'var(--foreground)' }}>
              Team Performance
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>
              {agency?.name ?? 'Your agency'} · {PERIOD_LABEL[period]}
            </p>
          </div>
          <PeriodToggle period={period} onChange={setPeriod} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 16, marginTop: 24 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 16, marginTop: 24 }}>
            <KPICard label="TOTAL ACTIVITIES" value={String(data?.totalActivitiesMtd ?? 0)} subLabel={PERIOD_LABEL[period]} />
            <KPICard label="TOTAL SPEND" value={data ? `$${data.totalSpendMtd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$0'} subLabel={PERIOD_LABEL[period]} />
            <KPICard label="AVG SCORE" value={String(data?.avgScore ?? 0)} subLabel="Across team" />
            <KPICard label="MOST ACTIVE" value={data?.mostActiveAgent ?? '—'} subLabel={PERIOD_LABEL[period]} />
          </div>
        )}

        <div className="flex flex-col md:flex-row" style={{ gap: 16, marginTop: 16 }}>
          <div className="app-card flex-1 min-w-0">
            <div className="flex items-center" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <span className="font-semibold" style={{ fontSize: 14, color: 'var(--foreground)' }}>
                Team Activities by Week
              </span>
            </div>
            <div style={{ padding: '20px 20px 12px' }}>
              <ResponsiveContainerRecharts width="100%" height={240}>
                <BarChart data={teamWeeklyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGridRecharts strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxisRecharts dataKey="week" tick={{ fontSize: 12, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxisRecharts tick={{ fontSize: 12, fill: '#a1a1aa' }} axisLine={false} tickLine={false} width={28} />
                  <TooltipRecharts
                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #27272a', borderRadius: 8, fontSize: 13, color: '#fff' }}
                    cursor={{ fill: 'rgba(196,165,116,0.06)' }}
                  />
                  <BarRecharts dataKey="count" name="Activities" fill="#c4a574" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainerRecharts>
            </div>
          </div>

          <div className="app-card shrink-0 w-full md:w-[300px]">
            <div className="flex items-center" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <span className="font-semibold" style={{ fontSize: 14, color: 'var(--foreground)' }}>
                Activity Type Breakdown
              </span>
            </div>
            <div className="flex flex-col" style={{ padding: '16px 20px', gap: 8 }}>
              {activityTypeBreakdown.map(row => {
                const pct = maxCount > 0 ? Math.round((row.count / maxCount) * 100) : 0
                return (
                  <div key={row.type} className="flex items-center" style={{ height: 36, gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--body)', minWidth: 100, flexShrink: 0 }}>{row.type}</span>
                    <span className="flex items-center justify-center rounded-full shrink-0"
                      style={{ height: 20, minWidth: 28, paddingLeft: 8, paddingRight: 8, fontSize: 11, fontWeight: 600, backgroundColor: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                      {row.count}
                    </span>
                    <div className="flex-1 overflow-hidden" style={{ height: 8, borderRadius: 4, backgroundColor: 'var(--surface)' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: '#c4a574', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="app-card" style={{ marginTop: 16 }}>
          <div className="flex items-center" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', gap: 10 }}>
            <span className="font-semibold" style={{ fontSize: 14, color: 'var(--foreground)' }}>Rep Performance</span>
            <span style={{ backgroundColor: 'var(--surface)', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: 'var(--muted)' }}>
              {agents.length}
            </span>
          </div>

          {/* Desktop table headers */}
          <div className="hidden md:grid" style={{ gridTemplateColumns: '48px 1fr 100px 80px', padding: '10px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
            {['RANK', 'REP', 'ACTIVITIES', 'SCORE'].map(col => (
              <span key={col} style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: 'var(--muted)' }}>{col}</span>
            ))}
          </div>

          {agents.map((agent, i) => (
            <div key={agent.name}>
              {/* Desktop row */}
              <div className="hidden md:grid items-center" style={{ gridTemplateColumns: '48px 1fr 100px 80px', padding: '14px 20px', borderBottom: i < agents.length - 1 ? '1px solid var(--border)' : 'none', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>#{i + 1}</span>
                <div className="flex items-center" style={{ gap: 10 }}>
                  <div className="flex items-center justify-center rounded-full shrink-0"
                    style={{ width: 32, height: 32, backgroundColor: '#c4a574', fontSize: 12, fontWeight: 700, color: '#000' }}>
                    {agent.initials.toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{agent.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#c4a574' }}>{agent.activities}</span>
                <span style={{ fontSize: 13, color: 'var(--body)' }}>{agent.score || '—'}</span>
              </div>

              {/* Mobile card row */}
              <div className="flex md:hidden items-center justify-between"
                style={{ padding: '12px 20px', borderBottom: i < agents.length - 1 ? '1px solid var(--border)' : 'none', gap: 12 }}>
                <div className="flex items-center" style={{ gap: 10 }}>
                  <div className="flex items-center justify-center rounded-full shrink-0"
                    style={{ width: 32, height: 32, backgroundColor: '#c4a574', fontSize: 12, fontWeight: 700, color: '#000' }}>
                    {agent.initials.toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{agent.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#c4a574' }}>{agent.activities}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── 3E: Spend Efficiency by Agent ───────────── */}
        <AgentEfficiencySection agents={data?.agentEfficiency ?? []} />

        {/* ── 3E: Team Sponsor Activity ───────────────── */}
        <SponsorActivitySection items={data?.teamSponsors ?? []} />

      </div>
    </AppShell>
  )
}

// ── Agent view ────────────────────────────────────────────────────────────────

function AgentPerformancePage() {
  // All sections use YTD; trend chart has its own independent period state
  const [trendPeriod, setTrendPeriod] = useState<Period>('ytd')
  const { data, isLoading } = useAgentPerformance('ytd')
  const { data: trendChartData } = useAgentPerformance(trendPeriod)
  const { data: heatmapData, isLoading: heatmapLoading } = useActivityHeatmap('ytd')
  const { data: kpis } = useAgentKpis()
  const { data: nudge } = useAgentNudge()

  const monthlySpend = trendChartData?.monthlySpend ?? []
  const activityTypeBreakdown = data?.activityBreakdown ?? []
  const maxCount = activityTypeBreakdown.reduce((m, r) => Math.max(m, r.count), 0)

  const activitiesYtd = data?.activitiesMtd ?? 0
  const spendYtd = data?.spendMtd ?? 0
  const contactsEngaged = data?.contactsEngaged ?? 0
  const mostActiveType = data?.mostActiveType ?? '—'
  const avgCost = data?.avgCostPerActivity ?? 0

  return (
    <AppShell activeItem="My Performance">
      <div className="flex flex-col">

        {/* ── Page header ───────────────────────────────── */}
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center rounded-[8px] shrink-0"
            style={{ width: 40, height: 40, backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <TrendingUp size={18} style={{ color: '#c4a574' }} />
          </div>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <h1 className="font-semibold leading-tight" style={{ fontSize: 22, color: 'var(--foreground)' }}>
              My Performance
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>
              Sarah Chen · Buckhead Territory · YTD
            </p>
          </div>
        </div>

        {/* ── AI Performance Summary ────────────────────── */}
        <div style={{ marginTop: 16 }}>
          <AICard label="Summary" sublabel="Updated today" readAloud>
            <p style={{ fontSize: 13, color: 'var(--body)', lineHeight: 1.6, margin: 0 }}>
              This year you&apos;ve logged {activitiesYtd} {activitiesYtd === 1 ? 'activity' : 'activities'}.
              {kpis?.topContactName
                ? ` Your strongest relationship is ${kpis.topContactName} (score ${kpis.topRelationshipScore}).`
                : ''}
              {nudge
                ? ` ${nudge.message}`
                : ' All your key relationships are looking healthy.'}
            </p>
          </AICard>
        </div>

        {/* ── KPI row ───────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 16, marginTop: 24 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-2 md:grid-cols-4"
            style={{ gap: 16, marginTop: 24 }}
          >
            <KPICard
              label="ACTIVITIES THIS YEAR"
              value={String(activitiesYtd)}
              subLabel="YTD"
              href="/activities"
            />
            <KPICard
              label="TOTAL SPEND"
              value={`$${spendYtd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
              subLabel={avgCost > 0 ? `Avg $${avgCost.toFixed(0)}/activity` : 'No spend yet'}
              href="/activities"
            />
            <KPICard
              label="CONTACTS ENGAGED"
              value={String(contactsEngaged)}
              subLabel="YTD"
              href="/contacts"
            />
            <KPICard
              label="MOST ACTIVE TYPE"
              value={mostActiveType}
              subLabel="YTD"
              subLabelColor="#c4a574"
              href="/activities"
            />
          </div>
        )}

        {/* ── Spend & Activity Trend ────────────────────── */}
        <div className="app-card" style={{ marginTop: 24 }}>
          {/* Card header with period toggle */}
          <div className="flex items-center justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', rowGap: 8 }}>
            <span className="font-semibold" style={{ fontSize: 14, color: 'var(--foreground)' }}>
              Spend &amp; Activity Trend
            </span>
            <PeriodToggle period={trendPeriod} onChange={setTrendPeriod} />
          </div>

          {/* Chart */}
          <div style={{ padding: '12px 0 8px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={monthlySpend} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={40}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(196,165,116,0.06)' }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: '#a1a1aa', paddingTop: 12 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="spend"
                  name="spend"
                  fill="#c4a574"
                  opacity={0.8}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="activities"
                  name="activities"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#c4a574', stroke: '#c4a574', r: 4 }}
                  activeDot={{ fill: '#c4a574', stroke: '#c4a574', r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Two-column row: Activity Streak + Spend Efficiency ── */}
        <div className="flex flex-col md:flex-row" style={{ gap: 16, marginTop: 16 }}>
          {/* ─ Activity Streak heatmap — 2/3 width ─── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <ActivityHeatmap
              data={heatmapData ?? []}
              period="ytd"
              isLoading={heatmapLoading}
            />
          </div>

          {/* ─ Spend Efficiency — 1/3 width ─────────── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <SpendEfficiencySection eff={data?.efficiency ?? {
              spendPerClosing: null, activitiesPerClosing: null, efficiencyScore: 0,
              totalSpend: 0, totalActivities: 0, closedContracts: 0, closedContractValue: 0,
            }} />
          </div>
        </div>

        {/* ── Activity Type Breakdown — full width ─────── */}
        <div className="app-card" style={{ marginTop: 16 }}>
          <div className="flex items-center justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <span className="font-semibold" style={{ fontSize: 14, color: 'var(--foreground)' }}>
              Activity Type Breakdown
            </span>
          </div>
          <div className="flex flex-col" style={{ padding: '16px 20px', gap: 8 }}>
            {activityTypeBreakdown.map((row) => {
              const pct = maxCount > 0 ? Math.round((row.count / maxCount) * 100) : 0
              return (
                <div key={row.type} className="flex items-center" style={{ height: 36, gap: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--body)', minWidth: 100, flexShrink: 0 }}>
                    {row.type}
                  </span>
                  <span className="flex items-center justify-center rounded-full shrink-0" style={{
                    height: 20, minWidth: 28, paddingLeft: 8, paddingRight: 8,
                    fontSize: 11, fontWeight: 600,
                    backgroundColor: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)',
                  }}>
                    {row.count}
                  </span>
                  <div className="flex-1 overflow-hidden" style={{ height: 8, borderRadius: 4, backgroundColor: 'var(--surface)' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 4,
                      backgroundColor: '#c4a574', transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--muted)', minWidth: 48, textAlign: 'right', flexShrink: 0 }}>
                    {row.spend > 0 ? `$${row.spend.toLocaleString()}` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </AppShell>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const { role } = useRole()

  if (role === 'manager') {
    return <ManagerPerformancePage />
  }

  return <AgentPerformancePage />
}
