'use client'

import { Suspense } from 'react'
import { InvitationLanding } from '@/components/app/InvitationLanding'

// J1 — a manager's invitation to join an agency as a rep or a manager.
export default function AcceptPage({ params }: { params: { token: string } }) {
  return (
    <Suspense>
      <InvitationLanding token={params.token} path={`/accept/${params.token}`} />
    </Suspense>
  )
}
