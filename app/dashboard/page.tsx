// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { data: brandProfile } = await supabase
    .from('brand_profiles')
    .select('id')
    .eq('user_id', user!.id)
    .maybeSingle()

  redirect(brandProfile ? '/entry' : '/onboarding')
}
