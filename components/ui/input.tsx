// components/ui/input.tsx
import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={props.id} 
            className="block font-body"
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full font-body
            transition-all duration-200
            focus:outline-none 
            disabled:opacity-50 
            disabled:cursor-not-allowed
            ${error ? '' : ''}
            ${className}
          `}
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            border: error ? '1px solid #FCA5A5' : '1px solid rgba(229, 231, 235, 0.5)',
            borderRadius: '12px',
            fontSize: '0.9375rem',
            color: '#111827',
            boxShadow: error ? '0 0 0 3px rgba(252, 165, 165, 0.1)' : 'none',
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.border = '1px solid rgba(169, 123, 143, 0.5)';
              e.target.style.boxShadow = '0 0 0 3px rgba(169, 123, 143, 0.1)';
            }
          }}
          onBlur={(e) => {
            if (!error) {
              e.target.style.border = '1px solid rgba(229, 231, 235, 0.5)';
              e.target.style.boxShadow = 'none';
            }
          }}
          {...props}
        />
        {error && (
          <p className="font-body" style={{ fontSize: '0.875rem', color: '#EF4444' }}>
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'