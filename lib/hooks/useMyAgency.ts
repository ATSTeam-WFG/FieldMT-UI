import { useQuery } from '@tanstack/react-query'
import { getAgencyMembers, getMyAgency, type AgencyData } from '@/lib/api/agencies'
import { ApiError } from '@/lib/api/client'
import { hasToken } from '@/lib/api/client'

export function useMyAgency() {
  return useQuery<AgencyData | null>({
    queryKey: ['my-agency'],
    queryFn: async () => {
      try {
        return await getMyAgency()
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null
        throw err
      }
    },
    enabled: hasToken(),
    staleTime: 300_000,
  })
}

export function useAgencyMembers() {
  return useQuery({
    queryKey: ['agency-members'],
    queryFn: getAgencyMembers,
    enabled: hasToken(),
    staleTime: 300_000,
  })
}
