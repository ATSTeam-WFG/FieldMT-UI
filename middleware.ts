import { NextRequest, NextResponse } from 'next/server'
import { PRESENCE_COOKIE } from '@/lib/storage-keys'

// Invitation landings and code entry validate a link before anyone signs in, so they are
// public. /no-access and /welcome need a sign-in (the cookie below) but sit outside the
// product shell.
const PUBLIC_PATHS = new Set(['/', '/login', '/signup', '/onboarding', '/join', '/coming-soon', '/manifest.webmanifest'])

export function middleware(request: NextRequest) {
  // Azure only: refuse anything that did not come through our Front Door profile.
  const frontDoorId = process.env.AFD_ID
  if (frontDoorId && request.headers.get('x-azure-fdid') !== frontDoorId) {
    return new NextResponse(null, { status: 403 })
  }

  const { pathname } = request.nextUrl

  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith('/coming-soon/') ||
    pathname.startsWith('/activate/') ||
    pathname.startsWith('/accept/') ||
    pathname.startsWith('/join/')
  ) {
    return NextResponse.next()
  }

  if (!request.cookies.has(PRESENCE_COOKIE)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
}
