'use client';

interface StepProps {
  formData: {
    brandName: string;
    keywords: string[];
    customerProfile: string;
    priceTier: string;
    targetMargin: number;
  };
}

export default function Step6Confirmation({ formData }: StepProps) {
  const BRAND = {
    oliveInk: '#43432B',
    rose: '#A97B8F',
  };

  const priceTierLabels: Record<string, string> = {
    Accessible: 'Accessible ($50-100)',
    Contemporary: 'Contemporary ($100-300)',
    Bridge: 'Bridge ($300-600)',
    Luxury: 'Luxury ($600+)',
  };

  const fields = [
    {
      label: 'Brand Name',
      value: formData.brandName || 'Not provided',
    },
    {
      label: 'Brand DNA Keywords',
      value: formData.keywords.length > 0 ? formData.keywords.join(', ') : 'None selected',
    },
    {
      label: 'Customer Profile',
      value: formData.customerProfile || 'Not provided',
    },
    {
      label: 'Price Tier',
      value: formData.priceTier ? priceTierLabels[formData.priceTier] : 'Not selected',
    },
    {
      label: 'Target Margin',
      value: `${formData.targetMargin}%`,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h3
          style={{
            fontSize: 'clamp(20px, 2.5vw, 24px)',
            fontWeight: 520,
            color: BRAND.oliveInk,
            fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
            marginBottom: '8px',
          }}
        >
          Review your profile
        </h3>
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(67, 67, 43, 0.50)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}
        >
          Make sure everything looks correct before continuing.
        </p>
      </div>

      {/* Summary card */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.62)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(67, 67, 43, 0.10)',
          borderRadius: '24px',
          padding: 'clamp(28px, 3.5vw, 40px)',
          boxShadow: '0 12px 44px rgba(67, 67, 43, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.90)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {fields.map((field, index) => (
            <div
              key={index}
              style={{
                paddingBottom: index < fields.length - 1 ? '28px' : '0',
                borderBottom: index < fields.length - 1 ? '1px solid rgba(67, 67, 43, 0.08)' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'rgba(67, 67, 43, 0.45)',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  marginBottom: '8px',
                }}
              >
                {field.label}
              </div>
              <div
                style={{
                  fontSize: 'clamp(15px, 1.8vw, 17px)',
                  fontWeight: 400,
                  color: BRAND.oliveInk,
                  fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  lineHeight: 1.5,
                }}
              >
                {field.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div
        style={{
          fontSize: '13px',
          color: 'rgba(67, 67, 43, 0.45)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        You can update these details anytime in your settings.
      </div>
    </div>
  );
}