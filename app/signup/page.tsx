'use client'

/**
 * E2 in supabase mode — where every invitation, link and code leads. It proves who someone
 * is, nothing else; the invitation or code they hold is claimed next (lib/access.ts).
 * Someone who already has an account goes to /login, which claims it the same way.
 *
 * With B2C this screen is the provider's hosted sign-up/sign-in page instead, which is
 * also where Google and Microsoft sign-in arrive. They are not offered here until then.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BRAND } from '@/lib/brand'
import { signup } from '@/lib/api/auth'
import { continueAfterIdentity, readIntent } from '@/lib/access'
import {
  AccessShell,
  FieldLabel,
  GoldLink,
  Heading,
  Notice,
  PrimaryButton,
  TextField,
} from '@/components/app/AccessShell'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [holdsIntent, setHoldsIntent] = useState(false)
  useEffect(() => setHoldsIntent(readIntent() !== null), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signup({ name: name.trim(), email: email.trim(), password })
      window.location.href = await continueAfterIdentity()
    } catch (err: any) {
      setError(err?.message ?? 'Sign up failed')
      setLoading(false)
    }
  }

  return (
    <AccessShell>
      <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 20 }}>
        <Heading
          title={`Create your ${BRAND.name} account`}
          sub={holdsIntent ? 'Your invitation is applied as soon as you’re in.' : undefined}
        />

        {!holdsIntent && (
          <Notice>
            Accounts are by invitation. Open the link you were sent first, or{' '}
            <Link href="/join" style={{ textDecoration: 'underline' }}>enter an agency code</Link>.
          </Notice>
        )}

        <div className="flex flex-col" style={{ gap: 14 }}>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <FieldLabel htmlFor="name">Your name</FieldLabel>
            <TextField id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </div>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <FieldLabel htmlFor="email">Work email</FieldLabel>
            <TextField
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@youragency.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <TextField
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </div>

        {error && <Notice>{error}</Notice>}

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? 'Creating your account…' : 'Continue'}
        </PrimaryButton>

        <p className="text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>
          {/* The invitation is held in the browser, so it carries over to /login. */}
          Already have an account? <GoldLink href="/login">Sign in</GoldLink>
        </p>
      </form>
    </AccessShell>
  )
}
