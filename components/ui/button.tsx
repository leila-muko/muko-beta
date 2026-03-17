'use client';
// components/ui/button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  children: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', children, style, ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      width: '100%',
      height: 48,
      borderRadius: 100,
      fontFamily: 'var(--font-inter)',
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      cursor: props.disabled ? 'not-allowed' : 'pointer',
      opacity: props.disabled ? 0.5 : 1,
      transition: 'opacity 0.2s, background 0.2s',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }

    const variantStyle: React.CSSProperties =
      variant === 'primary'
        ? { background: '#43432B', color: '#F9F7F4' }
        : variant === 'secondary'
        ? { background: 'transparent', color: '#4D302F', border: '1px solid rgba(73,66,53,0.2)' }
        : { background: 'transparent', color: '#4D302F' }

    return (
      <button
        ref={ref}
        className={className}
        style={{ ...baseStyle, ...variantStyle, ...style }}
        onMouseEnter={(e) => {
          if (!props.disabled && variant === 'primary') {
            e.currentTarget.style.background = '#555540'
          }
        }}
        onMouseLeave={(e) => {
          if (!props.disabled && variant === 'primary') {
            e.currentTarget.style.background = '#43432B'
          }
        }}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
