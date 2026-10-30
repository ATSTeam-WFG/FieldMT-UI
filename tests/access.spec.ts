import { test, expect, Page, Route } from '@playwright/test'

/**
 * Invite-only access — the pre-product screens: invitation landings (E1, J1), code entry
 * (J2), no access (E3) and agency setup (A1–A3). Not to be confused with
 * tests/first-run-checklist.spec.ts, which covers what greets someone once they are in.
 *
 * Fully mocked: the API is the contract, and every state here (an expired link, a pending
 * agency) is awkward to reach with seeded data.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

test.use({ storageState: { cookies: [], origins: [] } })

type Reply = { body: unknown; status?: number } | null

const json = (_route: Route, body: unknown, status = 200): Reply => ({ body, status })

const IN_30_DAYS = new Date(Date.now() + 30 * 86_400_000).toISOString()

const AGENCY_INVITE = {
  kind: 'agency',
  state: 'pending',
  agency: { id: 'ag-1', name: 'Monarch Title', market: 'Fulton County, GA', type: 'single', member_count: 0 },
  issuer_name: 'Tanya Monroe',
  role: 'manager',
  expires_at: IN_30_DAYS,
}

async function signedIn(page: Page) {
  await page.context().addCookies([{ name: 'app_has_token', value: '1', domain: 'localhost', path: '/' }])
  await page.addInitScript(() => localStorage.setItem('app_token', 'test-token'))
}

/** Stand in for the API. A handler answers `false` for anything it doesn't cover → `null`. */
async function mockApi(page: Page, handle: (url: string, route: Route) => Reply | false) {
  await page.route(`${API}/**`, async (route) => {
    const reply = handle(route.request().url(), route) || { body: null }
    await route.fulfill({
      status: reply.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(reply.body),
    })
  })
}

// ── E1 ────────────────────────────────────────────────────────────────────────

test('E1 names the rep and the agency, with no form', async ({ page }) => {
  await mockApi(page, (url, route) => {
    if (url.includes('/access/invitations/tok-1')) return json(route, AGENCY_INVITE)
    return false
  })
  await page.goto('/activate/tok-1')
  await expect(page.getByText('Tanya Monroe invited Monarch Title to FieldMT')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Set up Monarch Title on FieldMT' })).toBeVisible()
  // One way forward — the sign-in screen handles new and returning people alike.
  await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'I already have an account' })).toHaveCount(0)
  await expect(page.getByRole('textbox')).toHaveCount(0)
})

