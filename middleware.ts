import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    const response = await updateSession(request)
    
    const protectedRoutes = [
      '/dashboard',
      '/analysis',
      '/settings',
      '/entry',
      '/concept',
      '/spec',
      '/report',
      '/pieces',
      '/collections',
      '/onboarding',
    ]
    const authRoutes = ['/auth/signin', '/auth/signup']
    const onboardingRoute = '/onboarding'
    const postOnboardingRoutes = [
      '/entry',
      '/concept',
      '/spec',
      '/report',
      '/pieces',
      '/collections',
      '/analysis',
      '/settings',
      '/dashboard',
    ]
    const pathname = request.nextUrl.pathname

    const isProtectedRoute = protectedRoutes.some(route =>
      pathname.startsWith(route)
    )
    const isAuthRoute = authRoutes.some(route =>
      pathname.startsWith(route)
    )
    const isRoot = pathname === '/'

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    const isOnboardingRoute = pathname.startsWith(onboardingRoute)
    const isPostOnboardingRoute = postOnboardingRoutes.some(route =>
      pathname.startsWith(route)
    )

    if (isProtectedRoute && !user) {
      const signInUrl = new URL('/auth/signin', request.url)
      const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
      signInUrl.searchParams.set('next', nextPath)
      return NextResponse.redirect(signInUrl)
    }

    if (user) {
      const { data: brandProfile } = await supabase
        .from('brand_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      const hasCompletedOnboarding = Boolean(brandProfile)

      if (isOnboardingRoute && hasCompletedOnboarding) {
        return NextResponse.redirect(new URL('/entry', request.url))
      }

      if (isPostOnboardingRoute && !hasCompletedOnboarding) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      // Logged-in user hitting auth pages or root — route by brand profile
      if (isAuthRoute || isRoot) {
        const destination = hasCompletedOnboarding ? '/entry' : '/onboarding'
        return NextResponse.redirect(new URL(destination, request.url))
      }
    }
    
    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
