'use client';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const CHARTREUSE = '#A8B475';
const STEEL = '#7D96AC';

export default function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;

        return (
          <div
            key={step}
            style={{
              width: isCurrent ? 40 : 24,
              height: 3,
              borderRadius: 999,
              background: isCompleted
                ? CHARTREUSE
                : isCurrent
                ? STEEL
                : 'rgba(67,67,43,0.10)',
              transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: isCompleted ? 0.85 : isCurrent ? 1 : 0.5,
            }}
          />
        );
      })}
    </div>
  );
}
