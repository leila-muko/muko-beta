// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: brandProfile } = await supabase
          .from('brand_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        const destination = brandProfile ? '/entry' : '/onboarding'
        return NextResponse.redirect(`${origin}${destination}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}