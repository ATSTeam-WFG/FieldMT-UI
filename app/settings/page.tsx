'use client'

import { useEffect } from 'react'
import { useMyAgency } from '@/lib/hooks/useMyAgency'
import { AppShell } from '@/components/app/AppShell'
import { useRole } from '@/lib/context/RoleContext'
import { useTheme } from '@/lib/context/ThemeContext'
import { useSettings } from '@/lib/hooks/useSettings'
import { Sparkles } from 'lucide-react'

// ── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="shrink-0 rounded-full transition-colors"
      style={{
        width: 40,
        height: 22,
        padding: 2,
        backgroundColor: value ? '#c4a574' : 'var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: value ? 'flex-end' : 'flex-start',
        border: 'none',
        cursor: 'pointer',
      }}
      aria-label="Toggle"
    >
      <div
        className="rounded-full"
        style={{ width: 18, height: 18, backgroundColor: '#ffffff' }}
      />
    </button>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="app-card"
      style={{ overflow: 'hidden' }}
    >
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', letterSpacing: '0.02em' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

// ── Toggle Row ────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span style={{ fontSize: 14, color: 'var(--foreground)' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{description}</span>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: agency } = useMyAgency()
  const { persona, role } = useRole()
  const { theme, toggleTheme, setTheme } = useTheme()
  const { settings, isLoading, update } = useSettings()

  // Hydrate theme from persisted settings on load
  useEffect(() => {
    if (settings?.theme && settings.theme !== theme) {
      setTheme(settings.theme as 'light' | 'dark')
    }
  }, [settings?.theme])

  // Derived values with fallbacks while loading
  const emailDigest = settings?.email_digest ?? true
  const pushNotifications = settings?.push_notifications ?? true
  const followUpReminders = settings?.follow_up_reminders ?? true
  const teamAlerts = settings?.team_alerts ?? true
  const defaultPeriod = (settings?.default_period ?? 'MTD') as 'MTD' | 'QTD' | 'YTD'
  const activityTarget = settings?.activity_target ?? 10
  const belowTargetAlert = settings?.below_target_alert ?? true
  const inactivityAlert = settings?.inactivity_alert ?? true
  const weeklyDigest = settings?.weekly_digest ?? true

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)

  return (
    <AppShell activeItem="Settings">
      <div className="flex flex-col" style={{ gap: 0 }}>

        {/* Page header */}
        <div className="flex items-center justify-between" style={{ gap: 4 }}>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <h1
              className="font-semibold leading-tight"
              style={{ fontSize: 22, color: 'var(--foreground)' }}
            >
              Settings
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>
              Manage your account preferences
            </p>
          </div>
          {isLoading && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Loading…</span>
          )}
        </div>

        {/* Settings stack */}
        <div
          className="flex flex-col"
          style={{ gap: 16, marginTop: 24 }}
        >

          {/* ── Profile ─────────────────────────────────────────────────── */}
          <Section title="Profile">
            <div
              className="flex items-center"
              style={{ padding: '20px', gap: 16, borderBottom: '1px solid var(--border)' }}
            >
              {/* Avatar */}
              <div
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{
                  width: 56,
                  height: 56,
                  backgroundColor: '#c4a574',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#000000',
                }}
              >
                {persona.initials}
              </div>

              {/* Name + role */}
              <div className="flex flex-col" style={{ gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
                  {persona.name}
                </span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {persona.title}
                </span>
              </div>
            </div>

            {/* Profile fields */}
            {[
              { label: 'Role', value: roleLabel },
              { label: 'Company', value: agency?.name ?? '—' },
              ...(persona.territory ? [{ label: 'Territory', value: persona.territory }] : []),
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between"
                style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}
              >
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{value}</span>
              </div>
            ))}

            <div style={{ padding: '14px 20px' }}>
              <button
                disabled
                style={{
                  height: 36,
                  paddingLeft: 16,
                  paddingRight: 16,
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--muted)',
                  opacity: 0.5,
                  cursor: 'not-allowed',
                }}
              >
                Edit Profile
              </button>
            </div>
          </Section>

          {/* ── Notifications + Preferences (2-col on desktop) ─────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
            <Section title="Notifications">
              <ToggleRow
                label="Email digest"
                description="Daily summary of team activity and follow-ups"
                value={emailDigest}
                onChange={(v) => update({ email_digest: v })}
              />
              <ToggleRow
                label="Push notifications"
                description="Real-time alerts on your device"
                value={pushNotifications}
                onChange={(v) => update({ push_notifications: v })}
              />
              <ToggleRow
                label="Follow-up reminders"
                description="Reminders when follow-ups are approaching or overdue"
                value={followUpReminders}
                onChange={(v) => update({ follow_up_reminders: v })}
              />
              <div
                className="flex items-center justify-between"
                style={{ padding: '14px 20px' }}
              >
                <div className="flex flex-col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--foreground)' }}>Team alerts</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Notifications when team members log activities</span>
                </div>
                <Toggle value={teamAlerts} onChange={(v) => update({ team_alerts: v })} />
              </div>
            </Section>

            <Section title="Preferences">
              {/* Default period */}
              <div
                className="flex items-center justify-between"
                style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex flex-col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--foreground)' }}>Default period</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Time range shown by default on dashboards</span>
                </div>
                <div className="flex rounded-[8px] overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {(['MTD', 'QTD', 'YTD'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => update({ default_period: p })}
                      style={{
                        height: 30,
                        paddingLeft: 12,
                        paddingRight: 12,
                        fontSize: 12,
                        fontWeight: defaultPeriod === p ? 600 : 400,
                        backgroundColor: defaultPeriod === p ? '#c4a574' : 'transparent',
                        color: defaultPeriod === p ? '#000000' : 'var(--muted)',
                        borderRight: p !== 'YTD' ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div
                className="flex items-center justify-between"
                style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex flex-col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--foreground)' }}>Theme</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Currently {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                  </span>
                </div>
                <Toggle
                  value={theme === 'dark'}
                  onChange={() => {
                    const next = theme === 'dark' ? 'light' : 'dark'
                    toggleTheme()
                    update({ theme: next })
                  }}
                />
              </div>

              {/* Language */}
              <div
                className="flex items-center justify-between"
                style={{ padding: '14px 20px' }}
              >
                <div className="flex flex-col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--foreground)' }}>Language</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Interface language</span>
                </div>
                <button
                  disabled
                  style={{
                    height: 30,
                    paddingLeft: 12,
                    paddingRight: 12,
                    borderRadius: 6,
                    fontSize: 13,
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--muted)',
                    opacity: 0.6,
                    cursor: 'not-allowed',
                  }}
                >
                  English
                </button>
              </div>
            </Section>
          </div>

          {/* ── Manager-only sections ────────────────────────────────────── */}
          {role === 'manager' && (
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
              <Section title="Team Settings">
                <div className="flex items-center justify-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex flex-col" style={{ gap: 2 }}>
                    <span style={{ fontSize: 14, color: 'var(--foreground)' }}>Default activity target</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Minimum activities per agent per month</span>
                  </div>
                  <div className="flex rounded-[8px] overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    {[8, 10, 12, 15].map((n, i, arr) => (
                      <button
                        key={n}
                        onClick={() => update({ activity_target: n })}
                        style={{
                          height: 30,
                          paddingLeft: 12,
                          paddingRight: 12,
                          fontSize: 12,
                          fontWeight: activityTarget === n ? 600 : 400,
                          backgroundColor: activityTarget === n ? '#c4a574' : 'transparent',
                          color: activityTarget === n ? '#000000' : 'var(--muted)',
                          borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className="flex items-center gap-2"
                  style={{ padding: '8px 20px 10px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
                >
                  <Sparkles size={11} style={{ color: '#c4a574', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>
                    AI suggests: <strong style={{ color: 'var(--body)' }}>12 / month</strong> based on team historical performance
                  </span>
                  <button
                    type="button"
                    onClick={() => update({ activity_target: 12 })}
                    className="transition-opacity hover:opacity-70"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#c4a574',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 0',
                    }}
                  >
                    Apply
                  </button>
                </div>
                <div className="flex items-center justify-between" style={{ padding: '14px 20px' }}>
                  <div className="flex flex-col" style={{ gap: 2 }}>
                    <span style={{ fontSize: 14, color: 'var(--foreground)' }}>Territory configuration</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Manage agent territory assignments</span>
                  </div>
                  <button
                    disabled
                    style={{
                      height: 30,
                      paddingLeft: 12,
                      paddingRight: 12,
                      borderRadius: 6,
                      fontSize: 13,
                      border: '1px solid var(--border)',
                      backgroundColor: 'transparent',
                      color: 'var(--muted)',
                      opacity: 0.5,
                      cursor: 'not-allowed',
                    }}
                  >
                    Configure →
                  </button>
                </div>
              </Section>

              <Section title="Notification Rules">
                <ToggleRow
                  label="Below-target alert"
                  description="Notify when an agent misses weekly activity target"
                  value={belowTargetAlert}
                  onChange={(v) => update({ below_target_alert: v })}
                />
                <ToggleRow
                  label="Inactivity alert"
                  description="Alert when an agent has no activity for 7+ days"
                  value={inactivityAlert}
                  onChange={(v) => update({ inactivity_alert: v })}
                />
                <ToggleRow
                  label="Weekly digest"
                  description="Receive a weekly performance summary every Monday"
                  value={weeklyDigest}
                  onChange={(v) => update({ weekly_digest: v })}
                />
              </Section>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  )
}
