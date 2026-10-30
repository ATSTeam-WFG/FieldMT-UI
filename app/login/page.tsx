'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'
import { BRAND } from '@/lib/brand'
import { login } from '@/lib/api/auth'
import { continueAfterIdentity, readIntent } from '@/lib/access'

function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme, toggleTheme } = useTheme()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const sessionExpired = searchParams.get('expired') === '1'
  // Arrived from an invitation or agency code: it is claimed once sign-in proves who you are.
  const [holdsIntent, setHoldsIntent] = useState(false)
  useEffect(() => setHoldsIntent(readIntent() !== null), [])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      // Full navigation so RoleContext remounts and re-fetches /auth/me with the new token
      window.location.href = await continueAfterIdentity()
    } catch (err: any) {
      setError(err.message ?? 'Sign in failed')
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    height: 40,
    backgroundColor: theme === 'dark' ? 'var(--surface)' : 'var(--card)',
    border: '1px solid var(--border)',
    padding: '0 12px',
    fontSize: 14,
    color: 'var(--foreground)',
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-6"
      style={{ backgroundColor: 'var(--background)' }}
    >
      {/* Theme toggle — top-right, outside card */}
      <div className="absolute right-6 top-6">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex items-center rounded-full"
          style={{
            width: 72,
            height: 32,
            backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f5f3ef',
            padding: '0 6px',
            justifyContent: theme === 'dark' ? 'flex-end' : 'space-between',
          }}
        >
          {theme === 'dark' ? (
            <span className="flex items-center gap-1.5">
              <Moon size={16} color="#c4a574" />
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#c4a574',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
            </span>
          ) : (
            <>
              <span
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{ width: 24, height: 24, backgroundColor: '#0f0f0f' }}
              >
                <Sun size={14} color="#fafaf9" />
              </span>
              <Moon size={16} color="#c4a574" />
            </>
          )}
        </button>
      </div>

      {/* Login card */}
      <div className="app-card w-full max-w-[400px] p-10">

        {/* Logo block */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col" style={{ gap: 6 }}>
            <Image
              src={theme === 'dark'
                ? '/images/logo/lockup_dark.svg'
                : '/images/logo/lockup_light.svg'}
              alt={BRAND.name}
              width={178}
              height={64}
              priority
              unoptimized
              style={{ width: 178, height: 'auto' }}
            />
            <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
              {BRAND.category}
            </span>
          </div>
        </div>

        <div style={{ height: 32 }} />

        {/* Heading block */}
        <div className="flex flex-col" style={{ gap: 4 }}>
          <h1
            className="font-semibold leading-tight"
            style={{ fontSize: 20, color: 'var(--foreground)' }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            {holdsIntent ? 'Sign in to accept your invitation' : 'Sign in to your account'}
          </p>
        </div>

        <div style={{ height: 24 }} />

        {sessionExpired && (
          <div
            className="rounded-[8px] mb-4"
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(217, 119, 6, 0.1)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              fontSize: 13,
              color: '#d97706',
            }}
          >
            Your session has expired. Please sign in again.
          </div>
        )}

        <form onSubmit={handleSignIn} className="flex flex-col">

          {/* Email field */}
          <div className="flex flex-col" style={{ gap: 6 }}>
            <label
              htmlFor="email"
              style={{ fontSize: 12, fontWeight: 500, color: 'var(--body)' }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@agency.com"
              className="w-full rounded-[8px] outline-none transition-shadow focus:ring-1 focus:ring-[#c4a574]"
              style={inputStyle}
            />
          </div>

          <div style={{ height: 16 }} />

          {/* Password field */}
          <div className="flex flex-col" style={{ gap: 6 }}>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                style={{ fontSize: 12, fontWeight: 500, color: 'var(--body)' }}
              >
                Password
              </label>
              <Link
                href="/coming-soon"
                style={{ fontSize: 12, color: 'var(--gold)' }}
                className="hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div
              className="flex items-center rounded-[8px]"
              style={{
                height: 40,
                backgroundColor: theme === 'dark' ? 'var(--surface)' : 'var(--card)',
                border: '1px solid var(--border)',
                padding: '0 12px',
              }}
            >
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: 14, color: 'var(--foreground)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="ml-2 flex shrink-0 items-center"
              >
                {showPassword
                  ? <EyeOff size={16} color="var(--muted)" />
                  : <Eye size={16} color="var(--muted)" />
                }
              </button>
            </div>
          </div>

          <div style={{ height: 24 }} />

          {error && (
            <p style={{ fontSize: 13, color: '#d97706', marginBottom: 12 }}>{error}</p>
          )}

          {/* Sign in button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[8px] font-semibold transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
            style={{
              height: 42,
              fontSize: 14,
              backgroundColor: theme === 'dark' ? 'var(--gold)' : '#000000',
              color: theme === 'dark' ? '#000000' : '#fafaf9',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          {/* Google and Microsoft sign-in arrive with B2C, on its hosted page. */}

          <div style={{ height: 20 }} />

          {/* Divider — between signing in and getting in for the first time */}
          <div className="flex items-center" style={{ gap: 12 }}>
            <div className="flex-1" style={{ height: 1, backgroundColor: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>or</span>
            <div className="flex-1" style={{ height: 1, backgroundColor: 'var(--border)' }} />
          </div>

          <div style={{ height: 16 }} />

          {/* The one way in for someone without an account yet */}
          {holdsIntent ? (
            <p className="text-center" style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              New here?{' '}
              <Link href="/signup" style={{ color: 'var(--gold)' }} className="hover:underline">
                Create your account
              </Link>
            </p>
          ) : (
            <>
              <p className="text-center" style={{ fontSize: 13, color: 'var(--body)' }}>
                Have a code? Continue below
              </p>
              <div style={{ height: 10 }} />
              <Link
                href="/join"
                className="flex items-center justify-center rounded-[8px] transition-opacity hover:opacity-80"
                style={{
                  height: 42,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  border: '1px solid var(--border-strong)',
                  backgroundColor: 'transparent',
                }}
              >
                Join with code
              </Link>
            </>
          )}
        </form>
      </div>

      {/* Page footer */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {BRAND.legal}
        </span>
      </div>
    </div>
  )
}

export default function LoginPageWrapper() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  )
}
