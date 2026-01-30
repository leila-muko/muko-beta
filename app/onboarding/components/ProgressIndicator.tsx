'use client';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        const isFuture = step > currentStep;

        return (
          <div
            key={step}
            style={{
              width: isCurrent ? '48px' : '32px',
              height: '4px',
              borderRadius: '999px',
              background: isCompleted || isCurrent
                ? 'rgba(125, 150, 172, 0.65)'
                : 'rgba(67, 67, 43, 0.12)',
              transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: isCompleted ? 1 : isCurrent ? 0.85 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
}