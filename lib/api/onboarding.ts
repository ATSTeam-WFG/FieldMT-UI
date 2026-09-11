import { api } from './client'

/** Step keys mirror `REP_STEPS` / `MANAGER_STEPS` in `app/services/onboarding.py`. */
export type OnboardingStepKey =
  | 'log_activity'
  | 'add_contact'
  | 'open_contract'
  | 'import_contracts'
  | 'set_follow_up'
  | 'explore_scores'
  | 'invite_rep'
  | 'review_team'
  | 'view_performance'

export interface OnboardingStep {
  key: OnboardingStepKey
  done: boolean
}

export interface OnboardingChecklist {
  role: 'agent' | 'manager' | 'executive'
  steps: OnboardingStep[]
  completed: number
  total: number
  complete: boolean
  dismissed: boolean
}

export function getChecklist(): Promise<OnboardingChecklist> {
  return api.get<OnboardingChecklist>('/onboarding/checklist')
}

/**
 * Retire the checklist and file the congratulation. The server re-derives
 * completion and no-ops if it has already run, so this is safe to call more
 * than once and cannot be used to fake the notification.
 */
export function completeOnboarding(): Promise<OnboardingChecklist> {
  return api.post<OnboardingChecklist>('/onboarding/complete', {})
}
