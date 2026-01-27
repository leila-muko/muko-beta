// components/auth/signup-form.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/auth/check-email')
    }
  }

  return (
    <form onSubmit={handleSignUp}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Input
          id="email"
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <Input
          id="password"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          required
          minLength={6}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4" style={{ marginBottom: '2rem' }}>
          <p className="text-sm text-red-600 font-body">
            {error}
          </p>
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Start exploring'}
      </Button>
    </form>
  )
}