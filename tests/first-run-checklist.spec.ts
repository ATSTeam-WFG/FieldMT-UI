import { test, expect, Page } from '@playwright/test'

/**
 * First-run onboarding checklist — the post-auth setup guide on both dashboards.
 * Not to be confused with tests/onboarding.spec.ts, which covers the pre-auth
 * signup wizard at /onboarding.
 *
 * Fully mocked. The states that matter most here — a genuine 0-of-5, and a
 * manager step that is waiting on a rep — are unreachable with the seeded
 * accounts, every one of which already has a full book of business.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

test.use({ storageState: { cookies: [], origins: [] } })

type Step = { key: string; done: boolean }

function checklist(role: 'agent' | 'manager', steps: Step[], dismissed = false) {
  const completed = steps.filter(s => s.done).length
  return {
    role,
    steps,
    completed,
    total: steps.length,
    complete: completed === steps.length,
    dismissed,
  }
}

const REP_ZERO = checklist('agent', [
  { key: 'add_contact', done: false },
  { key: 'log_activity', done: false },
  { key: 'set_follow_up', done: false },
  { key: 'open_contract', done: false },
  { key: 'import_contracts', done: false },
  { key: 'explore_scores', done: false },
])

const REP_PARTIAL = checklist('agent', [
  { key: 'add_contact', done: true },
  { key: 'log_activity', done: true },
  { key: 'set_follow_up', done: false },
  { key: 'open_contract', done: true },
  { key: 'import_contracts', done: false },
  { key: 'explore_scores', done: false },
])

const REP_DONE = checklist('agent', [
  { key: 'add_contact', done: true },
  { key: 'log_activity', done: true },
  { key: 'set_follow_up', done: true },
  { key: 'open_contract', done: true },
  { key: 'import_contracts', done: true },
  { key: 'explore_scores', done: true },
])

const MANAGER_PARTIAL = checklist('manager', [
  { key: 'invite_rep', done: true },
  { key: 'review_team', done: false },
  { key: 'view_performance', done: false },
])

const ME = {
  agent: { id: 'u-rep', email: 'rep@test.com', name: 'Test Rep', initials: 'TR', role: 'agent', status: 'active', agency_id: 'a1', also_rep: false },
  manager: { id: 'u-mgr', email: 'mgr@test.com', name: 'Test Manager', initials: 'TM', role: 'manager', status: 'active', agency_id: 'a1', also_rep: false },
}

/**
 * Stand in for the whole API. Unmatched endpoints return `null` rather than an
 * empty object — every consumer guards with `data?.x`, so null renders the
 * loading/empty path, while `{}` would throw on nested access.
 */
async function mockApi(page: Page, role: 'agent' | 'manager', data: object) {
  // The presence cookie has to exist on the very first request — middleware.ts
  // reads it server-side and would bounce us to /login before any init script
  // has had a chance to run.
  await page.context().addCookies([
    { name: 'app_has_token', value: '1', domain: 'localhost', path: '/' },
  ])
  await page.addInitScript(() => {
    localStorage.setItem('app_token', 'test-token')
  })
  await page.route(`${API}/**`, async route => {
    const url = route.request().url()
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

    if (url.includes('/auth/me')) return json(ME[role])
    if (url.includes('/onboarding/checklist')) return json(data)
    if (url.includes('/onboarding/complete')) return json({ ...data, dismissed: true })
    return json(null)
  })
}

// ── Rep ───────────────────────────────────────────────────────────────────────

