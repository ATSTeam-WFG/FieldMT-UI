'use client'

/**
 * An agency join code, copyable without selecting text. Used on setup (A3) and on Team.
 * The label crossfades to "Copied" and back after two seconds; screen readers hear it.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import { EASE_STANDARD } from '@/lib/motion'

export function CodeField({ code, size = 'md' }: { code: string; size?: 'md' | 'lg' }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      return // clipboard unavailable (insecure origin) — the code is on screen regardless
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="flex items-center rounded-[8px]"
      style={{ gap: 8, padding: '6px 6px 6px 14px', background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <span
        data-testid="join-code"
        className="flex-1"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: size === 'lg' ? 18 : 16,
          fontWeight: 600,
          letterSpacing: '0.16em',
          color: 'var(--gold)',
        }}
      >
        {code}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : `Copy agency code ${code}`}
        className="inline-flex shrink-0 items-center justify-center rounded-[6px] transition-opacity hover:opacity-80"
        style={{ height: 32, minWidth: 84, gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--body)', border: '1px solid var(--border)', background: 'var(--card)' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? 'copied' : 'copy'}
            className="inline-flex items-center"
            style={{ gap: 6 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1, ease: EASE_STANDARD }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </motion.span>
        </AnimatePresence>
      </button>
      <span aria-live="polite" className="sr-only">{copied ? 'Agency code copied' : ''}</span>
    </div>
  )
}
