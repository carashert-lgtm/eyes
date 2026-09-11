import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

import { parseTeamSessionCookieEdge, TEAM_SESSION_COOKIE } from '@/lib/team-auth-edge'

const CANONICAL_HOST = 'www.eyesopen.to'

function canonicalHostRedirect(request: NextRequest): NextResponse | null {
  const host = request.headers.get('host') ?? ''
  if (host !== 'eyesopen.to') return null

  const url = request.nextUrl.clone()
  url.protocol = 'https:'
  url.host = CANONICAL_HOST
  return NextResponse.redirect(url, 308)
}

const PROTECTED_TEAM_API = [

  '/api/team/me',

  '/api/team/pool',

  '/api/team/pool/user',

]



export async function middleware(request: NextRequest) {
  const hostRedirect = canonicalHostRedirect(request)
  if (hostRedirect) return hostRedirect

  const { pathname } = request.nextUrl

  const sessionCookie = request.cookies.get(TEAM_SESSION_COOKIE)?.value

  const session = await parseTeamSessionCookieEdge(sessionCookie)



  if (PROTECTED_TEAM_API.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {

    if (!session) {

      return NextResponse.json({ error: 'Team Space access required' }, { status: 401 })

    }

  }



  if (pathname.startsWith('/team')) {

    if (pathname === '/team/activate' || pathname.startsWith('/team/activate')) {

      if (session) {

        const next = request.nextUrl.searchParams.get('next')

        const url = request.nextUrl.clone()

        url.pathname = next?.startsWith('/team') ? next : '/team/pool'

        url.search = ''

        return NextResponse.redirect(url)

      }

      return NextResponse.next()

    }



    if (!session) {

      const url = request.nextUrl.clone()

      url.pathname = '/team/activate'

      if (pathname !== '/team') {

        url.searchParams.set('next', pathname)

      }

      return NextResponse.redirect(url)

    }

  }



  return NextResponse.next()

}



export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}

