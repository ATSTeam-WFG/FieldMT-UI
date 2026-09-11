import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContact, getContact, getContacts } from '@/lib/api/contacts'
import { hasToken } from '@/lib/api/client'

export function useContacts(params?: Parameters<typeof getContacts>[0]) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: () => getContacts(params),
    enabled: hasToken(),
    staleTime: 60_000,
  })
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => getContact(id),
    enabled: hasToken() && !!id,
    staleTime: 60_000,
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['onboarding-checklist'] })
    },
  })
}
