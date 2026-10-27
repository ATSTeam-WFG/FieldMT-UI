import { api } from './client'

export type Period = 'mtd' | 'qtd' | 'ytd'

// ── Shared ───────────────────────────────────────────────────────────────────

export interface ActivityBreakdownItem {
  type: string
  count: number
  spend: number
}

// ── Manager Dashboard ─────────────────────────────────────────────────────────

export interface ManagerKPIs {
  totalActivities: number
  activitiesDelta: string
  totalSpend: number
  avgSpendPerAgent: number
  activeAgents: number
  totalAgents: number
  avgActivitiesPerAgent: number
  target: number
}

export interface LeaderboardEntry {
  id: string
  rank: number
  name: string
  initials: string
  activities: number
  spend: number
  lastLog: string | null
  status: string
  score: number
}

export interface AgentHeatmapEntry {
  id: string
  name: string
  initials: string
  activities: number
  level: string
  status: string
  weeks: number[]
}

export interface AlertItem {
  agentName: string
  message: string
}

export interface ManagerDashboard {
  kpis: ManagerKPIs
  leaderboard: LeaderboardEntry[]
  breakdown: ActivityBreakdownItem[]
  agentActivity: AgentHeatmapEntry[]
  alerts: AlertItem[]
}

interface ManagerDashboardBackend {
  kpis: {
    total_activities: number
    activities_delta: string
    total_spend: number
    avg_spend_per_agent: number
    active_agents: number
    total_agents: number
    avg_activities_per_agent: number
    target: number
  }
  leaderboard: Array<{
    id: string
    rank: number
    name: string
    initials: string
    activities: number
    spend: number
    last_log: string | null
    status: string
    score: number
  }>
  breakdown: Array<{ type: string; count: number; spend: number }>
  agent_activity: Array<{
    id: string
    name: string
    initials: string
    activities: number
    level: string
    status: string
    weeks: number[]
  }>
  alerts: Array<{ agent_name: string; message: string }>
}

export async function getManagerDashboard(period: Period = 'mtd'): Promise<ManagerDashboard> {
  const d = await api.get<ManagerDashboardBackend>(`/analytics/manager/dashboard?period=${period}`)
  return {
    kpis: {
      totalActivities: d.kpis.total_activities,
      activitiesDelta: d.kpis.activities_delta,
      totalSpend: d.kpis.total_spend,
      avgSpendPerAgent: d.kpis.avg_spend_per_agent,
      activeAgents: d.kpis.active_agents,
      totalAgents: d.kpis.total_agents,
      avgActivitiesPerAgent: d.kpis.avg_activities_per_agent,
      target: d.kpis.target,
    },
    leaderboard: d.leaderboard.map(e => ({
      id: e.id,
      rank: e.rank,
      name: e.name,
      initials: e.initials,
      activities: e.activities,
      spend: e.spend,
      lastLog: e.last_log,
      status: e.status,
      score: e.score ?? 0,
    })),
    breakdown: d.breakdown,
    agentActivity: d.agent_activity.map(e => ({
      id: e.id,
      name: e.name,
      initials: e.initials,
      activities: e.activities,
      level: e.level,
      status: e.status,
      weeks: e.weeks,
    })),
    alerts: d.alerts.map(a => ({ agentName: a.agent_name, message: a.message })),
  }
}

// ── Agent Performance ─────────────────────────────────────────────────────────

export interface MonthlyTrendItem {
  month: string
  spend: number
  activities: number
}

export interface ContactSpendItem {
  contactId: string
  contactName: string
  initials: string
  totalSpend: number
  activityCount: number
  avgCostPerActivity: number
}

export interface SpendEfficiency {
  spendPerClosing: number | null
  activitiesPerClosing: number | null
  efficiencyScore: number
  totalSpend: number
  totalActivities: number
  closedContracts: number
  /** Of closedContracts, still open in Qualia more than 14 days past their close date */
  closedUnconfirmedContracts: number
  closedContractValue: number
}

export interface SponsorSpendItem {
  sponsorId: string
  sponsorName: string
  initials: string
  totalContributed: number
  activityCount: number
  pctOfTotalSpend: number
}

export interface AgentEfficiencyEntry {
  agentId: string
  name: string
  initials: string
  efficiencyScore: number
  spendPerClosing: number | null
  activitiesPerClosing: number | null
}

export interface AgentPerformance {
  monthlySpend: MonthlyTrendItem[]
  activityBreakdown: ActivityBreakdownItem[]
  activitiesMtd: number
  spendMtd: number
  contactsEngaged: number
  mostActiveType: string
  avgCostPerActivity: number
  costPerContact: ContactSpendItem[]
  efficiency: SpendEfficiency
  sponsorActivity: SponsorSpendItem[]
}

