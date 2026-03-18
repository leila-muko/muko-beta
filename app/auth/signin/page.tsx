import Link from 'next/link'
import { AuthBackgroundPulse } from '@/components/auth/auth-background-pulse'
import { AuthBrand } from '@/components/auth/auth-brand'
import { GoogleButton } from '@/components/auth/google-button'
import { SignInForm } from '@/components/auth/signin-form'

export default function SignInPage() {
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
          {/* Google OAuth */}
          <GoogleButton />

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '16px 0',
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'rgba(73,66,53,0.15)' }} />
            <span
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 11,
                color: '#756C61',
              }}
            >
              or
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(73,66,53,0.15)' }} />
          </div>

          {/* Email / password form */}
          <SignInForm />

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
            New to muko?{' '}
            <Link
              href="/auth/signup"
              className="hover:underline"
              style={{ color: '#7D96AC' }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
