// components/ui/input.tsx
import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label
            htmlFor={props.id}
            style={{
              display: 'block',
              fontFamily: 'var(--font-inter)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#999',
              marginBottom: 6,
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          style={{
            backgroundColor: '#ffffff',
            border: error ? '1px solid rgba(188,82,74,0.5)' : '1px solid rgba(73,66,53,0.2)',
            borderRadius: 8,
            padding: '14px 16px',
            fontSize: 15,
            fontFamily: 'var(--font-inter)',
            color: '#191919',
            width: '100%',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.border = '1px solid rgba(73,66,53,0.45)'
              e.target.style.boxShadow = '0 0 0 3px rgba(73,66,53,0.06)'
            }
          }}
          onBlur={(e) => {
            if (!error) {
              e.target.style.border = '1px solid rgba(73,66,53,0.2)'
              e.target.style.boxShadow = 'none'
            }
          }}
          {...props}
        />
        {error && (
          <p style={{ fontSize: 12, color: '#BC524A', marginTop: 4, fontFamily: 'var(--font-inter)' }}>
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
