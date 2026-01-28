// components/ui/button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  children: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', children, ...props }, ref) => {
    const getPrimaryStyles = () => ({
      backgroundColor: '#7D96AC',
      color: 'white',
      border: 'none',
    })

    const getSecondaryStyles = () => ({
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      color: '#374151',
      border: '1px solid rgba(229, 231, 235, 0.5)',
    })

    const styles = variant === 'primary' ? getPrimaryStyles() : variant === 'secondary' ? getSecondaryStyles() : {}

    return (
      <button
        ref={ref}
        className={`
          w-full font-body font-medium
          transition-all duration-200
          disabled:opacity-50 
          disabled:cursor-not-allowed
          ${className}
        `}
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '12px',
          fontSize: '0.9375rem',
          boxShadow: variant === 'primary' ? '0 2px 8px rgba(125, 150, 172, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
          ...styles,
        }}
        onMouseEnter={(e) => {
          if (!props.disabled) {
            if (variant === 'primary') {
              e.currentTarget.style.backgroundColor = '#677E91';
            } else {
              e.currentTarget.style.backgroundColor = 'rgba(249, 250, 251, 0.8)';
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!props.disabled) {
            if (variant === 'primary') {
              e.currentTarget.style.backgroundColor = '#7D96AC';
            } else {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
            }
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