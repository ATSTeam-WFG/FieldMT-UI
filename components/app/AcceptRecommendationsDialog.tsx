'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ToastAction } from '@/components/ui/toast'
import type { Contract } from '@/lib/api/contracts'
import { useAcceptRecommendations, useSetAssignment } from '@/lib/hooks/useContracts'
import { toast } from '@/lib/hooks/use-toast'
import { recommendationEvidence } from './AssignmentControl'

/**
 * Bulk accept (D16) never writes straight away: every contract it would assign is listed and can
 * be unticked, and the commit can be undone for 10 seconds.
 */
export function AcceptRecommendationsDialog({ contracts, onClose }: {
  contracts: Contract[]
  onClose: () => void
}) {
  const accept = useAcceptRecommendations()
  const unassign = useSetAssignment()
  // Mounted fresh each time it opens, so every contract starts ticked
  const [picked, setPicked] = useState(() => new Set(contracts.map(c => c.id)))

  const toggle = (id: string) => setPicked(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  async function commit() {
    const ids = [...picked]
    try {
      const res = await accept.mutateAsync(ids)
      onClose()
      toast({
        title: `${res.assigned} contract${res.assigned === 1 ? '' : 's'} assigned`,
        duration: 10_000,
        action: (
          <ToastAction altText="Undo the assignments" onClick={async () => {
            await Promise.all(ids.map(id => unassign.mutateAsync({ id, repId: null })))
            toast({ title: 'Assignments undone' })
          }}>
            Undo
          </ToastAction>
        ),
      })
    } catch {
      toast({ title: 'Could not assign', description: 'Please try again.', variant: 'destructive' })
    }
  }

  const n = picked.size
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-xl" style={{ border: '1px solid var(--border)' }}>
        <div className="flex flex-col" style={{ gap: 4 }}>
          <DialogTitle style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>Accept recommendations</DialogTitle>
          <DialogDescription style={{ fontSize: 13, color: 'var(--muted)' }}>
            Assigning counts as production credit. Untick any you don’t want to assign.
          </DialogDescription>
        </div>
        <div className="flex flex-col" style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
          {contracts.map((c, i) => {
            const on = picked.has(c.id)
            const rec = c.recommendation!
            return (
              <label key={c.id} className="flex items-start cursor-pointer hover:bg-[var(--surface)]"
                style={{ gap: 10, padding: '10px 12px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="sr-only" />
                <span aria-hidden className="flex items-center justify-center shrink-0"
                  style={{ width: 16, height: 16, marginTop: 2, borderRadius: 4, border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`, background: on ? 'var(--gold)' : 'transparent' }}>
                  {on && <Check size={12} color="#000000" strokeWidth={3} />}
                </span>
                <span className="flex flex-col" style={{ gap: 2, minWidth: 0, opacity: on ? 1 : 0.55 }}>
                  <span style={{ fontSize: 13, color: 'var(--foreground)' }}>
                    {c.property_address ?? c.file_number ?? c.external_order_id ?? 'Contract'}
                    <span style={{ color: 'var(--muted)' }}> → </span>
                    <span style={{ fontWeight: 600 }}>{rec.rep_name}</span>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{recommendationEvidence(rec)}</span>
                </span>
              </label>
            )
          })}
        </div>
        <div className="flex justify-end" style={{ gap: 8 }}>
          <button type="button" onClick={onClose}
            style={{ height: 36, padding: '0 14px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="button" onClick={commit} disabled={!n || accept.isPending}
            className="font-semibold disabled:opacity-50"
            style={{ height: 36, padding: '0 14px', borderRadius: 8, fontSize: 13, border: 'none', background: 'var(--gold)', color: '#000000', cursor: n ? 'pointer' : 'not-allowed' }}>
            Assign {n} contract{n === 1 ? '' : 's'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
