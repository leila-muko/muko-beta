'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ProgressIndicator from './ProgressIndicator';
import Step1BrandName from './steps/Step1BrandName';
import Step2Keywords from './steps/Step2Keywords';
import Step3CustomerProfile from './steps/Step3CustomerProfile';
import Step4PriceTier from './steps/Step4PriceTier';
import Step5Margin from './steps/Step5Margin';
import Step6Confirmation from './steps/Step6Confirmation';

interface FormData {
  brandName: string;
  keywords: string[];
  customerProfile: string;
  priceTier: string;
  targetMargin: number;
  tensionContext: string | null;
  acceptsConflicts: boolean;
}

export default function OnboardingWizard() {
  const router = useRouter();
  const supabase = createClient(); // Add this line
  const [currentStep, setCurrentStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const BRAND = {
    ink: '#191919',
    oliveInk: '#43432B',
    rose: '#A97B8F',
    steelBlue: '#7D96AC',
    chartreuse: '#ABAB63',
  };
  
  const [formData, setFormData] = useState<FormData>({
    brandName: '',
    keywords: [],
    customerProfile: '',
    priceTier: '',
    targetMargin: 60,
    tensionContext: null,
    acceptsConflicts: false
  });

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      setUserId(user.id);
    };
    checkAuth();
  }, [router]);

  const updateFormData = (field: keyof FormData, value: string | string[] | number | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      alert('You must be logged in to create a brand profile.');
      return;
    }
  
    // Log what we're about to send
    console.log('Attempting to create profile with data:', {
      user_id: userId,
      brand_name: formData.brandName,
      keywords: formData.keywords,
      customer_profile: formData.customerProfile,
      price_tier: formData.priceTier,
      target_margin: formData.targetMargin / 100,
      tension_context: formData.tensionContext,
      accepts_conflicts: formData.acceptsConflicts,
    });
  
    setLoading(true);
  
    try {
      const { data, error } = await supabase
        .from('brand_profiles')
        .insert({
          user_id: userId,
          brand_name: formData.brandName,
          keywords: formData.keywords,
          customer_profile: formData.customerProfile,
          price_tier: formData.priceTier,
          target_margin: formData.targetMargin / 100, // Convert to decimal
          tension_context: formData.tensionContext,
          accepts_conflicts: formData.acceptsConflicts,
        })
        .select()
        .single();
  
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
  
      console.log('Brand profile created successfully:', data);
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Full error object:', error);
      alert(`Failed to create brand profile: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BrandName value={formData.brandName} onChange={(val: string) => updateFormData('brandName', val)} />;
      case 2:
        return (
          <Step2Keywords
            value={formData.keywords}
            onChange={(val: string[]) => updateFormData('keywords', val)}
            onTensionContextChange={(context: string | null) => {
              updateFormData('tensionContext', context);
              updateFormData('acceptsConflicts', context !== null);
            }}
          />
        );
      case 3:
        return <Step3CustomerProfile value={formData.customerProfile} onChange={(val: string) => updateFormData('customerProfile', val)} />;
      case 4:
        return <Step4PriceTier value={formData.priceTier} onChange={(val: string) => updateFormData('priceTier', val)} />;
      case 5:
        return <Step5Margin value={formData.targetMargin} onChange={(val: number) => updateFormData('targetMargin', val)} />;
      case 6:
        return <Step6Confirmation formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(900px 520px at 58% 20%, rgba(255,255,255,0.92) 0%, rgba(249,248,245,0.62) 42%, rgba(242,239,233,0.72) 70%, rgba(235,232,228,0.94) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px clamp(40px, 8vw, 120px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes wash-drift {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0px, 0px, 0); }
          50% { transform: translate(-50%, -50%) translate3d(40px, 28px, 0); }
        }

        @keyframes wash-drift-2 {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0px, 0px, 0); }
          50% { transform: translate(-50%, -50%) translate3d(-36px, -22px, 0); }
        }

        .grain-overlay {
          position: fixed;
          inset: 0;
          background: transparent url('data:image/svg+xml;utf8,<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>') repeat 0 0;
          background-size: 240px 240px;
          opacity: 0.16;
          mix-blend-mode: soft-light;
          pointer-events: none;
          z-index: 1;
        }

        .wash-rose {
          position: absolute;
          left: 72%;
          top: 26%;
          width: 980px;
          height: 780px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle at 35% 35%,
            rgba(169, 123, 143, 0.28) 0%,
            rgba(205, 170, 179, 0.16) 34%,
            rgba(169, 123, 143, 0.10) 54%,
            transparent 74%);
          filter: blur(52px);
          opacity: 0.95;
          animation: wash-drift 18s ease-in-out infinite;
          z-index: 0;
        }

        .wash-blue {
          position: absolute;
          left: 56%;
          top: 78%;
          width: 1080px;
          height: 860px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle at 55% 45%,
            rgba(125, 150, 172, 0.26) 0%,
            rgba(138, 164, 184, 0.15) 36%,
            rgba(125, 150, 172, 0.10) 56%,
            transparent 76%);
          filter: blur(54px);
          opacity: 0.92;
          animation: wash-drift-2 20s ease-in-out infinite;
          z-index: 0;
        }
      `}</style>

      <div className="grain-overlay" />
      <div className="wash-rose" />
      <div className="wash-blue" />

      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          position: 'relative',
          zIndex: 5,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '48px', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(67, 67, 43, 0.42)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              marginBottom: '16px',
            }}
          >
            Brand DNA Setup · Step {currentStep} of 6
          </div>

          <h1
            style={{
              fontSize: 'clamp(36px, 4.5vw, 48px)',
              fontWeight: 520,
              color: BRAND.oliveInk,
              lineHeight: 1.1,
              letterSpacing: '-0.015em',
              fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
              marginBottom: '12px',
            }}
          >
            Tell us about your brand.
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 1.8vw, 17px)',
              color: 'rgba(67, 67, 43, 0.55)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              lineHeight: 1.55,
            }}
          >
            This helps Muko calibrate to your creative voice.
          </p>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator currentStep={currentStep} totalSteps={6} />

        {/* Step Content */}
        <div style={{ marginTop: '64px', marginBottom: '64px', minHeight: '320px' }}>
          {renderStep()}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
          <button
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
            style={{
              padding: '16px 40px',
              fontSize: '14px',
              fontWeight: 650,
              color: currentStep === 1 ? 'rgba(67, 67, 43, 0.30)' : BRAND.rose,
              background: 'transparent',
              border: currentStep === 1 
                ? '1.5px solid rgba(67, 67, 43, 0.10)' 
                : '1.5px solid rgba(169, 123, 143, 0.35)',
              borderRadius: '999px',
              cursor: currentStep === 1 || loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: currentStep === 1 || loading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (currentStep === 1 || loading) return;
              e.currentTarget.style.borderColor = 'rgba(169, 123, 143, 0.55)';
              e.currentTarget.style.backgroundColor = 'rgba(169, 123, 143, 0.06)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              if (currentStep === 1 || loading) return;
              e.currentTarget.style.borderColor = 'rgba(169, 123, 143, 0.35)';
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={loading}
            style={{
              padding: '16px 48px',
              fontSize: '14px',
              fontWeight: 650,
              color: BRAND.steelBlue,
              background: 'rgba(255, 255, 255, 0.25)',
              border: '1.5px solid rgba(125, 150, 172, 0.42)',
              borderRadius: '999px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 12px 40px rgba(125, 150, 172, 0.14)',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (loading) return;
              e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.62)';
              e.currentTarget.style.backgroundColor = 'rgba(125, 150, 172, 0.08)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 20px 60px rgba(125, 150, 172, 0.22)';
            }}
            onMouseLeave={(e) => {
              if (loading) return;
              e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.42)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(125, 150, 172, 0.14)';
            }}
          >
            {loading ? 'Saving...' : currentStep === 6 ? 'Create Profile' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}