interface AgentPerformanceBackend {
  monthly_spend: Array<{ month: string; spend: number; activities: number }>
  activity_breakdown: Array<{ type: string; count: number; spend: number }>
  activities_mtd: number
  spend_mtd: number
  contacts_engaged: number
  most_active_type: string
  avg_cost_per_activity: number
  cost_per_contact: Array<{
    contact_id: string; contact_name: string; initials: string
    total_spend: number; activity_count: number; avg_cost_per_activity: number
  }>
  efficiency: {
    spend_per_closing: number | null; activities_per_closing: number | null
    efficiency_score: number; total_spend: number; total_activities: number
    closed_contracts: number; closed_unconfirmed_contracts: number; closed_contract_value: number
  }
  sponsor_activity: Array<{
    sponsor_id: string; sponsor_name: string; initials: string
    total_contributed: number; activity_count: number; pct_of_total_spend: number
  }>
}

export async function getAgentPerformance(period: Period = 'mtd'): Promise<AgentPerformance> {
  const d = await api.get<AgentPerformanceBackend>(`/analytics/performance/agent?period=${period}`)
  return {
    monthlySpend: d.monthly_spend,
    activityBreakdown: d.activity_breakdown,
    activitiesMtd: d.activities_mtd,
    spendMtd: d.spend_mtd,
    contactsEngaged: d.contacts_engaged,
    mostActiveType: d.most_active_type,
    avgCostPerActivity: d.avg_cost_per_activity,
    costPerContact: d.cost_per_contact.map(r => ({
      contactId: r.contact_id, contactName: r.contact_name, initials: r.initials,
      totalSpend: r.total_spend, activityCount: r.activity_count,
      avgCostPerActivity: r.avg_cost_per_activity,
    })),
    efficiency: {
      spendPerClosing: d.efficiency.spend_per_closing,
      activitiesPerClosing: d.efficiency.activities_per_closing,
      efficiencyScore: d.efficiency.efficiency_score,
      totalSpend: d.efficiency.total_spend,
      totalActivities: d.efficiency.total_activities,
      closedContracts: d.efficiency.closed_contracts,
      closedUnconfirmedContracts: d.efficiency.closed_unconfirmed_contracts ?? 0,
      closedContractValue: d.efficiency.closed_contract_value,
    },
    sponsorActivity: d.sponsor_activity.map(r => ({
      sponsorId: r.sponsor_id, sponsorName: r.sponsor_name, initials: r.initials,
      totalContributed: r.total_contributed, activityCount: r.activity_count,
      pctOfTotalSpend: r.pct_of_total_spend,
    })),
  }
}

// ── Team Performance ──────────────────────────────────────────────────────────

export interface TeamWeeklyItem {
  week: string
  count: number
}

export interface AgentPerfEntry {
  name: string
  initials: string
  activities: number
  score: number
}

export interface TeamPerformance {
  teamWeekly: TeamWeeklyItem[]
  activityBreakdown: ActivityBreakdownItem[]
  agents: AgentPerfEntry[]
  totalActivitiesMtd: number
  totalSpendMtd: number
  avgScore: number
  mostActiveAgent: string
  agentEfficiency: AgentEfficiencyEntry[]
  teamSponsors: SponsorSpendItem[]
}

interface TeamPerformanceBackend {
  team_weekly: Array<{ week: string; count: number }>
  activity_breakdown: Array<{ type: string; count: number; spend: number }>
  agents: Array<{ name: string; initials: string; activities: number; score: number }>
  total_activities_mtd: number
  total_spend_mtd: number
  avg_score: number
  most_active_agent: string
  agent_efficiency: Array<{
    agent_id: string; name: string; initials: string; efficiency_score: number
    spend_per_closing: number | null; activities_per_closing: number | null
  }>
  team_sponsors: Array<{
    sponsor_id: string; sponsor_name: string; initials: string
    total_contributed: number; activity_count: number; pct_of_total_spend: number
  }>
}

export async function getTeamPerformance(period: Period = 'mtd'): Promise<TeamPerformance> {
  const d = await api.get<TeamPerformanceBackend>(`/analytics/performance/team?period=${period}`)
  return {
    teamWeekly: d.team_weekly,
    activityBreakdown: d.activity_breakdown,
    agents: d.agents,
    totalActivitiesMtd: d.total_activities_mtd,
    totalSpendMtd: d.total_spend_mtd,
    avgScore: d.avg_score,
    mostActiveAgent: d.most_active_agent,
    agentEfficiency: d.agent_efficiency.map(r => ({
      agentId: r.agent_id, name: r.name, initials: r.initials,
      efficiencyScore: r.efficiency_score,
      spendPerClosing: r.spend_per_closing,
      activitiesPerClosing: r.activities_per_closing,
    })),
    teamSponsors: d.team_sponsors.map(r => ({
      sponsorId: r.sponsor_id, sponsorName: r.sponsor_name, initials: r.initials,
      totalContributed: r.total_contributed, activityCount: r.activity_count,
      pctOfTotalSpend: r.pct_of_total_spend,
    })),
  }
}

// ── Activity Heatmap ──────────────────────────────────────────────────────────

export interface ActivityDayItem {
  date: string   // YYYY-MM-DD
  count: number
}

export async function getActivityDays(period: Period = 'mtd'): Promise<ActivityDayItem[]> {
  return api.get<ActivityDayItem[]>(`/analytics/performance/agent/activity-days?period=${period}`)
}
