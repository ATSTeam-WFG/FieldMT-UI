import { api } from './client'
import type { AgentPerformance } from './analytics'

// Backend snake_case shape
interface KPIBackend {
  activities_this_week: number
  activities_week_delta: string
  activities_week_delta_positive: boolean
  total_spend_mtd: string
  spend_sub_label: string
  contacts_engaged: number
  contacts_sub_label: string
  follow_ups_pending: number
  follow_ups_overdue: number
  week_streak: {
    days: string[]
    active: boolean[]
    is_today: boolean[]
    label: string
  }
  streak_stats: {
    avg_cost_per_activity: string
    most_active_type: string
    longest_streak: string
  }
  top_relationship_score: number
  top_contact_name: string | null
}

// Frontend camelCase shape matching agent-kpis.json
export interface AgentKPIs {
  activitiesThisWeek: number
  activitiesWeekDelta: string
  activitiesWeekDeltaPositive: boolean
  totalSpendMTD: string
  spendSubLabel: string
  contactsEngaged: number
  contactsSubLabel: string
  followUpsPending: number
  followUpsOverdue: number
  weekStreak: {
    days: string[]
    active: boolean[]
    isToday: boolean[]
    label: string
  }
  streakStats: {
    avgCostPerActivity: string
    mostActiveType: string
    longestStreak: string
  }
  topRelationshipScore: number
  topContactName: string | null
}

export interface NudgeResponse {
  contact_id: string
  contact_name: string
  days_since_contact: number | null
  score: number
  delta: number | null
  message: string
}

export async function getNudge(): Promise<NudgeResponse | null> {
  return api.get<NudgeResponse | null>('/agents/me/nudge')
}

export async function getMyKpis(): Promise<AgentKPIs> {
  const d = await api.get<KPIBackend>('/agents/me/kpis')
  return {
    activitiesThisWeek: d.activities_this_week,
    activitiesWeekDelta: d.activities_week_delta,
    activitiesWeekDeltaPositive: d.activities_week_delta_positive,
    totalSpendMTD: d.total_spend_mtd,
    spendSubLabel: d.spend_sub_label,
    contactsEngaged: d.contacts_engaged,
    contactsSubLabel: d.contacts_sub_label,
    followUpsPending: d.follow_ups_pending,
    followUpsOverdue: d.follow_ups_overdue,
    weekStreak: {
      days: d.week_streak.days,
      active: d.week_streak.active,
      isToday: d.week_streak.is_today,
      label: d.week_streak.label,
    },
    streakStats: {
      avgCostPerActivity: d.streak_stats.avg_cost_per_activity,
      mostActiveType: d.streak_stats.most_active_type,
      longestStreak: d.streak_stats.longest_streak,
    },
    topRelationshipScore: d.top_relationship_score ?? 0,
    topContactName: d.top_contact_name ?? null,
  }
}

export interface AgentProfile {
  id: string
  name: string
  initials: string
  role: string
  agency_id: string | null
  territory: string | null
  title: string | null
  monthly_budget: number
  rep_tier: string | null
  team_id: string | null
}

export async function getMyProfile(): Promise<AgentProfile> {
  return api.get<AgentProfile>('/agents/me/profile')
}

// ── Agent Detail (manager view) ───────────────────────────────────────────────

export interface AgentDetail {
  id: string
  name: string
  initials: string
  title: string | null
  territory: string | null
  repTier: string | null
  monthlyBudget: number
  status: string
  kpis: AgentKPIs
  performance: AgentPerformance
}

interface AgentDetailBackend {
  id: string
  name: string
  initials: string
  title: string | null
  territory: string | null
  rep_tier: string | null
  monthly_budget: number
  status: string
  kpis: KPIBackend
  performance: {
    monthly_spend: Array<{ month: string; spend: number; activities: number }>
    activity_breakdown: Array<{ type: string; count: number; spend: number }>
    activities_mtd: number
    spend_mtd: number
    contacts_engaged: number
    most_active_type: string
    avg_cost_per_activity: number
  }
}

export async function getAgentDetail(agentId: string): Promise<AgentDetail> {
  const d = await api.get<AgentDetailBackend>(`/agents/${agentId}/detail`)
  return {
    id: d.id,
    name: d.name,
    initials: d.initials,
    title: d.title,
    territory: d.territory,
    repTier: d.rep_tier,
    monthlyBudget: d.monthly_budget,
    status: d.status,
    kpis: {
      activitiesThisWeek: d.kpis.activities_this_week,
      activitiesWeekDelta: d.kpis.activities_week_delta,
      activitiesWeekDeltaPositive: d.kpis.activities_week_delta_positive,
      totalSpendMTD: d.kpis.total_spend_mtd,
      spendSubLabel: d.kpis.spend_sub_label,
      contactsEngaged: d.kpis.contacts_engaged,
      contactsSubLabel: d.kpis.contacts_sub_label,
      followUpsPending: d.kpis.follow_ups_pending,
      followUpsOverdue: d.kpis.follow_ups_overdue,
      weekStreak: {
        days: d.kpis.week_streak.days,
        active: d.kpis.week_streak.active,
        isToday: d.kpis.week_streak.is_today,
        label: d.kpis.week_streak.label,
      },
      streakStats: {
        avgCostPerActivity: d.kpis.streak_stats.avg_cost_per_activity,
        mostActiveType: d.kpis.streak_stats.most_active_type,
        longestStreak: d.kpis.streak_stats.longest_streak,
      },
      topRelationshipScore: d.kpis.top_relationship_score ?? 0,
      topContactName: d.kpis.top_contact_name ?? null,
    },
    performance: {
      monthlySpend: d.performance.monthly_spend,
      activityBreakdown: d.performance.activity_breakdown,
      activitiesMtd: d.performance.activities_mtd,
      spendMtd: d.performance.spend_mtd,
      contactsEngaged: d.performance.contacts_engaged,
      mostActiveType: d.performance.most_active_type,
      avgCostPerActivity: d.performance.avg_cost_per_activity,
      costPerContact: [],
      efficiency: {
        spendPerClosing: null, activitiesPerClosing: null, efficiencyScore: 0,
        totalSpend: 0, totalActivities: 0, closedContracts: 0, closedUnconfirmedContracts: 0, closedContractValue: 0,
      },
      sponsorActivity: [],
    },
  }
}
