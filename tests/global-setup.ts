/**
 * Global setup: log in once and save auth state to tests/.auth/user.json
 *
 * Required env vars (or set defaults below):
 *   TEST_EMAIL    – e.g. ci-test@example.com
 *   TEST_PASSWORD – e.g. demo1234
 *
 * The saved storageState (app_token in localStorage) is reused by all
 * specs that include `storageState: 'tests/.auth/user.json'` in their test
 * fixture, or globally via the `use` block in playwright.config.ts.
 */
import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

export const STORAGE_STATE = path.join(__dirname, '.auth', 'user.json')

export default async function globalSetup() {
  const authDir = path.join(__dirname, '.auth')
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

  const email = process.env.TEST_EMAIL ?? ''
  const password = process.env.TEST_PASSWORD ?? ''

  if (!email || !password) {
    console.warn(
      '[global-setup] TEST_EMAIL / TEST_PASSWORD not set — skipping auth. ' +
      'Tests that need a logged-in user will redirect to /login.'
    )
    fs.writeFileSync(STORAGE_STATE, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  const browser = await chromium.launch({ channel: 'chrome' })
  const context = await browser.newContext({ baseURL: 'http://localhost:3000' })
  const page = await context.newPage()

  try {
    await page.goto('/login')
    await page.fill('#email', email)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')

    // Login uses window.location.href so we wait for a full navigation
    // Manager users redirect to /manager; agent users redirect to /dashboard
    await page.waitForURL(/\/(dashboard|manager)/, { timeout: 20_000 })

    await context.storageState({ path: STORAGE_STATE })
    console.log('[global-setup] Auth state saved to', STORAGE_STATE)
  } catch {
    // Degrade the same way missing credentials do, rather than throwing. A
    // rejected login used to take down the entire run — including the specs
    // that mock their own API and never needed a session.
    console.warn(
      `[global-setup] Login as ${email} failed — continuing without auth. ` +
      'Specs that rely on a logged-in user will redirect to /login.'
    )
    fs.writeFileSync(STORAGE_STATE, JSON.stringify({ cookies: [], origins: [] }))
  } finally {
    await browser.close()
  }
}
