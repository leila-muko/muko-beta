import Link from 'next/link'
import { AuthBackgroundPulse } from '@/components/auth/auth-background-pulse'
import { AuthBrand } from '@/components/auth/auth-brand'
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
