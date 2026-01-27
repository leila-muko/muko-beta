// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-600 mb-8">Welcome, {user.email}!</p>
        
        <div className="bg-white p-6 rounded-lg border">
          <p className="text-gray-600">
            🎉 Auth is working! You're logged in.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            This is a placeholder. We'll build the real dashboard later.
          </p>
        </div>
      </div>
    </div>
  )
}
