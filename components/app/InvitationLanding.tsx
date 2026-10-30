'use client'

/**
 * E1 (/activate/<token>, a WFG rep's agency invitation) and J1 (/accept/<token>, a manager's
 * member invitation). The token is validated before anything renders, so a dead link never
 * reaches the identity provider. Neither screen has a form: the invitation is the credential.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BRAND } from '@/lib/brand'

// Every WFG rep works for the same organisation; staff records carry no org field.
const WFG_ORGANISATION = 'WFG National Title'
import { hasToken } from '@/lib/api/client'
import { previewCode, previewInvitation, requestNewLink, type AccessPreview } from '@/lib/api/access'
import { continueAfterIdentity, saveIntent } from '@/lib/access'
import { startIdentity } from '@/lib/identity'
import {
  AccessShell,
  Avatar,
  GhostButton,
  GoldLink,
  Heading,
  Muted,
  Notice,
  PrimaryButton,
  TextField,
  formatDay,
  initialsOf,
} from './AccessShell'

const CLAIM_ERRORS: Record<string, string> = {
  invitation_expired: 'This invitation expired before it could be used.',
  invitation_used: 'This invitation has already been used. Sign in instead.',
  invitation_revoked: 'This invitation is no longer valid.',
  already_in_agency: `You already belong to another agency on ${BRAND.name}, so this invitation can’t add you.`,
  email_in_use: `Another ${BRAND.name} account already uses that email address. Sign in with it instead.`,
}

export function InvitationLanding({ token, path }: { token: string; path: string }) {
  const params = useSearchParams()
  const claimError = params.get('claim')
  const [preview, setPreview] = useState<AccessPreview | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    previewInvitation(token).then(setPreview, () => setLoadError(true))
  }, [token])

  // One way forward: the sign-in screen handles both "new here" and "I already have an account".
  async function accept() {
    setBusy(true)
    setActionError(null)
    saveIntent({ token }, path)
    try {
      if (hasToken()) {
        window.location.href = await continueAfterIdentity()
      } else {
        await startIdentity()
      }
    } catch (err: any) {
      setActionError(err?.message ?? 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  if (loadError) {
    return (
      <AccessShell>
        <Notice title="We couldn’t check this invitation">Check your connection and reload the page.</Notice>
      </AccessShell>
    )
  }
  if (!preview) {
    return (
      <AccessShell>
        <Muted>Checking your invitation…</Muted>
      </AccessShell>
    )
  }

  if (preview.state !== 'pending') {
    return (
      <AccessShell>
        <DeadInvitation preview={preview} token={token} />
      </AccessShell>
    )
  }

  const agency = preview.agency!
  const isAgency = preview.kind === 'agency'
  const roleWord = preview.role === 'manager' ? 'manager' : 'rep'

  // One landing for both kinds: only the heading and body copy differ.
  const from = isAgency
    ? `${preview.issuer_name ?? 'Your WFG representative'} invited ${agency.name} to ${BRAND.name}`
    : `${preview.issuer_name ?? 'Your manager'} invited you to ${agency.name}`
  const fromLine = isAgency ? WFG_ORGANISATION : agency.market

  return (
    <AccessShell animateIn>
      <div className="flex flex-col" style={{ gap: 20 }}>
        <div className="flex items-center" style={{ gap: 12 }}>
          <Avatar text={initialsOf(preview.issuer_name)} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.35 }}>{from}</div>
            {fromLine && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.35 }}>{fromLine}</div>}
          </div>
        </div>

        {claimError && <Notice>{CLAIM_ERRORS[claimError] ?? 'That didn’t work. Try again, or ask for a new link.'}</Notice>}

        <Heading title={isAgency ? `Set up ${agency.name} on ${BRAND.name}` : `Join ${agency.name} as a ${roleWord}`} />

        <PrimaryButton disabled={busy} onClick={accept}>Accept invitation</PrimaryButton>
        {actionError && <Notice>{actionError}</Notice>}

        <InvitationFooter expiresAt={preview.expires_at} codeInline={isAgency} />
      </div>
    </AccessShell>
  )
}

/**
 * The same on both landings. "Have a code instead?" opens one field on an agency invitation
 * (a code read down the phone); on a member invitation it goes to agency-code entry.
 */
