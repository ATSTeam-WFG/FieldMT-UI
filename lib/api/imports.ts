import { getToken } from '@/lib/api/client'
// Import engine — client layer. Talks to the real backend:
//   POST /import/contracts/preview  (multipart) → staged ImportPlan (nothing persisted)
//   POST /import/contracts/commit   (json)      → CommitResult (writes rows, enqueues scoring)
//   GET  /import/contracts/history   → the agency's import log (newest first)
//   GET  /import/contracts/insights  → referral sources across imported orders
// Types mirror app/schemas/import_.py (camelCase via the backend's alias generator).

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export type ImportPlatform = 'qualia' | 'softpro'

export type ContactField = 'company' | 'email' | 'phone' | 'address' | 'job_title' | 'license_id'

export interface FieldConflict {
  field: ContactField
  kept: string
  alternate: string
  /** FieldMT's current value when it is one of the two (Qualia's is kept by default); '' when both come from the file. */
  existing: string
}

/** Qualia's value for a record FieldMT already holds, where they differ. */
export interface FieldChange {
  field: string
  old: string
  new: string
}

export type StageStatus = 'new' | 'updated' | 'review' | 'existing'

export interface StagedContact {
  key: string
  name: string
  company: string
  email: string
  phone: string
  address: string
  type: 'realtor' | 'lender'
  jobTitle: string
  licenseId: string
  tags: string[]
  sources: number
  matched: boolean
  matchedId: string | null
  /** A name-only contact already in the agency with the same name — offered, not assumed. */
  candidateId: string | null
  mergeAction: 'merge' | 'new'
  possibleDuplicate: boolean
  conflicts: FieldConflict[]
  changes: FieldChange[]
  status: StageStatus
  include: boolean
}

export interface StagedContract {
  key: string
  orderNumber: string
  /** Raw Qualia Order Status ('' in a legacy file) */
  orderStatus: string
  contractStatus: 'closed' | 'cancelled' | 'pending'
  transactionType: 'purchase' | 'refinance' | 'commercial' | 'other'
  openDate: string
  closeDate: string
  propertyAddress: string
  city: string
  state: string
  zipcode: string
  county: string
  underwriterName: string
  amount: number | null
  loanAmount: number | null
  primaryKey: string | null
  secondaryKey: string | null
  lenderKey: string | null
  referringKey: string | null
  sellerAgentKey: string | null
  buyerAgentKey: string | null
  duplicate: boolean
  duplicateAction: 'skip' | 'update'
  existingId: string | null
  changes: FieldChange[]
  changeKind: 'now_closed' | 'now_cancelled' | 'updated' | null
  errors: string[]
  warnings: string[]
  status: StageStatus
  include: boolean
}

export interface ImportPlan {
  platform: ImportPlatform
  fileName: string
  /** No Order Status column — the original export; every order was imported as closed. */
  legacyFormat: boolean
  /** Rows with no order number, dropped */
  skippedRows: number
  contacts: StagedContact[]
  contracts: StagedContract[]
  fileErrors: string[]
}

export interface CommitResult {
  contractsImported: number
  contractsUpdated: number
  contractsSkipped: number
  contactsCreated: number
  contactsUpdated: number
  contactsSkipped: number
  errors: number
  importId: string | null
  /** The agency's first import — show the insight screen */
  firstImport: boolean
}

/** One committed import, as the server logs it (D20) */
export interface ImportLog {
  id: string
  platform: ImportPlatform
  fileName: string
  uploadedBy: string | null
  uploadedByName: string | null
  contractsImported: number
  contractsUpdated: number
  contractsSkipped: number
  contactsCreated: number
  contactsUpdated: number
  contactsSkipped: number
  errors: number
  createdAt: string
}

export interface ImportHistory {
  lastImportAt: string | null
  items: ImportLog[]
}

export interface ReferralSource {
  contactId: string
  name: string
  orders: number
  share: number
  /** Agency health; null = Dormant for everyone */
  health: number | null
  dormantForEveryone: boolean
}

/** What the agency's imported orders say about its relationships (first-import screen) */
export interface ImportInsights {
  totalOrders: number
  topSources: ReferralSource[]
  unattributed: number
  /** Has anyone in the agency logged an activity? Until then the screen shows sources plainly. */
  teamHasActivity: boolean
}

// ── API calls ─────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function previewImport(file: File, source: ImportPlatform): Promise<ImportPlan> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('source', source)
  const res = await fetch(`${BASE}/import/contracts/preview`, {
    method: 'POST',
    headers: authHeaders(),
    body: fd,
  })
  if (!res.ok) throw new Error(`Preview failed: ${res.statusText}`)
  return res.json()
}

export async function commitImport(plan: ImportPlan): Promise<CommitResult> {
  const res = await fetch(`${BASE}/import/contracts/commit`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  })
  if (!res.ok) throw new Error(`Import failed: ${res.statusText}`)
  return res.json()
}

// ── History and insights (server-side, shared by the agency) ──────────────────

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Request failed: ${res.statusText}`)
  return res.json()
}

export const getImportHistory = () => getJson<ImportHistory>('/import/contracts/history')
export const getImportInsights = () => getJson<ImportInsights>('/import/contracts/insights')
