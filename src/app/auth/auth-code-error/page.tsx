// app/auth/auth-code-error/page.tsx
import { AuthLayout } from '@/components/auth/auth-layout'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AuthCodeErrorPage() {
  return (
    <AuthLayout 
      title="Something went wrong" 
      subtitle="We couldn't sign you in"
    >
      <div className="text-center py-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <p className="text-gray-700 mb-8 leading-relaxed font-body">
          There was an error with your authentication. Please try again.
        </p>
        
        <Link href="/auth/signin">
          <Button>
            Back to sign in
          </Button>
        </Link>
      </div>
    </AuthLayout>
  )
}