test('E1 hands off to sign-up holding the invitation', async ({ page }) => {
  await mockApi(page, (url, route) => {
    if (url.includes('/access/invitations/tok-1')) return json(route, AGENCY_INVITE)
    if (url.includes('/auth/config')) return json(route, { provider: 'supabase', b2c: null })
    return false
  })
  await page.goto('/activate/tok-1')
  await page.getByRole('button', { name: 'Accept invitation' }).click()
  await page.waitForURL('**/signup')
  const intent = await page.evaluate(() => localStorage.getItem('app_access_intent'))
  expect(JSON.parse(intent!)).toMatchObject({ token: 'tok-1', from: '/activate/tok-1' })
  await expect(page.getByText('Your invitation is applied as soon as you’re in.')).toBeVisible()

  // No provider buttons until B2C. Someone with an account signs in on /login instead,
  // and the invitation goes with them.
  await expect(page.getByRole('heading', { name: 'Create your FieldMT account' })).toBeVisible()
  await expect(page.getByText('Continue with Google')).toHaveCount(0)
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.waitForURL('**/login')
  await expect(page.getByText('Sign in to accept your invitation')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Create your account' })).toHaveAttribute('href', '/signup')
})

test('E1 expired offers a new link and notifies the issuer', async ({ page }) => {
  let requested = false
  await mockApi(page, (url, route) => {
    if (url.includes('/request-new')) {
      requested = true
      return json(route, { requested: true }, 202)
    }
    if (url.includes('/access/invitations/tok-old')) {
      return json(route, { ...AGENCY_INVITE, state: 'expired', expires_at: '2026-01-01T00:00:00Z' })
    }
    return false
  })
  await page.goto('/activate/tok-old')
  await expect(page.getByRole('heading', { name: 'This invitation has expired' })).toBeVisible()
  await expect(page.getByText(/Tanya Monroe can send you a new one/)).toBeVisible()
  await page.getByRole('button', { name: 'Request a new link' }).click()
  await expect(page.getByText(/We’ve let Tanya Monroe know/)).toBeVisible()
  expect(requested).toBe(true)
})

// ── J2 ────────────────────────────────────────────────────────────────────────

test('J2 keeps a bad code, then confirms the agency for a good one', async ({ page }) => {
  await mockApi(page, (url, route) => {
    if (url.includes('/access/codes/BADCODE1')) {
      return json(route, { kind: 'join_code', state: 'not_found', agency: null, issuer_name: null, role: null, expires_at: null })
    }
    if (url.includes('/access/codes/MONARCH4')) {
      return json(route, {
        kind: 'join_code', state: 'pending', role: 'agent', expires_at: null, issuer_name: 'Drew Halvorsen',
        agency: { id: 'ag-1', name: 'Monarch Title', market: 'Fulton County, GA', type: 'multi', member_count: 4 },
      })
    }
    return false
  })
  await page.goto('/join')
  const field = page.getByLabel('Agency code')
  await field.fill('badcode1')
  await page.getByRole('button', { name: 'Find my agency' }).click()
  await expect(page.getByText(/couldn’t find an agency with that code/)).toBeVisible()
  await expect(field).toHaveValue('BADCODE1')

  await field.fill('MONARCH4')
  await page.getByRole('button', { name: 'Find my agency' }).click()
  await expect(page.getByText('Monarch Title', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Join as a rep' })).toBeVisible()
})

// ── E3 ────────────────────────────────────────────────────────────────────────

test('E3 a verified person with no account gets a dead end and a way out', async ({ page }) => {
  await signedIn(page)
  await mockApi(page, (url, route) => {
    if (url.includes('/auth/me')) return json(route, { detail: { code: 'no_account', message: 'x' } }, 403)
    return false
  })
  await page.goto('/no-access')
  await expect(page.getByText(/you don’t have a FieldMT account yet/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
})

test('a product route refused with no_account lands on E3', async ({ page }) => {
  await signedIn(page)
  await mockApi(page, (url, route) => {
    if (url.includes('/auth/me')) return json(route, { detail: { code: 'no_account', message: 'x' } }, 403)
    return false
  })
  await page.goto('/dashboard')
  await page.waitForURL('**/no-access')
})

// ── A1–A3 ─────────────────────────────────────────────────────────────────────

function session(step: number | null, type: 'single' | 'multi' = 'single') {
  return {
    state: step ? 'setup_required' : 'active',
    home: step ? '/welcome' : type === 'multi' ? '/manager' : '/dashboard',
    user: { id: 'u1', email: 'drew@monarchtitle.com', name: 'Drew Halvorsen', initials: 'DH', role: 'manager' },
    agency: {
      id: 'ag-1', name: 'Monarch Title', type, status: step ? 'pending' : 'active', setup_step: step,
      market: 'Fulton County, GA', join_code: type === 'multi' ? 'MONARCH4' : null, invited_by: 'Tanya Monroe',
    },
  }
}

async function mockSetup(page: Page, onSetup: (body: any) => unknown) {
  await signedIn(page)
  await mockApi(page, (url, route) => {
    if (url.includes('/auth/session')) return json(route, session(1))
    if (url.includes('/access/setup')) return json(route, onSetup(route.request().postDataJSON()))
    if (url.includes('/auth/me')) return json(route, { detail: { code: 'setup_required', message: 'x' } }, 403)
    return false
  })
}

test('A1 → A2 "Just me" lands on the dashboard', async ({ page }) => {
  const calls: any[] = []
  await mockSetup(page, (body) => {
    calls.push(body)
    return body.step === 1 ? session(2) : session(null, 'single')
  })
  await page.goto('/welcome')
  await expect(page.getByText('Tanya Monroe started this for you.', { exact: false })).toBeVisible()
  await expect(page.getByLabel('Agency name')).toHaveValue('Monarch Title')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { name: /Who else at Monarch Title/ })).toBeVisible()
  // Neither tile is pre-selected; Continue is disabled and says why.
  await expect(page.getByRole('button', { name: 'Continue' })).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByText('Pick how you’ll work to continue.')).toBeVisible()
  await page.getByRole('radio', { name: /Just me/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForURL(/\/dashboard\?setup=done$/)
  expect(calls).toEqual([
    { step: 1, agency_name: 'Monarch Title', market: 'Fulton County, GA', name: 'Drew Halvorsen' },
    { step: 2, type: 'single' },
  ])
})

test('A1 → A2 "Me and my reps" → A3 invites and lands on the manager view', async ({ page }) => {
  const calls: any[] = []
  await mockSetup(page, (body) => {
    calls.push(body)
    if (body.step === 1) return session(2)
    if (body.step === 2) return session(3, 'multi')
    return session(null, 'multi')
  })
  await page.goto('/welcome')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('radio', { name: /Me and my reps/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { name: 'Bring your team in' })).toBeVisible()
  await expect(page.getByText('MONARCH4')).toBeVisible()
  await page.getByLabel('Email 1').fill('marisol@monarchtitle.com')
  await page.getByRole('button', { name: 'Create invitations' }).click()
  await page.waitForURL(/\/manager\?setup=done$/)
  expect(calls[2]).toEqual({ step: 3, invites: [{ email: 'marisol@monarchtitle.com', role: 'agent' }] })
})

// ── In the product ────────────────────────────────────────────────────────────

test('a single-user owner sees rep navigation only', async ({ page }) => {
  await signedIn(page)
  await mockApi(page, (url, route) => {
    if (url.includes('/auth/me')) {
      return json(route, {
        id: 'u1', email: 'drew@monarchtitle.com', name: 'Drew Halvorsen', initials: 'DH', role: 'manager',
        status: 'active', agency_id: 'ag-1', has_rep_profile: true, has_manager_profile: true, can_switch: false,
        also_rep: true, agency: { id: 'ag-1', name: 'Monarch Title', type: 'single', status: 'active', setup_step: null, market: null },
      })
    }
    return false
  })
  await page.goto('/settings')
  const sidebar = page.locator('aside')
  await expect(sidebar.getByRole('link', { name: 'Settings' })).toBeVisible()
  await expect(sidebar.getByRole('link', { name: 'Team', exact: true })).toHaveCount(0)
  await expect(sidebar.getByRole('link', { name: 'Performance', exact: true })).toHaveCount(0)
})

// ── Setup frame: nothing moves ────────────────────────────────────────────────

/** Steps 1 → 2 → 3, served from the setup mock. */
async function mockThreeSteps(page: Page) {
  await mockSetup(page, (body) => (body.step === 1 ? session(2) : body.step === 2 ? session(3, 'multi') : session(null, 'multi')))
}

test('the lockup and the top of the card never move; only step 2 is wide', async ({ page }) => {
  await mockThreeSteps(page)
  await page.goto('/welcome')
  const lockup = page.getByTestId('access-lockup')
  const card = page.getByTestId('access-card')
  const progress = page.getByRole('progressbar')
  // Positions are page coordinates (a tall step scrolls the window), read once the step
  // transition has settled (each read is polled).
  const box = async (l: typeof card) => {
    const b = (await l.boundingBox())!
    const scrollY = await page.evaluate(() => window.scrollY)
    return { x: Math.round(b.x), y: Math.round(b.y + scrollY), width: Math.round(b.width) }
  }

  await expect(page.getByLabel('Agency name')).toBeVisible()
  const logo = await box(lockup)
  const top = (await box(card)).y
  const barY = (await box(progress)).y
  await expect.poll(async () => (await box(card)).width).toBe(440)

  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('radiogroup', { name: /Who else at Monarch Title/ })).toBeVisible()
  await expect.poll(async () => (await box(card)).width).toBe(680)
  await expect.poll(() => box(lockup)).toEqual(logo)
  await expect.poll(async () => (await box(card)).y).toBe(top)
  await expect.poll(async () => (await box(progress)).y).toBe(barY)

  await page.getByRole('radio', { name: 'Me and my reps' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Bring your team in' })).toBeVisible()
  await expect.poll(async () => (await box(card)).width).toBe(440)
  await expect.poll(() => box(lockup)).toEqual(logo)
})

test('progress is announced, and Back keeps what was typed', async ({ page }) => {
  await mockThreeSteps(page)
  await page.goto('/welcome')
  const progress = page.getByRole('progressbar', { name: 'Agency setup' })
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByText('Step 1 of 3')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0)

  await page.getByLabel('Primary market (optional)').fill('Cobb County, GA')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(progress).toHaveAttribute('aria-valuenow', '2')

  await page.getByRole('button', { name: 'Back' }).click()
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByLabel('Primary market (optional)')).toHaveValue('Cobb County, GA')
})

test('the workspace options are a keyboard radio group', async ({ page }) => {
  await mockThreeSteps(page)
  await page.goto('/welcome')
  await page.getByRole('button', { name: 'Continue' }).click()

  const justMe = page.getByRole('radio', { name: /Just me/ })
  const team = page.getByRole('radio', { name: /Me and my reps/ })
  await justMe.focus()
  await page.keyboard.press('ArrowRight')
  await expect(team).toHaveAttribute('aria-checked', 'true')
  await expect(team).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(justMe).toHaveAttribute('aria-checked', 'true')
  // The two cards never show the same label in two colours: Team/Performance appear once.
  await expect(page.getByText('Everything in Just me, plus')).toBeVisible()
  await expect(page.getByText('Team', { exact: true })).toHaveCount(1)
})

test('the agency code copies without selecting text', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await mockThreeSteps(page)
  await page.goto('/welcome')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('radio', { name: /Me and my reps/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByRole('button', { name: 'Copy agency code MONARCH4' }).click()
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('MONARCH4')
})

test('reduced motion: steps change without transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockThreeSteps(page)
  await page.goto('/welcome')
  const fill = page.getByRole('progressbar').locator('span span').first()
  expect(await fill.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s')
})

// ── Refused, expired ──────────────────────────────────────────────────────────

test('a revoked agency names itself and a person to ask', async ({ page }) => {
  await signedIn(page)
  await mockApi(page, (url, route) => {
    if (url.includes('/auth/session')) {
      return json(route, {
        state: 'agency_revoked', home: '/no-access?reason=agency_revoked',
        user: { id: 'u1', email: 'drew@monarchtitle.com', name: 'Drew', initials: 'DR', role: 'manager' },
        agency: { id: 'ag-1', name: 'Monarch Title', type: 'single', status: 'revoked', setup_step: null, market: null, join_code: null },
        contact: { name: 'Tanya Monroe', email: 't.monroe@wfgtitle.com', organisation: 'WFG National Title' },
      })
    }
    return false
  })
  await page.goto('/no-access?reason=agency_revoked')
  await expect(page.getByText('Monarch Title no longer has access to FieldMT')).toBeVisible()
  await expect(page.getByText(/Tanya Monroe at WFG National Title can tell you more/)).toBeVisible()
  await expect(page.getByRole('link', { name: 't.monroe@wfgtitle.com' })).toHaveAttribute('href', 'mailto:t.monroe@wfgtitle.com')
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
})

test('an expired rep invitation offers the agency code too', async ({ page }) => {
  await mockApi(page, (url, route) => {
    if (url.includes('/access/invitations/tok-rep')) {
      return json(route, {
        kind: 'member', state: 'expired', role: 'agent', expires_at: '2026-01-01T00:00:00Z', issuer_name: 'Drew Halvorsen',
        agency: { id: 'ag-1', name: 'Monarch Title', market: 'Fulton County, GA', type: 'multi', member_count: 4 },
      })
    }
    return false
  })
  await page.goto('/accept/tok-rep')
  await expect(page.getByText(/Ask Drew Halvorsen to resend it from Team/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request a new link' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enter an agency code' })).toBeVisible()
})

test('both landings share one header and footer pattern', async ({ page }) => {
  await mockApi(page, (url, route) => {
    if (url.includes('/access/invitations/tok-rep')) {
      return json(route, {
        kind: 'member', state: 'pending', role: 'agent', expires_at: IN_30_DAYS, issuer_name: 'Drew Halvorsen',
        agency: { id: 'ag-1', name: 'Monarch Title', market: 'Fulton County, GA', type: 'multi', member_count: 1 },
      })
    }
    return false
  })
  await page.goto('/accept/tok-rep')
  await expect(page.getByText('Drew Halvorsen invited you to Monarch Title')).toBeVisible()
  await expect(page.getByText('Fulton County, GA')).toBeVisible()
  await expect(page.getByText(/1 person/)).toHaveCount(0)
  await expect(page.getByText(/One use\./)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Have a code instead?' })).toHaveAttribute('href', '/join')
})
