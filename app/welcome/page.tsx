'use client'

/**
 * A1–A3 — the owner's agency setup. Only an owner arriving on a WFG invitation sees these,
 * with no sidebar and no product behind them: the agency is pending until they finish.
 * Abandoning is safe; the next sign-in resumes at the unfinished step (agency.setup_step).
 *
 * The draft lives here, not in the steps, so going back keeps what was typed. The server
 * holds the furthest step reached; going back only moves the view, and continuing re-saves.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { ApiError } from '@/lib/api/client'
import { advanceSetup, getSession, type SessionState } from '@/lib/api/access'
import { destinationFor } from '@/lib/access'
import { stepEnter } from '@/lib/motion'
import {
  AccessShell,
  FieldLabel,
  GhostButton,
  Heading,
  Muted,
  Notice,
  PrimaryButton,
  TextButton,
  TextField,
} from '@/components/app/AccessShell'
import { CodeField } from '@/components/app/CodeField'

type Role = 'agent' | 'manager'
type Shape = 'single' | 'multi'
type Row = { key: number; email: string; role: Role }
type Draft = { agencyName: string; market: string; name: string; type: Shape | null; rows: Row[] }

const TOTAL_STEPS = 3
const EMAIL = /.+@.+\..+/
let rowKey = 0
const newRow = (): Row => ({ key: ++rowKey, email: '', role: 'agent' })

export default function WelcomePage() {
  const [session, setSession] = useState<SessionState | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [viewStep, setViewStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getSession().then(
      (s) => {
        if (s.state !== 'setup_required' || !s.agency || !s.user) {
          window.location.replace(destinationFor(s))
          return
        }
        setSession(s)
        setViewStep(s.agency.setup_step ?? 1)
        setDraft({
          agencyName: s.agency.name,
          market: s.agency.market ?? '',
          name: s.user.name,
          // Resuming at A3 means "Me and my reps" was already chosen.
          type: (s.agency.setup_step ?? 1) >= 3 ? 'multi' : null,
          rows: [newRow()],
        })
      },
      () => setError('We couldn’t load your agency. Reload the page to try again.'),
    )
  }, [])

  async function submit(payload: Parameters<typeof advanceSetup>[0]) {
    setBusy(true)
    setError(null)
    try {
      const next = await advanceSetup(payload)
      if (next.state === 'setup_required' && next.agency) {
        setSession(next)
        setViewStep(next.agency.setup_step ?? viewStep)
        setBusy(false)
      } else {
        const to = destinationFor(next)
        window.location.href = `${to}${to.includes('?') ? '&' : '?'}setup=done`
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That didn’t save. Try again.')
      setBusy(false)
    }
  }

  if (!session?.agency || !session.user || !draft) {
    return (
      <AccessShell>
        {error ? <Notice>{error}</Notice> : <Muted>Loading your agency…</Muted>}
      </AccessShell>
    )
  }

  const reached = session.agency.setup_step ?? 1
  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))

  return (
    <AccessShell size={viewStep === 2 ? 'wide' : 'single'}>
      <div className="flex flex-col" style={{ gap: 20 }}>
        <Progress step={viewStep} reached={reached} onGo={setViewStep} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={viewStep} {...stepEnter}>
            {viewStep === 1 && (
              <ConfirmAgency
                draft={draft}
                email={session.user.email}
                invitedBy={session.agency.invited_by ?? null}
                busy={busy}
                onChange={update}
                onSubmit={() => submit({ step: 1, agency_name: draft.agencyName, market: draft.market, name: draft.name })}
              />
            )}
            {viewStep === 2 && (
              <HowYouWork
                agencyName={draft.agencyName}
                choice={draft.type}
                busy={busy}
                onChange={(type) => update({ type })}
                onSubmit={() => draft.type && submit({ step: 2, type: draft.type })}
              />
            )}
            {viewStep === 3 && (
              <InviteTeam
                rows={draft.rows}
                joinCode={session.agency.join_code}
                busy={busy}
                onRows={(rows) => update({ rows })}
                onSubmit={(invites) => submit({ step: 3, invites })}
              />
            )}
          </motion.div>
        </AnimatePresence>
        {error && <Notice>{error}</Notice>}
      </div>
    </AccessShell>
  )
}

/**
 * "Step N of 3", the bar, and Back — one fixed-height block, so the bar sits at the same
 * place on every step. Completed segments go back to their step.
 */
