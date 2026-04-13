// components/auth/signin-form.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const next = new URLSearchParams(window.location.search).get('next')
      const destination = next && next.startsWith('/') ? next : '/entry'
      router.push(destination)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSignIn}>
      <div style={{ marginBottom: 12 }}>
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

      <div style={{ marginBottom: 20 }}>
        <Input
          id="password"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
      </div>

      {error && (
        <div
          style={{
            marginBottom: 16,
            backgroundColor: 'rgba(188,82,74,0.06)',
            border: '1px solid rgba(188,82,74,0.2)',
            borderRadius: 8,
            padding: '10px 14px',
          }}
        >
          <p style={{ fontSize: 13, color: '#9A4039', fontFamily: 'var(--font-inter)' }}>
            {error}
          </p>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        style={{ background: '#4D302F', color: '#F9F7F4' }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = '#3F2726'
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.background = '#4D302F'
          }
        }}
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}
