'use client'

import { Suspense } from 'react'
import { InvitationLanding } from '@/components/app/InvitationLanding'

// E1 — a WFG rep's invitation to set up an agency.
export default function ActivatePage({ params }: { params: { token: string } }) {
  return (
    <Suspense>
      <InvitationLanding token={params.token} path={`/activate/${params.token}`} />
    </Suspense>
  )
}
