'use client';

import { BRAND } from '@/lib/concept-studio/constants';

const OLIVE = BRAND.oliveInk;
const CHARTREUSE = '#A8B475';
const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

interface StepProps {
  formData: {
    brandName: string;
    priceTier: string;
    brandDescription: string;
    keywords: string[];
    customerProfile: string;
    referenceBrands: string[];
    excludedBrands: string[];
    excludedAesthetics: string[];
    targetMargin: number;
  };
}

const PRICE_TIER_LABELS: Record<string, string> = {
  Contemporary: 'Contemporary ($100–300)',
  Bridge:       'Bridge ($300–600)',
  Luxury:       'Luxury ($600+)',
};

export default function Step6Confirmation({ formData }: StepProps) {
  const refBrands = formData.referenceBrands.filter(Boolean);
  const exclBrands = formData.excludedBrands.filter(Boolean);

  const fields = [
    {
      label: 'Brand Name',
      value: formData.brandName || 'Not provided',
      filled: !!formData.brandName,
    },
    {
      label: 'Market Tier',
      value: formData.priceTier
        ? PRICE_TIER_LABELS[formData.priceTier] ?? formData.priceTier
        : 'Not selected',
      filled: !!formData.priceTier,
    },
    {
      label: 'Brand Description',
      value: formData.brandDescription || 'Not provided',
      filled: !!formData.brandDescription,
    },
    {
      label: 'Aesthetic Keywords',
      value: formData.keywords.length > 0 ? formData.keywords.join(', ') : 'None selected',
      filled: formData.keywords.length > 0,
    },
    {
      label: 'Customer',
      value: formData.customerProfile || 'Not provided',
      filled: !!formData.customerProfile,
    },
    {
      label: 'Reference Brands',
      value: refBrands.length > 0 ? refBrands.join(', ') : 'None added',
      filled: refBrands.length > 0,
    },
    {
      label: 'Never-Be Brands',
      value: exclBrands.length > 0 ? exclBrands.join(', ') : 'None added',
      filled: exclBrands.length > 0,
    },
    {
      label: 'Target Margin',
      value: `${formData.targetMargin}%`,
      filled: true,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div
          style={{
            fontFamily: sohne,
            fontSize: 15,
            fontWeight: 500,
            color: OLIVE,
            marginBottom: 6,
          }}
        >
          Review your profile
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 12,
            fontStyle: 'italic',
            color: 'rgba(67,67,43,0.44)',
          }}
        >
          Make sure everything looks correct before continuing.
        </div>
      </div>

      <div
        style={{
          borderRadius: 12,
          border: '1px solid rgba(67,67,43,0.09)',
          background: 'rgba(255,255,255,0.75)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {fields.map((field, index) => (
            <div
              key={index}
              style={{
                padding: '18px 22px',
                borderBottom:
                  index < fields.length - 1 ? '1px solid rgba(67,67,43,0.07)' : 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: field.filled ? CHARTREUSE : 'rgba(67,67,43,0.18)',
                  flexShrink: 0,
                  marginTop: 5,
                  transition: 'background 250ms ease',
                  boxShadow: field.filled ? '0 0 0 3px rgba(168,180,117,0.18)' : 'none',
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(67,67,43,0.38)',
                    marginBottom: 5,
                  }}
                >
                  {field.label}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: field.filled ? OLIVE : 'rgba(67,67,43,0.42)',
                    fontFamily: inter,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {field.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          color: 'rgba(67,67,43,0.42)',
          fontFamily: inter,
          lineHeight: 1.6,
        }}
      >
        You can update these details anytime in your settings.
      </div>
    </div>
  );
}
