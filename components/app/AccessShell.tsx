'use client'

/**
 * Chrome for the screens outside the product: invitation landings, code entry, no-access
 * and agency setup.
 *
 * The lockup sits outside the card at a fixed offset from the top, and the card hangs from
 * a fixed line below it — nothing is vertically centred. So moving between steps, or
 * between the one wide step and the rest, never moves the lockup or the top of the card.
 */
import { useId } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'
import { BRAND } from '@/lib/brand'
import { cardEnter } from '@/lib/motion'

/** Single-column steps, and the one two-up step (A2). Nothing else. */
const CARD_WIDTH = { single: 440, wide: 680 } as const

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
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
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#c4a574', display: 'inline-block' }} />
        </span>
      ) : (
        <>
          <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 24, height: 24, backgroundColor: '#0f0f0f' }}>
            <Sun size={14} color="#fafaf9" />
          </span>
          <Moon size={16} color="#c4a574" />
        </>
      )}
    </button>
  )
}

export function AccessShell({
  children,
  size = 'single',
  animateIn = false,
}: {
  children: React.ReactNode
  size?: keyof typeof CARD_WIDTH
  /** Invitation landings arrive with a fade and a 12px rise; setup steps do not. */
  animateIn?: boolean
}) {
  const { theme } = useTheme()
  return (
    <div
      className="access-shell relative flex min-h-screen flex-col items-center px-4"
      style={{ backgroundColor: 'var(--background)', paddingTop: 'max(96px, 18vh)' }}
    >
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div data-testid="access-lockup" className="flex justify-center" style={{ height: 54 }}>
        <Image
          src={theme === 'dark' ? '/images/logo/lockup_dark.svg' : '/images/logo/lockup_light.svg'}
          alt={BRAND.name}
          width={150}
          height={54}
          priority
          unoptimized
          style={{ width: 150, height: 54 }}
        />
      </div>
      <motion.div
        initial={animateIn ? cardEnter.initial : false}
        animate={cardEnter.animate}
        transition={cardEnter.transition}
        data-testid="access-card"
        className="app-card w-full p-8 sm:p-10"
        style={{ maxWidth: CARD_WIDTH[size], marginTop: 24 }}
      >
        {children}
      </motion.div>
      <footer className="mt-auto flex justify-center" style={{ padding: '48px 0 24px' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{BRAND.legal}</span>
      </footer>
    </div>
  )
}

export function Heading({ id, title, sub }: { id?: string; title: string; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <h1 id={id} className="font-semibold leading-tight" style={{ fontSize: 20, color: 'var(--foreground)', textWrap: 'balance' }}>
        {title}
      </h1>
      {sub && <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{sub}</p>}
    </div>
  )
}

export function FieldLabel({ htmlFor, optional, children }: { htmlFor?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} style={{ fontSize: 12, fontWeight: 500, color: 'var(--body)' }}>
      {children}
      {optional && <span style={{ fontWeight: 400, color: 'var(--muted)' }}> (optional)</span>}
    </label>
  )
}

export function TextField({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const { theme } = useTheme()
  return (
    <input
      {...props}
      className={`access-input w-full rounded-[8px] outline-none ${className ?? ''}`}
      style={{
        height: 40,
        backgroundColor: theme === 'dark' ? 'var(--surface)' : 'var(--card)',
        border: '1px solid var(--border)',
        padding: '0 12px',
        fontSize: 14,
        color: 'var(--foreground)',
        ...props.style,
      }}
    />
  )
}

/**
 * The gold primary. Disabled is one treatment across the flow: muted gold, still focusable
 * (`aria-disabled`, so a keyboard user reaches it and hears why), clicks ignored, and an
 * optional reason line underneath.
 */
export function PrimaryButton({
  children,
  disabled,
  disabledReason,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { disabledReason?: string }) {
  const { theme } = useTheme()
  const reasonId = useId()
  const showReason = disabled && disabledReason
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <button
        {...props}
        aria-disabled={disabled || undefined}
        aria-describedby={showReason ? reasonId : undefined}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault()
            return
          }
          onClick?.(e)
        }}
        className="t-fast w-full rounded-[8px] font-semibold"
        style={{
          height: 42,
          fontSize: 14,
          backgroundColor: theme === 'dark' ? 'var(--gold)' : '#000000',
          color: theme === 'dark' ? '#000000' : '#fafaf9',
          opacity: disabled ? 0.45 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transitionProperty: 'opacity, background-color',
          ...props.style,
        }}
      >
        {children}
      </button>
      {showReason && (
        <p id={reasonId} style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          {disabledReason}
        </p>
      )}
    </div>
  )
}

export function GhostButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full rounded-[8px] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ height: 42, fontSize: 14, border: '1px solid var(--border)', color: 'var(--body)', backgroundColor: 'transparent', ...props.style }}
    >
      {children}
    </button>
  )
}

/** A quiet, left-aligned text action: "← Back", "+ Add another". */
export function TextButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex items-center self-start rounded-[6px] hover:underline"
      style={{ gap: 6, fontSize: 13, color: 'var(--body)', padding: '2px 0', ...props.style }}
    >
      {children}
    </button>
  )
}

/**
 * Amber — the only warning colour in the product. With a title, amber marks the border and
 * the title and the body reads in body colour; a bare one-line notice stays amber.
 */
export function Notice({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-[8px]"
      style={{
        padding: '12px 14px',
        backgroundColor: 'rgba(217, 119, 6, 0.08)',
        border: '1px solid rgba(217, 119, 6, 0.45)',
        fontSize: 13,
        lineHeight: 1.5,
        color: title ? 'var(--body)' : '#d97706',
      }}
    >
      {title && <strong style={{ display: 'block', marginBottom: 4, fontWeight: 600, color: '#d97706' }}>{title}</strong>}
      {children}
    </div>
  )
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{children}</p>
}

export function GoldLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ color: 'var(--gold)' }} className="hover:underline">
      {children}
    </Link>
  )
}

export function Avatar({ text }: { text: string }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full"
      style={{ width: 36, height: 36, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--gold)', fontSize: 12, fontWeight: 600 }}
    >
      {text}
    </span>
  )
}

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (parts[0] ?? '?').slice(0, 2).toUpperCase()
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })
}
