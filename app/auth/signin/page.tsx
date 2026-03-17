import Link from 'next/link'
import { GoogleButton } from '@/components/auth/google-button'
import { SignInForm } from '@/components/auth/signin-form'

export default function SignInPage() {
  return (
    <main
      style={{
        background: 'linear-gradient(150deg, #F9F7F4 0%, #F7F3F5 60%, #F3EDF0 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div style={{ maxWidth: 480, width: '100%' }}>
        {/* Logo */}
        <h1
          className="font-heading"
          style={{
            fontWeight: 600,
            fontSize: 52,
            color: '#4D302F',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            textAlign: 'center',
            margin: '0 0 12px',
          }}
        >
          muko.
        </h1>

        {/* Eyebrow */}
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#999',
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          Creative Intelligence · Private Beta
        </p>

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
                color: '#ccc',
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
              color: '#999',
              textAlign: 'center',
              marginTop: 16,
            }}
          >
            New to muko?{' '}
            <Link
              href="/auth/signup"
              className="hover:underline"
              style={{ color: '#B8876B' }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