test.describe('rep dashboard', () => {
  test('a brand-new rep sees all six steps and an empty progress bar', async ({ page }) => {
    await mockApi(page, 'agent', REP_ZERO)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/get you started/i)).toBeVisible()

    const bar = page.getByRole('progressbar')
    await expect(bar).toHaveAttribute('aria-valuenow', '0')
    await expect(bar).toHaveAttribute('aria-valuemax', '6')
    await expect(page.getByText('0 of 6')).toBeVisible()

    // exact: true — "Log your first activity" is also a prefix of the Recent
    // Activity empty state ("...to see it here.").
    for (const title of [
      'Log your first activity', 'Add a contact', 'Open a contract',
      'Import your existing contracts', 'Set a follow-up', 'See a relationship score',
    ]) {
      await expect(page.getByText(title, { exact: true })).toBeVisible()
    }
  })

  test('steps are shown in dependency order, contact first', async ({ page }) => {
    await mockApi(page, 'agent', REP_ZERO)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // A contract cannot be saved without a realtor, and an activity with no
    // contact scores nothing — so the person comes first and the list reads as
    // one sequence. Nothing is enforced; the order is the recommendation.
    const titles = [
      'Add a contact', 'Log your first activity', 'Set a follow-up',
      'Open a contract', 'Import your existing contracts', 'See a relationship score',
    ]
    const rendered = await page.evaluate(expected => {
      const text = document.body.innerText
      return expected
        .map(t => ({ t, at: text.indexOf(t) }))
        .filter(x => x.at >= 0)
        .sort((a, b) => a.at - b.at)
        .map(x => x.t)
    }, titles)
    expect(rendered).toEqual(titles)
  })

  test('the KPI and AI cards are held back until setup is done', async ({ page }) => {
    await mockApi(page, 'agent', REP_ZERO)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Assert we are actually on the dashboard first — a bounce to /login would
    // otherwise satisfy every negative assertion below.
    await expect(page.getByText(/get you started/i)).toBeVisible()

    // The ground rule: the checklist is the only thing on the dashboard.
    for (const label of ['ACTIVITIES THIS WEEK', 'TOTAL SPEND MTD', 'PIPELINE VALUE']) {
      await expect(page.getByText(label)).toBeHidden()
    }
    await expect(page.getByText('Daily Nudge')).toBeHidden()
    await expect(page.getByText('Summary', { exact: true })).toBeHidden()
  })

  test('the card carries no dismiss and no subtitle', async ({ page }) => {
    await mockApi(page, 'agent', REP_ZERO)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/get you started/i)).toBeVisible()
    // It cannot be closed — the only way out is finishing the steps.
    await expect(page.getByRole('button', { name: 'Dismiss' })).toBeHidden()
    await expect(page.getByText(/Your dashboard fills in as you work/)).toBeHidden()
  })

  test('completed steps leave the card — the bar is the only progress shown', async ({ page }) => {
    await mockApi(page, 'agent', REP_PARTIAL)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3')
    await expect(page.getByText('3 of 6')).toBeVisible()

    // Done steps are gone entirely — no checked row at the bottom.
    await expect(page.getByText('Log your first activity', { exact: true })).toBeHidden()
    await expect(page.getByText('Add a contact', { exact: true })).toBeHidden()

    // Not done: still a full tile.
    await expect(page.getByText('Set a follow-up', { exact: true })).toBeVisible()
    await expect(page.getByText('Give yourself the next touch before you forget it.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to Follow-ups' })).toBeVisible()
  })

  test('the import step deep-links to the Qualia importer', async ({ page }) => {
    await mockApi(page, 'agent', REP_PARTIAL)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('link', { name: 'Go to Imports' }))
      .toHaveAttribute('href', '/exports?import=qualia')
  })

  test('finishing the last step retires the checklist and hands the space back', async ({ page }) => {
    const post = page.waitForRequest(
      req => req.url().includes('/onboarding/complete') && req.method() === 'POST'
    )
    await mockApi(page, 'agent', REP_DONE)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Server-verified completion is requested exactly once, and nothing is left
    // sitting in the card's place.
    await post
    await expect(page.getByText(/get you started/i)).toBeHidden()
    await expect(page.getByRole('progressbar')).toBeHidden()
    // The KPI cards arrive in the space the checklist gave up.
    await expect(page.getByText('ACTIVITIES THIS WEEK')).toBeVisible()
    // .first() — the toast text also appears in the aria-live status region.
    await expect(page.getByText("You're all set up for the Field.").first()).toBeVisible()
  })

})

// ── Manager ───────────────────────────────────────────────────────────────────

test.describe('manager dashboard', () => {
  test('a manager sees three steps, all of them their own to do', async ({ page }) => {
    await mockApi(page, 'manager', MANAGER_PARTIAL)
    await page.goto('/manager')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/build your team/i)).toBeVisible()
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '3')
    await expect(page.getByText('1 of 3')).toBeVisible()

    // Nothing waits on a rep any more.
    await expect(page.getByText('A rep logs their first activity')).toBeHidden()
    await expect(page.getByText('Waiting on your team')).toBeHidden()
    await expect(page.getByText('Review your team', { exact: true })).toBeVisible()
    await expect(page.getByText('Open the performance view', { exact: true })).toBeVisible()

    // Same ground rule on the manager side.
    await expect(page.getByText('TOTAL TEAM ACTIVITIES')).toBeHidden()
    await expect(page.getByText('Team Summary')).toBeHidden()
  })

  test('no console errors on the manager dashboard', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        errors.push(msg.text())
      }
    })
    await mockApi(page, 'manager', MANAGER_PARTIAL)
    await page.goto('/manager')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/build your team/i)).toBeVisible()
    expect(errors).toHaveLength(0)
  })
})

// ── Responsive ────────────────────────────────────────────────────────────────

test.describe('small screens', () => {
  for (const width of [320, 390]) {
    test(`no horizontal overflow and thumb-sized CTAs at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await mockApi(page, 'agent', REP_ZERO)
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('progressbar')).toBeVisible()

      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(0)

      // 28px is comfortable with a mouse and not with a thumb.
      const box = await page.getByRole('button', { name: 'Add Contact' }).boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(40)
    })
  }

  test('copy sits left of the CTA on a phone, and stacks again on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 })
    await mockApi(page, 'agent', REP_ZERO)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Side by side: the button's left edge starts past the copy, and they share
    // a horizontal band rather than stacking.
    const copy = await page.getByText('Build your book by adding agents, brokers, or lenders.').boundingBox()
    const cta = await page.getByRole('button', { name: 'Add Contact' }).boundingBox()
    expect(cta!.x, 'CTA should sit to the right of the copy').toBeGreaterThan(copy!.x + copy!.width - 1)
    expect(cta!.y, 'CTA should not be stacked below the copy').toBeLessThan(copy!.y + copy!.height)

    // Desktop keeps the original stacked tile.
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForTimeout(200)
    const copyWide = await page.getByText('Build your book by adding agents, brokers, or lenders.').boundingBox()
    const ctaWide = await page.getByRole('button', { name: 'Add Contact' }).boundingBox()
    expect(ctaWide!.y, 'CTA should stack under the copy on desktop').toBeGreaterThanOrEqual(copyWide!.y + copyWide!.height)
  })

  test('CTAs return to their compact size on a desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockApi(page, 'agent', REP_ZERO)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const box = await page.getByRole('button', { name: 'Add Contact' }).boundingBox()
    expect(box!.height).toBeLessThan(32)
  })
})
