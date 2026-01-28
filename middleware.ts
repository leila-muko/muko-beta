import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    const response = await updateSession(request)
    
    const protectedRoutes = ['/dashboard', '/analysis', '/settings']
    const authRoutes = ['/auth/signin', '/auth/signup']
    const pathname = request.nextUrl.pathname
    
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname.startsWith(route)
    )
    const isAuthRoute = authRoutes.some(route => 
      pathname.startsWith(route)
    )
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (isProtectedRoute && !user) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
    
    if (isAuthRoute && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
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