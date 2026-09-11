'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMyAgency } from '@/lib/hooks/useMyAgency'
import { AnimatePresence } from 'framer-motion'
import {
  FileText, Users, TrendingUp, BarChart2,
  AlertTriangle, Calendar, Trash2, ChevronRight, ChevronLeft,
  Database, HardDrive,
} from 'lucide-react'
import { AppShell } from '@/components/app/AppShell'
import { useRole } from '@/lib/context/RoleContext'
import { useExportHistory } from '@/lib/hooks/useExports'
import { useImportHistory } from '@/lib/hooks/useImports'
import { useManagerPerformance } from '@/lib/hooks/useManagerPerformance'
import { ExportPanel, type ExportCard } from '@/components/app/ExportPanel'
import { ImportPanel, type PlatformCard } from '@/components/app/ImportPanel'

const GOLD = '#c4a574'
const PAGE_SIZE = 5

// ── Card definitions ─────────────────────────────────────────────────────────────

const PLATFORMS: PlatformCard[] = [
  {
    platform: 'qualia',
    icon: Database,
    name: 'Qualia',
    description: 'Import closed orders and referral contacts from a Qualia CSV export.',
    status: 'active',
  },
  {
    platform: 'softpro',
    icon: HardDrive,
    name: 'SoftPro',
    description: 'MISMO / CSV export support is on the way.',
    status: 'soon',
  },
]

const EXPORT_CARDS: ExportCard[] = [
  {
    type: 'activities',
    icon: Calendar,
    title: 'Activity Log',
    description: 'Every logged activity with contact, spend, notes, and status',
    format: 'CSV',
  },
  {
    type: 'spend-summary',
    icon: BarChart2,
    title: 'Spend Summary',
    description: 'Total spend grouped by activity type with averages',
    format: 'CSV',
  },
  {
    type: 'contacts',
    icon: Users,
    title: 'Relationship Health',
    description: 'All contacts with scores, 30-day trend, and days dormant',
    format: 'CSV',
  },
  {
    type: 'pdf-performance',
    icon: FileText,
    title: 'Performance Report',
    description: 'Full performance page formatted for printing or PDF export',
    format: 'PDF',
  },
  {
    type: 'team-activities',
    icon: Calendar,
    title: 'Team Activity Log',
    description: 'All activities across every rep on your team',
    format: 'CSV',
    managerOnly: true,
  },
  {
    type: 'team-performance',
    icon: TrendingUp,
    title: 'Team Performance',
    description: 'Per-agent breakdown: activities, spend, score, closings',
    format: 'CSV',
    managerOnly: true,
  },
  {
    type: 'at-risk-contacts',
    icon: AlertTriangle,
    title: 'At-Risk Contacts',
    description: 'Contacts with low scores or dormant 45+ days across your team',
    format: 'CSV',
    managerOnly: true,
  },
  {
    type: 'pdf-team',
    icon: FileText,
    title: 'Team Report',
    description: 'Full manager performance page formatted for printing or PDF export',
    format: 'PDF',
    managerOnly: true,
  },
]

// ── Shared helpers ───────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 className="font-semibold" style={{ fontSize: 16, color: 'var(--foreground)' }}>{title}</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</p>
    </div>
  )
}

