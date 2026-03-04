'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BRAND } from '@/lib/concept-studio/constants';
import ProgressIndicator from './ProgressIndicator';
import Step1BrandName from './steps/Step1BrandName';
import Step2Keywords from './steps/Step2Keywords';
import Step3CustomerProfile from './steps/Step3CustomerProfile';
import Step4BrandReferences from './steps/Step4PriceTier';
import Step5AestheticExclusions from './steps/Step5Margin';
import Step6Confirmation from './steps/Step6Confirmation';

/* ─── Design tokens — match workspace pages ──────────────────────────────── */
const OLIVE = BRAND.oliveInk;
const STEEL = BRAND.steelBlue;
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';
const inter = 'var(--font-inter), system-ui, sans-serif';

interface FormData {
  brandName: string;
  priceTier: string;
  brandDescription: string;
  keywords: string[];
  customerProfile: string;
  referenceBrands: string[];
  excludedBrands: string[];
  excludedAesthetics: string[];
  targetMargin: number;
  tensionContext: string | null;
  acceptsConflicts: boolean;
}

export default function OnboardingWizard() {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    brandName: '',
    priceTier: '',
    brandDescription: '',
    keywords: [],
    customerProfile: '',
    referenceBrands: ['', '', ''],
    excludedBrands: ['', '', ''],
    excludedAesthetics: [],
    targetMargin: 60,
    tensionContext: null,
    acceptsConflicts: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      setUserId(user.id);
    };
    checkAuth();
  }, [router]);

  const updateFormData = (
    field: keyof FormData,
    value: string | string[] | number | boolean | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

    const referenceBrands = formData.referenceBrands.filter(Boolean);
    const excludedBrands = formData.excludedBrands.filter(Boolean);

    console.log('Attempting to create profile with data:', {
      user_id: userId,
      brand_name: formData.brandName,
      price_tier: formData.priceTier,
      brand_description: formData.brandDescription,
      keywords: formData.keywords,
      customer_profile: formData.customerProfile,
      reference_brands: referenceBrands,
      excluded_brands: excludedBrands,
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
          price_tier: formData.priceTier,
          brand_description: formData.brandDescription,
          keywords: formData.keywords,
          customer_profile: formData.customerProfile,
          reference_brands: referenceBrands,
          excluded_brands: excludedBrands,
          target_margin: formData.targetMargin / 100,
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
      router.push('/entry');
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
        return (
          <Step1BrandName
            value={formData.brandName}
            onChange={(val) => updateFormData('brandName', val)}
            priceTier={formData.priceTier}
            onPriceTierChange={(val) => updateFormData('priceTier', val)}
          />
        );
      case 2:
        return (
          <Step2Keywords
            brandDescription={formData.brandDescription}
            onBrandDescriptionChange={(val) => updateFormData('brandDescription', val)}
            value={formData.keywords}
            onChange={(val) => updateFormData('keywords', val)}
            onTensionContextChange={(context) => {
              updateFormData('tensionContext', context);
              updateFormData('acceptsConflicts', context !== null);
            }}
          />
        );
      case 3:
        return (
          <Step3CustomerProfile
            value={formData.customerProfile}
            onChange={(val) => updateFormData('customerProfile', val)}
          />
        );
      case 4:
        return (
          <Step4BrandReferences
            referenceBrands={formData.referenceBrands}
            onReferenceBrandsChange={(val) => updateFormData('referenceBrands', val)}
            excludedBrands={formData.excludedBrands}
            onExcludedBrandsChange={(val) => updateFormData('excludedBrands', val)}
          />
        );
      case 5:
        return (
          <Step5AestheticExclusions
            targetMargin={formData.targetMargin}
            onTargetMarginChange={(val) => updateFormData('targetMargin', val)}
          />
        );
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
        background: '#FAF9F6',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 72,
          background: 'rgba(250,249,246,0.92)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          borderBottom: '1px solid rgba(67,67,43,0.09)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span
            style={{
              fontFamily: sohne,
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: '-0.02em',
              color: OLIVE,
            }}
          >
            muko
          </span>

          <div style={{ width: 1, height: 24, background: 'rgba(67,67,43,0.10)' }} />

          <span
            style={{
              fontFamily: sohne,
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(67,67,43,0.50)',
              letterSpacing: '0.03em',
            }}
          >
            Brand DNA Setup
          </span>

          <ProgressIndicator currentStep={currentStep} totalSteps={6} />
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 72,
          padding: '112px clamp(40px, 6vw, 100px) 160px',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 740,
            animation: 'fadeIn 400ms ease both',
          }}
        >
          {/* Page heading */}
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <h1
              style={{
                margin: '0 0 10px 0',
                fontFamily: sohne,
                fontWeight: 500,
                fontSize: 28,
                color: OLIVE,
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
              }}
            >
              Tell us about your brand.
            </h1>
            <p
              style={{
                margin: 0,
                fontFamily: inter,
                fontSize: 13,
                color: 'rgba(67,67,43,0.52)',
                lineHeight: 1.55,
              }}
            >
              This helps Muko calibrate to your creative voice.
            </p>
          </div>

          {/* Step content */}
          <div
            style={{
              marginBottom: 48,
              minHeight: 280,
              animation: 'fadeIn 450ms ease 80ms both',
            }}
          >
            {renderStep()}
          </div>

          {/* Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              animation: 'fadeIn 450ms ease 160ms both',
            }}
          >
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '11px 20px 11px 14px',
                borderRadius: 999,
                border:
                  currentStep === 1
                    ? '1px solid rgba(67,67,43,0.10)'
                    : '1px solid rgba(67,67,43,0.14)',
                background: 'transparent',
                fontFamily: sohne,
                fontSize: 12,
                fontWeight: 600,
                color:
                  currentStep === 1 ? 'rgba(67,67,43,0.30)' : 'rgba(67,67,43,0.62)',
                cursor: currentStep === 1 || loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                transition: 'all 200ms ease',
                opacity: currentStep === 1 || loading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (currentStep === 1 || loading) return;
                e.currentTarget.style.backgroundColor = 'rgba(67,67,43,0.04)';
                e.currentTarget.style.borderColor = 'rgba(67,67,43,0.22)';
              }}
              onMouseLeave={(e) => {
                if (currentStep === 1 || loading) return;
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(67,67,43,0.14)';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M8.5 3L4.5 7L8.5 11"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={loading}
              style={{
                padding: '12px 32px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: sohne,
                letterSpacing: '0.02em',
                color: STEEL,
                background: 'rgba(125,150,172,0.07)',
                border: `1.5px solid ${STEEL}`,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 280ms ease',
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
              onMouseEnter={(e) => {
                if (loading) return;
                e.currentTarget.style.background = 'rgba(125,150,172,0.14)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                if (loading) return;
                e.currentTarget.style.background = 'rgba(125,150,172,0.07)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>
                {loading ? 'Saving...' : currentStep === 6 ? 'Create Profile' : 'Continue'}
              </span>
              {!loading && (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