function InvitationFooter({ expiresAt, codeInline }: { expiresAt: string | null; codeInline: boolean }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  async function check(e: React.FormEvent) {
    e.preventDefault()
    setChecking(true)
    setError(null)
    try {
      const found = await previewCode(code)
      if (found.token) window.location.href = `/activate/${found.token}`
      else if (found.kind === 'join_code' && found.state === 'pending') window.location.href = `/join?code=${encodeURIComponent(code.trim().toUpperCase())}`
      else setError('We couldn’t find an invitation with that code.')
    } catch {
      setError('We couldn’t check that code. Try again.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <Muted>
        Good until <strong style={{ color: 'var(--body)', fontWeight: 600 }}>{formatDay(expiresAt)}</strong>. One use.{' '}
        {codeInline ? (
          <button type="button" onClick={() => setOpen((o) => !o)} style={{ color: 'var(--gold)' }} className="hover:underline">
            Have a code instead?
          </button>
        ) : (
          <GoldLink href="/join">Have a code instead?</GoldLink>
        )}
      </Muted>
      {open && (
        <form onSubmit={check} className="flex" style={{ gap: 8 }}>
          <TextField
            aria-label="Invitation code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="8-character code"
            maxLength={8}
            className="code-input"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.12em' }}
          />
          <GhostButton type="submit" disabled={checking || code.trim().length < 8} style={{ width: 96 }}>
            Check
          </GhostButton>
        </form>
      )}
      {error && <Notice>{error}</Notice>}
    </div>
  )
}

function DeadInvitation({ preview, token }: { preview: AccessPreview; token: string }) {
  const [requested, setRequested] = useState(false)
  const issuer = preview.issuer_name

  if (preview.state === 'expired') {
    // A rep's agency already exists, so its code is a second way in. An owner's agency
    // invitation has no code to fall back on — only the WFG rep can renew it.
    const member = preview.kind === 'member'
    return (
      <div className="flex flex-col" style={{ gap: 16 }}>
        <Heading
          title="This invitation has expired"
          sub={
            member
              ? `It expired on ${formatDay(preview.expires_at)}. Ask ${issuer ?? 'your manager'} to resend it from Team, or join with your agency’s code.`
              : `It expired on ${formatDay(preview.expires_at)}. ${issuer ?? 'Whoever sent it'} can send you a new one.`
          }
        />
        {requested ? (
          <Notice>We’ve let {issuer ?? 'them'} know. Your new link will come from them.</Notice>
        ) : (
          <PrimaryButton onClick={() => requestNewLink(token).then(() => setRequested(true), () => setRequested(true))}>
            Request a new link
          </PrimaryButton>
        )}
        {member && (
          <GhostButton onClick={() => { window.location.href = '/join' }}>Enter an agency code</GhostButton>
        )}
      </div>
    )
  }
  if (preview.state === 'accepted') {
    return (
      <div className="flex flex-col" style={{ gap: 16 }}>
        <Heading title="This invitation has already been used" sub="Sign in instead." />
        <PrimaryButton onClick={() => { window.location.href = '/login' }}>Sign in</PrimaryButton>
      </div>
    )
  }
  if (preview.state === 'revoked') {
    return <Heading title="This invitation is no longer valid" />
  }
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <Heading title="We couldn’t find that invitation" sub="Check the link, or ask whoever sent it for a new one." />
      <Muted>
        Have an agency code? <GoldLink href="/join">Enter it here</GoldLink>.
      </Muted>
    </div>
  )
}
