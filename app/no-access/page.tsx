'use client'

/**
 * E3 — signed in, but no way into the product. The difference between invite-only and
 * nearly invite-only: nothing was written for this person, and nothing here writes either.
 *
 * When access was taken away (agency revoked, account deactivated) the screen names the
 * agency and a real person to ask, from /auth/session.
 */
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BRAND } from '@/lib/brand'
import { logout } from '@/lib/api/auth'
import { getSession, type SessionState } from '@/lib/api/access'
import { AccessShell, GhostButton, GoldLink, Muted, Notice } from '@/components/app/AccessShell'

function Contact({ contact, lead }: { contact: NonNullable<SessionState['contact']>; lead: string }) {
  return (
    <>
      {lead} {contact.name} at {contact.organisation} can tell you more —{' '}
      <a href={`mailto:${contact.email}`} style={{ color: 'var(--gold)' }} className="hover:underline">
        {contact.email}
      </a>
    </>
  )
}

function NoAccess() {
  const reason = useSearchParams().get('reason') ?? ''
  const [session, setSession] = useState<SessionState | null>(null)

  useEffect(() => {
    if (reason) getSession().then(setSession, () => {})
  }, [reason])

  async function signOut() {
    await logout()
    window.location.href = '/login'
  }

  const agencyName = session?.agency?.name
  const contact = session?.contact

  let title = `You’re signed in, but you don’t have a ${BRAND.name} account yet`
  let body: React.ReactNode = `${BRAND.name} is available by invitation from a WFG representative. If you were sent a link, open it again — it’s what connects your sign-in to your agency.`
  let note: React.ReactNode = (
    <>
      Working with a WFG rep already? They can resend your invitation. Have an agency code?{' '}
      <GoldLink href="/join">Enter it here</GoldLink>.
    </>
  )

  if (reason === 'agency_revoked') {
    title = `${agencyName ?? 'Your agency'} no longer has access to ${BRAND.name}`
    body = contact
      ? <Contact contact={contact} lead="Your records are kept." />
      : 'Your records are kept. Your WFG representative can tell you more.'
    note = null
  } else if (reason === 'inactive') {
    title = 'Your account has been deactivated'
    body = contact
      ? <Contact contact={contact} lead="Your records are kept." />
      : `Your records are kept. Ask the manager at ${agencyName ?? 'your agency'} if you think this is a mistake.`
    note = null
  }

  return (
    <AccessShell>
      <div className="flex flex-col" style={{ gap: 16 }}>
        <Notice title={title}>{body}</Notice>
        <GhostButton onClick={signOut}>Sign out</GhostButton>
        {note && <Muted>{note}</Muted>}
      </div>
    </AccessShell>
  )
}

export default function NoAccessPage() {
  return (
    <Suspense>
      <NoAccess />
    </Suspense>
  )
}
