/**
 * The only provider-aware file in the client. Everything else asks to "go and prove who
 * you are" and later calls `continueAfterIdentity()` (lib/access.ts) — it never learns
 * which identity provider ran.
 *
 * supabase: our own /signup screen (local, CI, alpha) — one screen for "new here" and
 *           "I already have an account", like B2C's combined sign-up/sign-in page.
 * b2c:      the browser hands off to Azure AD B2C through MSAL (Phase ID PR 4). That
 *           client's redirect callback stores the token with `setToken()` and then calls
 *           `continueAfterIdentity()`; nothing else here needs to change when it lands.
 *           Google and Microsoft sign-in arrive with it, on B2C's hosted page.
 */
import { getAuthConfig, type AuthConfig } from '@/lib/api/access'

let _config: Promise<AuthConfig> | null = null

export function authConfig(): Promise<AuthConfig> {
  if (!_config) {
    _config = getAuthConfig().catch((err) => {
      _config = null
      throw err
    })
  }
  return _config
}

export async function startIdentity(): Promise<void> {
  const config = await authConfig()
  if (config.provider === 'supabase') {
    window.location.href = '/signup'
    return
  }
  throw new Error('Sign-in with the identity provider is not available in this build yet.')
}
