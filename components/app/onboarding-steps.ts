import { ArrowDownUp, ClipboardList, FileText, Gauge, ListChecks, TrendingUp, UserPlus, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { OnboardingStepKey } from '@/lib/api/onboarding'

/**
 * Copy, icon and CTA for each step. The server sends only `key` and `done` —
 * keys here must match `REP_STEPS` / `MANAGER_STEPS` in
 * `backend/app/services/onboarding.py`.
 *
 * `action` steps open a panel the page owns; `href` steps navigate.
 */
export type OnboardingAction = 'log_activity' | 'add_contact' | 'add_contract' | 'invite_rep'

export interface OnboardingStepMeta {
  icon: LucideIcon
  title: string
  description: string
  ctaLabel: string
  href?: string
  action?: OnboardingAction
}

export const ONBOARDING_STEPS: Record<OnboardingStepKey, OnboardingStepMeta> = {
  log_activity: {
    icon: ClipboardList,
    title: 'Log your first activity',
    description: 'Record a client visit, lunch, pop-by, or call.',
    ctaLabel: 'Log Activity',
    action: 'log_activity',
  },
  add_contact: {
    icon: Users,
    title: 'Add a contact',
    description: 'Build your book by adding agents, brokers, or lenders.',
    ctaLabel: 'Add Contact',
    action: 'add_contact',
  },
  open_contract: {
    icon: FileText,
    title: 'Open a contract',
    description: 'Track a deal from initiated to closed.',
    ctaLabel: 'Add Contract',
    action: 'add_contract',
  },
  import_contracts: {
    icon: ArrowDownUp,
    title: 'Import your existing contracts',
    description: 'Bring closed orders and their referral contacts in from Qualia.',
    ctaLabel: 'Go to Imports',
    // Deep-links straight to the Qualia importer — /exports is a two-section
    // page and the wizard otherwise only opens from a card click.
    href: '/exports?import=qualia',
  },
  set_follow_up: {
    icon: ListChecks,
    title: 'Set a follow-up',
    description: 'Give yourself the next touch before you forget it.',
    ctaLabel: 'Go to Follow-ups',
    href: '/follow-ups',
  },
  explore_scores: {
    icon: Gauge,
    title: 'See a relationship score',
    description: 'Every contact is scored on recency, frequency, diversity, and engagement.',
    ctaLabel: 'View Scores',
    href: '/scores',
  },

  // ── Manager ──
  invite_rep: {
    icon: UserPlus,
    title: 'Invite your first rep',
    description: 'Send an invite, or share your agency code from the Team page.',
    ctaLabel: 'Invite Rep',
    action: 'invite_rep',
  },
  review_team: {
    icon: Users,
    title: 'Review your team',
    description: 'The roster, the agency join code, and who is active.',
    ctaLabel: 'View Team',
    href: '/team',
  },
  view_performance: {
    icon: TrendingUp,
    title: 'Open the performance view',
    description: 'How the team spends its time and budget, MTD through YTD.',
    ctaLabel: 'View Performance',
    href: '/performance',
  },
}
