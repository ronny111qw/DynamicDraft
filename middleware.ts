// middleware.ts
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define which routes are protected (require authentication)
const protectedRoutes = ['/dashboard']

// Define which routes are auth routes (login/signup)
const authRoutes = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if user is authenticated
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  // Create URLs for redirects
  const loginUrl = new URL('/login', request.url)
  const dashboardUrl = new URL('/dashboard', request.url)

  // If the user is NOT authenticated and trying to access a protected route
  if (!token && protectedRoutes.some(route => pathname.startsWith(route))) {
    // Store the original URL they were trying to visit
    loginUrl.searchParams.set('callbackUrl', encodeURI(pathname))
    return NextResponse.redirect(loginUrl)
  }

  // If the user IS authenticated and trying to access an auth route
  if (token && authRoutes.includes(pathname)) {
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next/ (Next.js internals)
     * 2. /api/ (API routes)
     * 3. /static (static files)
     * 4. /_vercel (Vercel internals)
     * 5. /favicon.ico, /sitemap.xml (common static files)
     */
    '/((?!api|_next|_vercel|static|favicon.ico|sitemap.xml).*)',
  ],
}