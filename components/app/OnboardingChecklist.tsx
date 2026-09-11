'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'

import { useOnboarding } from '@/lib/hooks/useOnboarding'
import { toast } from '@/lib/hooks/use-toast'
import { useNotifications } from '@/lib/context/NotificationContext'
import { useRole } from '@/lib/context/RoleContext'
import { useActivityLog } from '@/lib/context/ActivityLogContext'
import { useAddContact } from '@/lib/context/AddContactContext'
import { useContract } from '@/lib/context/ContractContext'
import { useInviteAgent } from '@/lib/context/InviteAgentContext'
import { ONBOARDING_STEPS, type OnboardingAction } from './onboarding-steps'
import type { OnboardingStep } from '@/lib/api/onboarding'

// "get you started" and "build your team" are load-bearing — dashboard.spec.ts
// and manager.spec.ts match on them.
const repHeadline = (firstName: string) => `Welcome, ${firstName} — let's get you started`
const MANAGER_HEADLINE = "Let's build your team"

const COMPLETION_MESSAGE = "You're all set up for the Field."

export function OnboardingChecklist({ style }: { style?: React.CSSProperties }) {
  const { checklist, visible, complete } = useOnboarding()
  const { persona } = useRole()
  const { refresh: refreshNotifications } = useNotifications()
  const { openLog } = useActivityLog()
  const { openAddContact } = useAddContact()
  const { openLog: openContract } = useContract()
  const { openInviteAgent } = useInviteAgent()

  // The completion moment happens off-page: the card just closes, and the AI
  // card it was suppressing takes the space back. The congratulation arrives as
  // a toast plus a row in the bell.
  const retired = useRef(false)

  const justFinished = !!checklist && checklist.complete && !checklist.dismissed
  useEffect(() => {
    if (!justFinished || retired.current) return
    retired.current = true
    complete()
      .then(() => {
        // TOAST_LIMIT is 1, and the action that finished the last step usually
        // fires its own success toast — wait for that one to land first.
        setTimeout(() => toast({ title: COMPLETION_MESSAGE }), 800)
        refreshNotifications()
      })
      .catch(() => {})
  }, [justFinished, complete, refreshNotifications])

  function runAction(action: OnboardingAction) {
    if (action === 'log_activity') openLog()
    else if (action === 'add_contact') openAddContact()
    else if (action === 'add_contract') openContract()
    else if (action === 'invite_rep') openInviteAgent()
  }

  const isManager = checklist?.role === 'manager'
  const headline = isManager ? MANAGER_HEADLINE : repHeadline(persona.name.split(' ')[0])

  return (
    <AnimatePresence>
      {visible && checklist && (
        <motion.div
          key="onboarding-checklist"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
          exit={{ opacity: 0, height: 0, marginTop: 0, overflow: 'hidden', transition: { duration: 0.18 } }}
          style={style}
        >
          <div
            className="rounded-[8px]"
            style={{
              backgroundColor: 'var(--card)',
              borderTop: '2px solid #c4a574',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              padding: '20px 20px 18px',
            }}
          >
            <Header
              headline={headline}
              completed={checklist.completed}
              total={checklist.total}
            />
            <StepList steps={checklist.steps} onAction={runAction} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Header({
  headline,
  completed,
  total,
}: {
  headline: string
  completed: number
  total: number
}) {
  const pct = total === 0 ? 0 : (completed / total) * 100

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="flex items-start justify-between" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
          {headline}
        </h2>
        {/* The bar is the only progress indicator — completed steps leave the
            card entirely rather than piling up as a checked list below it. */}
        <span
          className="shrink-0"
          style={{ fontSize: 12, fontWeight: 600, color: '#c4a574', whiteSpace: 'nowrap' }}
        >
          {completed} of {total}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
        className="mt-3 h-1 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--border)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: '#c4a574' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function StepList({
  steps,
  onAction,
}: {
  steps: OnboardingStep[]
  onAction: (action: OnboardingAction) => void
}) {
  const todo = steps.filter(s => !s.done)

  return (
    <>
      {todo.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 10 }}>
          {todo.map(step => (
            <StepTile key={step.key} step={step} onAction={onAction} />
          ))}
        </div>
      )}
    </>
  )
}

function StepTile({
  step,
  onAction,
}: {
  step: OnboardingStep
  onAction: (action: OnboardingAction) => void
}) {
  const meta = ONBOARDING_STEPS[step.key]
  const Icon = meta.icon

  const cta = meta.href ? (
    <Link
      href={meta.href}
      className="inline-flex h-10 items-center justify-center whitespace-nowrap px-4 hover:opacity-90 active:opacity-80 sm:h-7 sm:px-3"
      style={{
        fontSize: 12, fontWeight: 600,
        backgroundColor: '#c4a574', color: '#000000',
        borderRadius: 6, textDecoration: 'none',
        transition: 'opacity 0.15s',
      }}
    >
      {meta.ctaLabel}
    </Link>
  ) : (
    <button
      onClick={() => meta.action && onAction(meta.action)}
      className="inline-flex h-10 items-center justify-center whitespace-nowrap px-4 hover:opacity-90 active:opacity-80 sm:h-7 sm:px-3"
      style={{
        fontSize: 12, fontWeight: 600,
        backgroundColor: '#c4a574', color: '#000000',
        border: 'none', borderRadius: 6, cursor: 'pointer',
        transition: 'opacity 0.15s',
      }}
    >
      {meta.ctaLabel}
    </button>
  )

  return (
    <div
      className="flex flex-col rounded-[8px]"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '12px 14px',
        gap: 8,
      }}
    >
      <div
        className="flex items-center justify-center rounded-[6px]"
        style={{ width: 30, height: 30, backgroundColor: 'var(--card)', border: '1px solid var(--border)', flexShrink: 0 }}
      >
        <Icon size={14} style={{ color: 'var(--muted)' }} />
      </div>
      {/* On a phone the copy sits left and the CTA right, so the button does not
          take a row of its own. `flex-wrap` plus a 60% basis makes that adaptive:
          where the label is short the row holds, and where it is long ("View
          Performance" on a 390px screen) the button drops below rather than
          squeezing the copy into a four-line column. From sm up the tile stacks. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:flex-col sm:items-stretch sm:gap-2">
        <div
          className="min-w-[8rem] flex-1 sm:min-w-0"
          style={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{meta.title}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{meta.description}</span>
        </div>
        <div className="shrink-0 sm:self-start">{cta}</div>
      </div>
    </div>
  )
}
