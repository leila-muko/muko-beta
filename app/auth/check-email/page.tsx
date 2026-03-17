// app/auth/check-email/page.tsx
import Link from 'next/link'

export default function CheckEmailPage() {
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

        {/* Card */}
        <div style={{ textAlign: 'center' }}>
          {/* Email icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(73,66,53,0.06)',
              border: '1px solid rgba(73,66,53,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#43432B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 15,
              fontWeight: 600,
              color: '#191919',
              marginBottom: 8,
            }}
          >
            Check your email
          </p>

          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 13,
              color: '#999',
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            We&apos;ve sent a confirmation link. Click it to complete your sign up and start exploring muko.
          </p>

          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 12,
              color: '#bbb',
            }}
          >
            Didn&apos;t receive it? Check your spam folder.
          </p>
        </div>

        {/* Footer */}
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 12,
            color: '#999',
            textAlign: 'center',
            marginTop: 28,
          }}
        >
          Back to{' '}
          <Link
            href="/auth/signin"
            className="hover:underline"
            style={{ color: '#B8876B' }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
