// Storage keys live in their own module so `middleware.ts` can import the
// cookie name without pulling in the API client — and, through it, the Sentry
// SDK — into the Edge runtime that runs on every request.
//
// Brand-free by design: renaming the product must never invalidate sessions.
export const PRESENCE_COOKIE = 'app_has_token'
export const TOKEN_KEY = 'app_token'
export const REFRESH_TOKEN_KEY = 'app_refresh_token'
// The invitation or join code a person is acting on, held across the identity
// hand-off — the stand-in for the identity provider's `state` round-trip.
export const ACCESS_INTENT_KEY = 'app_access_intent'
