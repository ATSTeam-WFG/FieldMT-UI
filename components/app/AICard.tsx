'use client'

import { useState } from 'react'
import { Sparkles, X, Volume2, ChevronDown, ChevronRight } from 'lucide-react'

// ── Shared visual token ───────────────────────────────────────────────────────

export const AI_CARD_BASE: React.CSSProperties = {
  backgroundColor: 'rgba(196,165,116,0.06)',
  border: '1px solid rgba(196,165,116,0.22)',
  borderLeftWidth: 4,
  borderLeftColor: '#c4a574',
  borderRadius: 8,
  boxShadow: '0 1px 3px rgba(196,165,116,0.08)',
  overflow: 'hidden',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AICardProps {
  /** Label text after "AI ·" — e.g. "Daily Nudge", "Summary", "Insight" */
  label: string
  /** Small muted text rendered next to the label — e.g. "Updated today" */
  sublabel?: string
  /** Card body content */
  children: React.ReactNode
  /** Renders an X dismiss button and calls this when clicked */
  onDismiss?: () => void
  /** Renders a Volume2 "Read aloud" button (non-functional in demo) */
  readAloud?: boolean
  /**
   * Collapsible mode — the whole card header becomes a toggle button.
   * Uses internal state; starts collapsed by default.
   */
  collapsible?: boolean
  /**
   * Text shown inline in the collapsed header button.
   * e.g. "Coaching prep for Kevin →"
   */
  collapseTitle?: string
  /** Override the default collapsed = true starting state */
  defaultCollapsed?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AICard({
  label,
  sublabel,
  children,
  onDismiss,
  readAloud,
  collapsible,
  collapseTitle,
  defaultCollapsed = true,
}: AICardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  // ── Collapsible variant ──────────────────────────────────────────────────
  if (collapsible) {
    return (
      <div style={AI_CARD_BASE}>
        <button
          type="button"
          onClick={() => setCollapsed(p => !p)}
          className="flex w-full items-center justify-between transition-colors hover:bg-[rgba(196,165,116,0.06)]"
          style={{ padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <Sparkles size={12} style={{ color: '#c4a574', flexShrink: 0 }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: '#c4a574',
                textTransform: 'uppercase',
              }}
            >
              AI
            </span>
            {collapseTitle && (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#c4a574' }}>
                {collapseTitle}
              </span>
            )}
          </div>
          {collapsed
            ? <ChevronRight size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            : <ChevronDown  size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          }
        </button>

        {!collapsed && (
          <div style={{ borderTop: '1px solid rgba(196,165,116,0.22)', padding: '0 16px 14px' }}>
            {children}
          </div>
        )}
      </div>
    )
  }

  // ── Standard variant ─────────────────────────────────────────────────────
  return (
    <div style={{ ...AI_CARD_BASE, padding: '14px 16px' }}>
      <div className="flex items-start justify-between" style={{ gap: 12 }}>
        {/* Left: label + content */}
        <div className="flex flex-col" style={{ gap: 6, flex: 1, minWidth: 0 }}>
          <div className="flex items-center" style={{ gap: 6 }}>
            <Sparkles size={13} style={{ color: '#c4a574', flexShrink: 0 }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: '#c4a574',
                textTransform: 'uppercase',
              }}
            >
              AI · {label}
            </span>
            {sublabel && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 400,
                  textTransform: 'none',
                  letterSpacing: 'normal',
                }}
              >
                {sublabel}
              </span>
            )}
          </div>
          {children}
        </div>

        {/* Right: action buttons */}
        {(readAloud || onDismiss) && (
          <div className="flex shrink-0 items-center gap-2">
            {readAloud && (
              <button
                type="button"
                title="Read aloud"
                className="transition-opacity hover:opacity-70"
                style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                <Volume2 size={14} />
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="transition-opacity hover:opacity-70"
                style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
