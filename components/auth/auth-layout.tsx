// components/auth/auth-layout.tsx
import { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{
        background: '#E8E3D6',
      }}
    >
      <div className="w-full max-w-md relative" style={{ zIndex: 10 }}>
        {/* Header */}
        <div className="text-center mb-10">
          <h1 
            className="font-bold mb-3 font-heading"
            style={{ 
              fontSize: '3rem',
              color: '#4D432B',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
          <p 
            className="font-body"
            style={{
              fontSize: '1.125rem',
              color: '#6B7280',
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* Elevated card */}
        <div 
          className="font-body"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            padding: '2.5rem',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
