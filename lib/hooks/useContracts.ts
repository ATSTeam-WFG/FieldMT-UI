import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContract, getContracts } from '@/lib/api/contracts'
import { hasToken } from '@/lib/api/client'

export function useContracts(params?: Parameters<typeof getContracts>[0]) {
  return useQuery({
    queryKey: ['contracts', params],
    queryFn: () => getContracts(params),
    enabled: hasToken(),
    staleTime: 60_000,
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createContract,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] })
      qc.invalidateQueries({ queryKey: ['agent-kpis'] })
      qc.invalidateQueries({ queryKey: ['onboarding-checklist'] })
    },
  })
}