function Progress({ step, reached, onGo }: { step: number; reached: number; onGo: (step: number) => void }) {
  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <div className="flex items-center justify-between" style={{ height: 20 }}>
        {step > 1 ? (
          <TextButton onClick={() => onGo(step - 1)}>
            <ArrowLeft size={14} /> Back
          </TextButton>
        ) : (
          <span />
        )}
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          Step {step} of {TOTAL_STEPS}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Agency setup"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={step}
        aria-valuetext={`Step ${step} of ${TOTAL_STEPS}`}
        className="flex"
        style={{ gap: 6 }}
      >
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => {
          const done = i < step
          const fill = (
            <span className="block h-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
              <span
                className="block h-full rounded-full"
                style={{
                  width: i <= step ? '100%' : '0%',
                  backgroundColor: 'var(--gold)',
                  transition: 'width 320ms var(--ease-standard) 80ms',
                }}
              />
            </span>
          )
          // A completed step (or one already saved and returned from) is a way back.
          return done || (i <= reached && i !== step) ? (
            <button
              key={i}
              type="button"
              onClick={() => onGo(i)}
              aria-label={`Go to step ${i}`}
              className="flex-1"
              style={{ height: 3, padding: 0, cursor: 'pointer' }}
            >
              {fill}
            </button>
          ) : (
            <span key={i} className="flex-1" style={{ height: 3 }}>
              {fill}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function ConfirmAgency({
  draft,
  email,
  invitedBy,
  busy,
  onChange,
  onSubmit,
}: {
  draft: Draft
  email: string
  invitedBy: string | null
  busy: boolean
  onChange: (patch: Partial<Draft>) => void
  onSubmit: () => void
}) {
  const complete = !!draft.agencyName.trim() && !!draft.name.trim()
  return (
    <form
      className="flex flex-col"
      style={{ gap: 20 }}
      onSubmit={(e) => {
        e.preventDefault()
        if (complete && !busy) onSubmit()
      }}
    >
      <Heading
        title="Let’s set up your agency"
        sub={<>{invitedBy ? `${invitedBy} started this for you. ` : ''}Check the details and correct anything that’s off.</>}
      />
      <div className="flex flex-col" style={{ gap: 14 }}>
        <div className="flex flex-col" style={{ gap: 6 }}>
          <FieldLabel htmlFor="agency-name">Agency name</FieldLabel>
          <TextField id="agency-name" value={draft.agencyName} onChange={(e) => onChange({ agencyName: e.target.value })} required />
        </div>
        <div className="flex flex-col" style={{ gap: 6 }}>
          <FieldLabel htmlFor="market" optional>Primary market</FieldLabel>
          <TextField id="market" value={draft.market} onChange={(e) => onChange({ market: e.target.value })} placeholder="e.g. Fulton County, GA" />
        </div>
        <div className="flex flex-col" style={{ gap: 6 }}>
          <FieldLabel htmlFor="your-name">Your name</FieldLabel>
          <TextField id="your-name" value={draft.name} onChange={(e) => onChange({ name: e.target.value })} required autoComplete="name" />
        </div>
      </div>
      <Muted>
        Setting up {draft.agencyName.trim() || 'your agency'} as <strong style={{ color: 'var(--body)', fontWeight: 600 }}>{email}</strong>.
      </Muted>
      <PrimaryButton type="submit" disabled={busy || !complete} disabledReason={!complete ? 'Add the agency name and your name.' : undefined}>
        Continue
      </PrimaryButton>
    </form>
  )
}

const REP_NAV = ['My Book', 'Activities', 'Follow-ups', 'Contracts', 'Scores']
const TEAM_NAV = ['Team', 'Performance']

function Chip({ label, gold }: { label: string; gold?: boolean }) {
  return (
    <span
      className="rounded-[6px]"
      style={{
        fontSize: 11,
        padding: '3px 7px',
        border: `1px solid ${gold ? 'rgba(196,165,116,.45)' : 'var(--border)'}`,
        color: gold ? 'var(--gold)' : 'var(--muted)',
        background: 'var(--surface)',
      }}
    >
      {label}
    </span>
  )
}

const SHAPES: { value: Shape; title: string; body: string; preview: React.ReactNode }[] = [
  {
    value: 'single',
    title: 'Just me',
    body: 'I work the book myself. Nobody else at the agency is in the field.',
    preview: <div className="flex flex-wrap" style={{ gap: 4 }}>{REP_NAV.map((n) => <Chip key={n} label={n} />)}</div>,
  },
  {
    value: 'multi',
    title: 'Me and my reps',
    body: 'I have reps calling on realtors and lenders. I may be out there too.',
    preview: (
      <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--body)' }}>Everything in Just me, plus</span>
        {TEAM_NAV.map((n) => <Chip key={n} label={n} gold />)}
      </div>
    ),
  },
]

function HowYouWork({
  agencyName,
  choice,
  busy,
  onChange,
  onSubmit,
}: {
  agencyName: string
  choice: Shape | null
  busy: boolean
  onChange: (shape: Shape) => void
  onSubmit: () => void
}) {
  const refs = useRef<(HTMLDivElement | null)[]>([])
  // Roving tab stop: the selected option, or the first when nothing is chosen yet.
  const focusIndex = Math.max(0, SHAPES.findIndex((s) => s.value === choice))

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
      const next = (index + step + SHAPES.length) % SHAPES.length
      onChange(SHAPES[next].value)
      refs.current[next]?.focus()
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onChange(SHAPES[index].value)
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <Heading
        id="shape-question"
        title={`Who else at ${agencyName} is out calling on realtors and lenders?`}
        sub="This sets up your workspace. You can change it whenever you like."
      />
      {/* Neither option is pre-selected: a default here gets answered by momentum. */}
      <div role="radiogroup" aria-labelledby="shape-question" className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
        {SHAPES.map((shape, i) => {
          const selected = choice === shape.value
          return (
            <div
              key={shape.value}
              ref={(el) => { refs.current[i] = el }}
              role="radio"
              aria-checked={selected}
              aria-labelledby={`shape-${shape.value}-title`}
              aria-describedby={`shape-${shape.value}-body`}
              tabIndex={i === focusIndex ? 0 : -1}
              onClick={() => onChange(shape.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="t-fast relative flex cursor-pointer flex-col rounded-[8px] text-left outline-none focus-visible:ring-1 focus-visible:ring-[#c4a574]"
              style={{
                gap: 8,
                padding: 14,
                border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
                background: selected ? 'rgba(196,165,116,0.08)' : 'var(--card)',
                transitionProperty: 'border-color, background-color',
              }}
            >
              <span
                aria-hidden
                className="absolute grid place-items-center rounded-full"
                style={{ top: 14, right: 14, width: 16, height: 16, border: `1.5px solid ${selected ? 'var(--gold)' : 'var(--border)'}` }}
              >
                <span
                  className="t-fast block rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    background: 'var(--gold)',
                    opacity: selected ? 1 : 0,
                    transform: `scale(${selected ? 1 : 0.8})`,
                    transitionProperty: 'opacity, transform',
                  }}
                />
              </span>
              <span id={`shape-${shape.value}-title`} style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', paddingRight: 24 }}>
                {shape.title}
              </span>
              <span id={`shape-${shape.value}-body`} style={{ fontSize: 13, color: 'var(--body)', lineHeight: 1.5 }}>{shape.body}</span>
              <span className="flex flex-col" style={{ gap: 8, borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 2 }}>
                <span style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
                  You’ll get
                </span>
                {shape.preview}
              </span>
            </div>
          )
        })}
      </div>
      <Muted>
        Escrow officers, processors and closers don’t need accounts — this is for the people out calling.{' '}
        <strong style={{ color: 'var(--body)', fontWeight: 600 }}>Add reps any time; nothing moves.</strong>
      </Muted>
      <PrimaryButton
        disabled={busy || !choice}
        disabledReason={!choice ? 'Pick how you’ll work to continue.' : undefined}
        onClick={onSubmit}
      >
        Continue
      </PrimaryButton>
    </div>
  )
}

function InviteTeam({
  rows,
  joinCode,
  busy,
  onRows,
  onSubmit,
}: {
  rows: Row[]
  joinCode: string | null
  busy: boolean
  onRows: (rows: Row[]) => void
  onSubmit: (invites: { email: string; role: Role }[]) => void
}) {
  const [focusKey, setFocusKey] = useState<number | null>(null)
  useEffect(() => {
    if (focusKey !== null) document.getElementById(`invite-email-${focusKey}`)?.focus()
  }, [focusKey])

  const filled = rows.filter((r) => r.email.trim())
  const invalid = filled.some((r) => !EMAIL.test(r.email.trim()))
  const reason = filled.length === 0 ? 'Add an email, or choose I’ll do this later.' : invalid ? 'Check the email addresses.' : undefined

  function patch(key: number, change: Partial<Row>) {
    onRows(rows.map((r) => (r.key === key ? { ...r, ...change } : r)))
  }

  function addRow() {
    const row = newRow()
    onRows([...rows, row])
    setFocusKey(row.key)
  }

  return (
    <form
      className="flex flex-col"
      style={{ gap: 20 }}
      onSubmit={(e) => {
        e.preventDefault()
        if (!reason && !busy) onSubmit(filled.map((r) => ({ email: r.email.trim(), role: r.role })))
      }}
    >
      <Heading title="Bring your team in" sub="Each person gets their own link to join. You’ll find every link on Team." />

      <div className="flex flex-col" style={{ gap: 8 }}>
        <AnimatePresence initial={false}>
          {rows.map((row, i) => (
            <motion.div
              key={row.key}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="flex items-center" style={{ gap: 8 }}>
                <TextField
                  id={`invite-email-${row.key}`}
                  type="email"
                  aria-label={`Email ${i + 1}`}
                  value={row.email}
                  onChange={(e) => patch(row.key, { email: e.target.value })}
                  placeholder="name@youragency.com"
                />
                <RoleToggle
                  label={`Role for ${row.email.trim() || `person ${i + 1}`}`}
                  value={row.role}
                  onChange={(role) => patch(row.key, { role })}
                />
                {rows.length > 1 && (
                  <button type="button" aria-label={`Remove person ${i + 1}`} onClick={() => onRows(rows.filter((r) => r.key !== row.key))}>
                    <X size={16} color="var(--muted)" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <TextButton onClick={addRow}>
          <Plus size={14} /> Add another
        </TextButton>
      </div>

      {joinCode && (
        <div className="flex flex-col rounded-[8px]" style={{ gap: 10, padding: 14, border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
            Or share your agency code
          </span>
          <CodeField code={joinCode} />
          <p style={{ fontSize: 14, color: 'var(--body)', lineHeight: 1.5 }}>
            Anyone with this code can join as a rep. It’s on <strong style={{ fontWeight: 600 }}>Team</strong> whenever you need it.
          </p>
        </div>
      )}

      <div className="flex flex-col" style={{ gap: 10 }}>
        <PrimaryButton type="submit" disabled={busy || !!reason} disabledReason={reason}>
          Create invitations
        </PrimaryButton>
        {/* Safe: the agency exists and the manager checklist brings them back to Team. */}
        <GhostButton type="button" disabled={busy} onClick={() => onSubmit([])}>
          I’ll do this later
        </GhostButton>
      </div>
    </form>
  )
}

function RoleToggle({ label, value, onChange }: { label: string; value: Role; onChange: (r: Role) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 rounded-[8px]" style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
      {(['agent', 'manager'] as const).map((r) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={value === r}
          onClick={() => onChange(r)}
          className="t-fast"
          style={{
            height: 38,
            padding: '0 10px',
            fontSize: 12,
            fontWeight: value === r ? 600 : 400,
            color: value === r ? 'var(--gold)' : 'var(--muted)',
            background: value === r ? 'var(--surface)' : 'transparent',
            transitionProperty: 'color, background-color',
          }}
        >
          {r === 'agent' ? 'Rep' : 'Manager'}
        </button>
      ))}
    </div>
  )
}
