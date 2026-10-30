/**
 * Workflow: Login page
 *
 * Covers:
 *   - Page renders email / password inputs
 *   - "Sign in" button present
 *   - SSO link present
 *   - Show/hide password toggle
 *   - Full sign-in with valid credentials → redirect to /dashboard
 *     (skipped when TEST_EMAIL / TEST_PASSWORD are not set)
 */
import { test, expect } from '@playwright/test'

// Always test the login page without pre-existing auth
test.use({ storageState: { cookies: [], origins: [] } })

test('login page renders required fields', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) {
      errors.push(msg.text())
    }
  })

  await page.goto('/login')
  await expect(page.getByText('Welcome back')).toBeVisible()
  await expect(page.locator('#email')).toBeVisible()
  await expect(page.locator('#password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  // Google and Microsoft arrive with B2C; until then they are not offered at all.
  await expect(page.getByText('Continue with Google')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Join with code' })).toBeVisible()

  expect(errors).toHaveLength(0)
})

test('password show/hide toggle works', async ({ page }) => {
  await page.goto('/login')
  const passwordInput = page.locator('#password')
  await expect(passwordInput).toHaveAttribute('type', 'password')

  // Click the eye icon button (aria-label "Show password")
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(passwordInput).toHaveAttribute('type', 'text')

  await page.getByRole('button', { name: 'Hide password' }).click()
  await expect(passwordInput).toHaveAttribute('type', 'password')
})

test('sign-in with valid credentials redirects to /dashboard', async ({ page }) => {
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD
  if (!email || !password) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set')
    return
  }

  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/\/(dashboard|manager)/, { timeout: 20_000 })
})

test('"Join with code" goes to /join', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Join with code' }).click()
  await expect(page).toHaveURL(/\/join$/)
})
