import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { completeOnboarding, getChecklist, OnboardingChecklist } from '@/lib/api/onboarding'
import { hasToken } from '@/lib/api/client'

export const ONBOARDING_QUERY_KEY = ['onboarding-checklist']

export function useOnboarding() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: getChecklist,
    enabled: hasToken(),
    // Three steps are satisfied by a page view, not a mutation, so while the
    // checklist is live it has to refetch on every AppShell mount — otherwise
    // visiting /scores and coming back leaves the step grey. Once it is done
    // with, it stops asking.
    staleTime: q => {
      const data = q.state.data as OnboardingChecklist | undefined
      return data && (data.complete || data.dismissed) ? 5 * 60_000 : 0
    },
  })

  const completeMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: (data: OnboardingChecklist) => queryClient.setQueryData(ONBOARDING_QUERY_KEY, data),
  })

  const checklist = query.data
  // No user-facing dismiss: the card stays until every step is satisfied. The
  // `dismissed` term is the retirement stamp — earned by finishing, or granted
  // by migration 017 to everyone who was already using the product.
  const visible = !!checklist && !checklist.complete && !checklist.dismissed

  return {
    checklist,
    isLoading: query.isLoading,
    visible,
    /**
     * Hold back the KPI and AI cards. Covers the first paint too: without the
     * loading term they would render for a moment and then be yanked away.
     * Fails open — if the request errors, the dashboard shows as normal.
     */
    holdDashboard: visible || query.isLoading,
    /** Retire the checklist and file the congratulation. Server-verified, once only. */
    complete: completeMutation.mutateAsync,
  }
}