function TableFooter({ page, total, onPage }: {
  page: number; total: number; onPage: (p: number) => void
}) {
  const pageCount = Math.ceil(total / PAGE_SIZE)
  if (pageCount <= 1) return null
  const btn = (disabled: boolean): React.CSSProperties => ({
    width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
    background: 'transparent', color: disabled ? 'var(--border)' : 'var(--muted)',
    cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderTop: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {page} of {pageCount}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={btn(page <= 1)} disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={15} /></button>
        <button style={btn(page >= pageCount)} disabled={page >= pageCount} onClick={() => onPage(page + 1)}><ChevronRight size={15} /></button>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────────

function ImportsExportsPage() {
  const { data: agency } = useMyAgency()
  const searchParams = useSearchParams()
  const { role, persona } = useRole()
  const isManager = role === 'manager'

  const { history: exportHistory, add: addExport, clear: clearExport } = useExportHistory()
  const { history: importHistory, add: addImport, clear: clearImport } = useImportHistory()

  const [openCard, setOpenCard] = useState<ExportCard | null>(null)
  const [openPlatform, setOpenPlatform] = useState<PlatformCard | null>(null)
  const [exportPage, setExportPage] = useState(1)
  const [importPage, setImportPage] = useState(1)

  // ?import=<platform> opens that importer straight away — the onboarding
  // checklist links here, and this is a two-section page. Ignored for a platform
  // that isn't live yet, so ?import=softpro stays inert.
  const importParam = searchParams.get('import')
  useEffect(() => {
    if (!importParam) return
    const target = PLATFORMS.find(p => p.platform === importParam && p.status === 'active')
    if (target) setOpenPlatform(target)
  }, [importParam])

  // Team agents for manager export filters (name used as ID proxy)
  const { data: teamData } = useManagerPerformance('ytd')
  const teamAgents = isManager
    ? (teamData?.agents ?? []).map(a => ({ id: a.name, name: a.name }))
    : []

  const cards = EXPORT_CARDS.filter(c => !c.managerOnly || isManager)

  const importClamped = Math.min(importPage, Math.max(1, Math.ceil(importHistory.length / PAGE_SIZE)))
  const exportClamped = Math.min(exportPage, Math.max(1, Math.ceil(exportHistory.length / PAGE_SIZE)))
  const importRows = importHistory.slice((importClamped - 1) * PAGE_SIZE, importClamped * PAGE_SIZE)
  const exportRows = exportHistory.slice((exportClamped - 1) * PAGE_SIZE, exportClamped * PAGE_SIZE)

  return (
    <AppShell activeItem="Imports/Exports">
      <div>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="font-semibold" style={{ fontSize: 22, color: 'var(--foreground)' }}>
            Imports &amp; Exports
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>
            {persona.name} · {isManager ? 'Manager' : 'Field Agent'}
          </p>
        </div>

        {/* ── IMPORTS ─────────────────────────────────────────── */}
        <SectionHeading title="Imports" subtitle="Bring closed deals in from your closing software" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 12 }}>
          {PLATFORMS.map(p => {
            const Icon = p.icon
            const soon = p.status === 'soon'
            return (
              <div
                key={p.platform}
                className="app-card"
                onClick={() => { if (!soon) setOpenPlatform(p) }}
                style={{
                  display: 'flex', flexDirection: 'column', padding: '16px 20px', gap: 12,
                  cursor: soon ? 'default' : 'pointer', opacity: soon ? 0.6 : 1, transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { if (!soon) e.currentTarget.style.borderTopColor = '#d4b584' }}
                onMouseLeave={e => { if (!soon) e.currentTarget.style.borderTopColor = GOLD }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={18} color="var(--muted)" />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{p.name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {soon ? (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, flexShrink: 0, backgroundColor: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                        Coming Soon
                      </span>
                    ) : (
                      <>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, flexShrink: 0, backgroundColor: 'rgba(196,165,116,0.12)', color: GOLD, border: '1px solid rgba(196,165,116,0.3)' }}>
                          CSV
                        </span>
                        <ChevronRight size={14} color="var(--muted)" />
                      </>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, flex: 1, margin: 0 }}>{p.description}</p>
              </div>
            )
          })}
        </div>

        {/* Import history */}
        <div className="app-card" style={{ marginBottom: 32 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-semibold" style={{ fontSize: 14, color: 'var(--foreground)' }}>Import History</span>
            {importHistory.length > 0 && (
              <button onClick={clearImport} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', height: 26, borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', fontSize: 11, color: 'var(--muted)', cursor: 'pointer' }}>
                <Trash2 size={11} /> Clear
              </button>
            )}
          </div>
          {importHistory.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No imports yet. Pick a platform above to upload your first export.
            </div>
          ) : (
            <>
              <div className="hidden md:grid" style={{ gridTemplateColumns: '1fr 90px 90px 120px', padding: '8px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                {['File', 'Contracts', 'Contacts', 'Imported'].map(h => (
                  <span key={h} style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
                ))}
              </div>
              {importRows.map((item, i) => {
                const platformName = PLATFORMS.find(p => p.platform === item.platform)?.name ?? item.platform
                return (
                  <div key={item.id} style={{ borderBottom: i < importRows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div className="hidden md:grid" style={{ gridTemplateColumns: '1fr 90px 90px 120px', padding: '12px 20px', alignItems: 'center' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.fileName}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{platformName}</div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: GOLD }}>{item.imported}</span>
                      <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{item.contactsCreated}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{relativeTime(item.generatedAt)}</span>
                    </div>
                    <div className="flex md:hidden items-center justify-between" style={{ padding: '14px 20px', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.fileName}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{platformName} · {relativeTime(item.generatedAt)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: GOLD, fontWeight: 600 }}><FileText size={12} /> {item.imported}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)' }}><Users size={12} /> {item.contactsCreated}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <TableFooter page={importClamped} total={importHistory.length} onPage={setImportPage} />
            </>
          )}
        </div>

        {/* ── EXPORTS ─────────────────────────────────────────── */}
        <SectionHeading title="Exports" subtitle="Download reports and data snapshots" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 12 }}>
          {cards.map(card => {
            const Icon = card.icon
            const isPdf = card.format === 'PDF'
            return (
              <div
                key={card.type}
                className="app-card"
                onClick={() => setOpenCard(card)}
                style={{ display: 'flex', flexDirection: 'column', padding: '16px 20px', gap: 12, cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderTopColor = '#d4b584')}
                onMouseLeave={e => (e.currentTarget.style.borderTopColor = GOLD)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color="var(--muted)" />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{card.title}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, flexShrink: 0, backgroundColor: isPdf ? 'rgba(196,165,116,0.12)' : 'var(--surface)', color: isPdf ? GOLD : 'var(--muted)', border: `1px solid ${isPdf ? 'rgba(196,165,116,0.3)' : 'var(--border)'}` }}>
                      {card.format}
                    </span>
                    <ChevronRight size={14} color="var(--muted)" />
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, flex: 1, margin: 0 }}>{card.description}</p>
              </div>
            )
          })}
        </div>

        {/* Export history */}
        <div className="app-card">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-semibold" style={{ fontSize: 14, color: 'var(--foreground)' }}>Export History</span>
            {exportHistory.length > 0 && (
              <button onClick={clearExport} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', height: 26, borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', fontSize: 11, color: 'var(--muted)', cursor: 'pointer' }}>
                <Trash2 size={11} /> Clear
              </button>
            )}
          </div>
          {exportHistory.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No exports yet. Click any export card to get started.
            </div>
          ) : (
            <>
              <div className="hidden md:grid" style={{ gridTemplateColumns: '1fr 60px 80px 120px', padding: '8px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                {['Type', 'Format', 'Period', 'Generated'].map(h => (
                  <span key={h} style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
                ))}
              </div>
              {exportRows.map((item, i) => (
                <div key={item.id} style={{ borderBottom: i < exportRows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div className="hidden md:grid" style={{ gridTemplateColumns: '1fr 60px 80px 120px', padding: '12px 20px', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{item.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, width: 'fit-content', backgroundColor: item.format === 'PDF' ? 'rgba(196,165,116,0.12)' : 'var(--surface)', color: item.format === 'PDF' ? GOLD : 'var(--muted)', border: `1px solid ${item.format === 'PDF' ? 'rgba(196,165,116,0.3)' : 'var(--border)'}` }}>
                      {item.format}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.period}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{relativeTime(item.generatedAt)}</span>
                  </div>
                  <div className="flex md:hidden items-center justify-between" style={{ padding: '14px 20px', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.period} · {relativeTime(item.generatedAt)}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, flexShrink: 0, backgroundColor: item.format === 'PDF' ? 'rgba(196,165,116,0.12)' : 'var(--surface)', color: item.format === 'PDF' ? GOLD : 'var(--muted)', border: `1px solid ${item.format === 'PDF' ? 'rgba(196,165,116,0.3)' : 'var(--border)'}` }}>
                      {item.format}
                    </span>
                  </div>
                </div>
              ))}
              <TableFooter page={exportClamped} total={exportHistory.length} onPage={setExportPage} />
            </>
          )}
        </div>
      </div>

      {/* Panels */}
      <AnimatePresence>
        {openPlatform && (
          <ImportPanel
            platform={openPlatform}
            owner={isManager ? 'agency' : 'you'}
            agencyName={agency?.name ?? 'Your agency'}
            onClose={() => setOpenPlatform(null)}
            onCommitted={(item) => { addImport(item); setImportPage(1) }}
          />
        )}
        {openCard && (
          <ExportPanel
            card={openCard}
            defaultPeriod="ytd"
            onClose={() => setOpenCard(null)}
            onDownloaded={(item) => { addExport(item); setExportPage(1); setOpenCard(null) }}
            teamAgents={isManager ? teamAgents : []}
          />
        )}
      </AnimatePresence>
    </AppShell>
  )
}

export default ImportsExportsPage
