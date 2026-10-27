import { useQuery } from '@tanstack/react-query'
import { hasToken } from '@/lib/api/client'
import { getImportHistory, getImportInsights } from '@/lib/api/imports'

/** The agency's import history — every member sees the same list (D20). */
export function useImportHistory() {
  return useQuery({
    queryKey: ['import-history'],
    queryFn: getImportHistory,
    enabled: hasToken(),
    staleTime: 60_000,
  })
}

export function useImportInsights(enabled: boolean) {
  return useQuery({
    queryKey: ['import-insights'],
    queryFn: getImportInsights,
    enabled: enabled && hasToken(),
  })
}
