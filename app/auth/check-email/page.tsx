// app/auth/check-email/page.tsx
import { AuthLayout } from '@/components/auth/auth-layout'

export default function CheckEmailPage() {
  return (
    <AuthLayout 
      title="Check your email" 
      subtitle="We've sent you a confirmation link"
    >
      <div className="text-center py-6">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: '#A97B8F' }}
        >
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <p className="text-gray-700 mb-6 leading-relaxed font-body">
          Click the link in the email to complete your sign up and start exploring Muko.
        </p>
        
        <p className="text-sm text-gray-500 font-body">
          Didn't receive it? Check your spam folder.
        </p>
      </div>
    </AuthLayout>
  )
}