// app/auth/signup/page.tsx
import { AuthBackgroundPulse } from '@/components/auth/auth-background-pulse'
import { SignUpForm } from '@/components/auth/signup-form'
import { AuthBrand } from '@/components/auth/auth-brand'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <main
      style={{
        background: '#E8E3D6',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AuthBackgroundPulse />
      <div
        aria-hidden="true"
        className="auth-background-grain"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ maxWidth: 480, width: '100%', position: 'relative', zIndex: 1 }}>
        <AuthBrand />

        {/* Form card */}
        <div>
          {/* Sign up form */}
          <SignUpForm />

          {/* Footer */}
          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 12,
              color: '#92736E',
              textAlign: 'center',
              marginTop: 16,
            }}
          >
            Already have an account?{' '}
            <Link
              href="/auth/signin"
              className="hover:underline"
              style={{ color: '#B8876B' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
