import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acceptRecommendations, createContract, deleteContract, getContracts, previewRecommendation, setAssignment, setReferrer,
  updateContract,
} from '@/lib/api/contracts'
import { hasToken } from '@/lib/api/client'

/** `keepPrevious`: while paging or filtering, keep the current rows on screen until the next set arrives. */
export function useContracts(params?: Parameters<typeof getContracts>[0], { keepPrevious = false } = {}) {
  return useQuery({
    queryKey: ['contracts', params],
    queryFn: () => getContracts(params),
    enabled: hasToken(),
    staleTime: 60_000,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
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

function useContractMutation<A, R>(fn: (args: A) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] })
      qc.invalidateQueries({ queryKey: ['contract'] })
    },
  })
}

export const useSetAssignment = () =>
  useContractMutation(({ id, repId }: { id: string; repId: string | null }) => setAssignment(id, repId))

export const useAcceptRecommendations = () =>
  useContractMutation((ids: string[]) => acceptRecommendations(ids))

export const useSetReferrer = () =>
  useContractMutation(({ id, contactId }: { id: string; contactId: string | null }) => setReferrer(id, contactId))

export const useUpdateContract = () =>
  useContractMutation(({ id, payload }: { id: string; payload: Parameters<typeof updateContract>[1] }) => updateContract(id, payload))

export const useDeleteContract = () =>
  useContractMutation((id: string) => deleteContract(id))

/** The recommendation for an order's parties as currently edited (D16). */
export function useRecommendationPreview(id: string | null, parties: Parameters<typeof previewRecommendation>[1], enabled: boolean) {
  return useQuery({
    queryKey: ['contract-recommendation', id, parties],
    queryFn: () => previewRecommendation(id!, parties),
    enabled: enabled && !!id && hasToken(),
    staleTime: 30_000,
  })
}
