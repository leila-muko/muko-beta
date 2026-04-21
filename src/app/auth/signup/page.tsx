// app/auth/signup/page.tsx
import { SignUpForm } from '@/components/auth/signup-form'
import { GoogleButton } from '@/components/auth/google-button'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FFFEF9 0%, #F5F0E8 40%, #EBE1D1 100%)',
      }}
    >
      {/* Floating blobs */}
      <div 
        className="absolute animate-float pointer-events-none"
        style={{
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(169, 123, 143, 0.25) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div 
        className="absolute animate-float-reverse pointer-events-none"
        style={{
          bottom: '-10%',
          left: '-5%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(184, 135, 107, 0.25) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      
      {/* Content */}
      <div style={{ width: '100%', maxWidth: '28rem', position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 
            className="font-heading"
            style={{ 
              fontSize: '3.5rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#4D302F',
              letterSpacing: '-0.03em',
            }}
          >
            Muko
          </h1>
          <p 
            className="font-body"
            style={{
              fontSize: '1rem',
              color: '#4D302F',
              fontWeight: 400,
            }}
          >
            Intelligence-first design decisions
          </p>
        </div>

        {/* Glassy Card */}
        <div 
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '32px',
            boxShadow: '0 8px 32px 0 rgba(77, 48, 47, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            padding: '3.5rem 3rem',
          }}
        >
          <GoogleButton />
          
          {/* Divider - Fixed to not go through text */}
<div style={{ position: 'relative', margin: '2.5rem 0' }}>
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
    <div style={{ 
      width: '100%', 
      height: '1px', 
      background: 'linear-gradient(90deg, transparent 0%, rgba(125, 150, 172, 0.2) 15%, rgba(125, 150, 172, 0.2) 35%, transparent 50%, rgba(125, 150, 172, 0.2) 65%, rgba(125, 150, 172, 0.2) 85%, transparent 100%)' 
    }}></div>
  </div>
  <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
    <span 
      className="font-body"
      style={{ 
        padding: '0 1.25rem',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        color: '#9CA3AF',
        fontSize: '0.875rem',
        fontWeight: 500,
      }}
    >
      Or with email
    </span>
  </div>
</div>

          <SignUpForm />

          <p 
            className="font-body"
            style={{ 
              marginTop: '2.5rem', 
              textAlign: 'center', 
              fontSize: '0.875rem', 
              color: '#6B7280',
              fontWeight: 400,
            }}
          >
            Already have an account?{' '}
            <Link 
              href="/auth/signin" 
              className="hover:underline transition-all"
              style={{ 
                color: '#7D96AC', 
                fontWeight: 500,
              }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}