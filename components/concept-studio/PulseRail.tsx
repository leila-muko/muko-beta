'use client';

import React from 'react';
import { BRAND } from '../../lib/concept-studio/constants';
import { IconIdentity, IconResonance, IconExecution } from './Icons';

type PulseRailProps = {
  identityScore: number | undefined;
  resonanceScore: number | undefined;
  identityColor: string;
  resonanceColor: string;
  pulseUpdated: boolean;
  canContinue: boolean;
  onContinue: () => void;
};

export function PulseRail({
  identityScore,
  resonanceScore,
  identityColor,
  resonanceColor,
  pulseUpdated,
  canContinue,
  onContinue,
}: PulseRailProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '1400px',
        width: 'calc(100% - 240px)',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          padding: '16px 22px',
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRadius: '999px',
          border: '1px solid rgba(255, 255, 255, 0.50)',
          boxShadow: pulseUpdated
            ? '0 20px 80px rgba(169, 123, 143, 0.40), 0 0 80px rgba(169, 123, 143, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.92)'
            : '0 12px 48px rgba(67, 67, 43, 0.12), 0 0 40px rgba(169, 123, 143, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.92)',
          transition: 'all 800ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <span
          style={{
            fontSize: '22px',
            fontWeight: 500,
            color: 'rgba(67, 67, 43, 0.55)',
            fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
            paddingLeft: '6px',
          }}
        >
          Pulse Rail
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', marginLeft: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconIdentity size={16} />
            <span style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(67, 67, 43, 0.75)', fontFamily: 'var(--font-sohne-breit)' }}>
              Identity
            </span>
            <span style={{ fontSize: '16px', fontWeight: 650, color: identityColor, fontFamily: 'var(--font-sohne-breit)' }}>
              {identityScore ?? '—'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconResonance size={16} />
            <span style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(67, 67, 43, 0.75)', fontFamily: 'var(--font-sohne-breit)' }}>
              Resonance
            </span>
            <span style={{ fontSize: '16px', fontWeight: 650, color: resonanceColor, fontFamily: 'var(--font-sohne-breit)' }}>
              {resonanceScore ?? '—'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.55 }}>
            <IconExecution size={16} />
            <span style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(67, 67, 43, 0.75)', fontFamily: 'var(--font-sohne-breit)' }}>
              Execution
            </span>
            <span style={{ fontSize: '16px', fontWeight: 650, color: 'rgba(67, 67, 43, 0.55)', fontFamily: 'var(--font-sohne-breit)' }}>
              —
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onContinue}
        disabled={!canContinue}
        style={{
          padding: '18px 28px',
          fontSize: '16px',
          fontWeight: 650,
          color: canContinue ? BRAND.steelBlue : 'rgba(67, 67, 43, 0.30)',
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: `1.5px solid ${canContinue ? 'rgba(125, 150, 172, 0.30)' : 'rgba(67, 67, 43, 0.10)'}`,
          borderRadius: '999px',
          cursor: canContinue ? 'pointer' : 'not-allowed',
          fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
          transition: 'all 220ms ease',
          boxShadow: canContinue
            ? '0 10px 30px rgba(125, 150, 172, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.95)'
            : '0 6px 18px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.92)',
          opacity: canContinue ? 1 : 0.55,
        }}
      >
        Continue to Spec Studio →
      </button>
    </div>
  );
}