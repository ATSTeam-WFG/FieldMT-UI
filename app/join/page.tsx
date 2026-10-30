'use client'

/**
 * J2 — join an agency with its code. The agency is confirmed on screen before anyone
 * commits, so a mistyped code can't quietly put someone in the wrong agency. A code always
 * means rep; a manager is invited by email.
 */
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { hasToken } from '@/lib/api/client'
import { previewCode, type AccessPreview } from '@/lib/api/access'
import { continueAfterIdentity, saveIntent } from '@/lib/access'
import { startIdentity } from '@/lib/identity'
import {
  AccessShell,
  Avatar,
  GoldLink,
  Heading,
  Muted,
  Notice,
  PrimaryButton,
  TextField,
  initialsOf,
} from '@/components/app/AccessShell'

const CLAIM_ERRORS: Record<string, string> = {
  code_not_found: 'We couldn’t find an agency with that code. Check it with your manager.',
  already_in_agency: 'You already belong to another agency, so this code can’t add you.',
  email_in_use: 'Another account already uses that email address. Sign in with it instead.',
}

function JoinPage() {
  const params = useSearchParams()
  const [code, setCode] = useState((params.get('code') ?? '').toUpperCase())
  const [found, setFound] = useState<AccessPreview | null>(null)
  const [error, setError] = useState<string | null>(() => {
    const claim = params.get('claim')
    return claim ? CLAIM_ERRORS[claim] ?? 'That didn’t work. Try again.' : null
  })
  const [busy, setBusy] = useState(false)

  async function check(value: string) {
    const normalized = value.trim().toUpperCase()
    if (normalized.length < 8) return
    setBusy(true)
    setError(null)
    setFound(null)
    try {
      const preview = await previewCode(normalized)
      if (preview.token) {
        // An agency invitation's code read down the phone — that's E1, not a join.
        window.location.href = `/activate/${preview.token}`
        return
      }
      if (preview.kind === 'join_code' && preview.state === 'pending') setFound(preview)
      else setError(CLAIM_ERRORS.code_not_found)
    } catch {
      setError('We couldn’t check that code. Try again.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (code.length === 8) check(code)
    // Only the prefilled ?code= — typing checks on submit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function join() {
    setBusy(true)
    saveIntent({ code: code.trim().toUpperCase() }, `/join?code=${encodeURIComponent(code.trim().toUpperCase())}`)
    try {
      if (hasToken()) window.location.href = await continueAfterIdentity()
      else await startIdentity()
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <AccessShell>
      <div className="flex flex-col" style={{ gap: 20 }}>
        <Heading title="Enter your agency code" sub="Your manager can find it on the Team screen." />

        <form
          onSubmit={(e) => {
            e.preventDefault()
            check(code)
          }}
          className="flex flex-col"
          style={{ gap: 10 }}
        >
          <TextField
            aria-label="Agency code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setFound(null)
            }}
            placeholder="8-character code"
            maxLength={8}
            autoFocus
            className="code-input"
            style={{
              height: 48,
              textAlign: 'center',
              fontSize: 18,
              letterSpacing: '0.18em',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: 'var(--gold)',
            }}
          />
          {!found && (
            <PrimaryButton
              type="submit"
              disabled={busy || code.trim().length < 8}
              disabledReason={!busy && code.trim().length < 8 ? 'Enter all 8 characters.' : undefined}
            >
              {busy ? 'Checking…' : 'Find my agency'}
            </PrimaryButton>
          )}
        </form>

        {error && <Notice>{error}</Notice>}

        {found?.agency && (
          <div className="flex flex-col" style={{ gap: 12 }}>
            <div
              className="flex items-center rounded-[8px]"
              style={{ gap: 12, padding: '12px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderTop: '2px solid var(--gold)' }}
            >
              <Avatar text={initialsOf(found.agency.name)} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{found.agency.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {[found.agency.market, found.issuer_name && `Owner: ${found.issuer_name}`].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
            <PrimaryButton disabled={busy} onClick={join}>Join as a rep</PrimaryButton>
            <Muted>Not your agency? Check the code with your manager.</Muted>
          </div>
        )}

        <Muted>
          Already have an account? <GoldLink href="/login">Sign in</GoldLink>
        </Muted>
      </div>
    </AccessShell>
  )
}

export default function JoinPageWrapper() {
  return (
    <Suspense>
      <JoinPage />
    </Suspense>
  )
}
