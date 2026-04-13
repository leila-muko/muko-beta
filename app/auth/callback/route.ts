// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const providerError = searchParams.get('error')
  const providerErrorDescription = searchParams.get('error_description')

  const toErrorPage = (message?: string) => {
    const errorUrl = new URL('/auth/auth-code-error', origin)

    if (message) {
      errorUrl.searchParams.set('message', message)
    }

    return NextResponse.redirect(errorUrl)
  }

  if (providerError || providerErrorDescription) {
    return toErrorPage(providerErrorDescription ?? providerError ?? 'Authentication failed.')
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        if (next && next.startsWith('/')) {
          return NextResponse.redirect(`${origin}${next}`)
        }

        const { data: brandProfile } = await supabase
          .from('brand_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        const destination = brandProfile ? '/entry' : '/onboarding'
        return NextResponse.redirect(`${origin}${destination}`)
      }
    }

    return toErrorPage(error.message)
  }

  return toErrorPage('No authentication code was returned.')
}
