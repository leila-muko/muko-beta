'use client';

import React from 'react';

const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

interface ConceptResetModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConceptResetModal({
  open,
  onCancel,
  onConfirm,
}: ConceptResetModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(25, 25, 25, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
        padding: 16,
      }}
    >
      <div
        style={{
          width: 500,
          maxWidth: 'calc(100vw - 32px)',
          background: '#FAF9F6',
          borderRadius: 12,
          border: '1px solid rgba(67,67,43,0.09)',
          boxShadow: '0 8px 40px rgba(67,67,43,0.18)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.80)',
            padding: '28px 32px 20px',
            borderBottom: '1px solid rgba(67,67,43,0.09)',
          }}
        >
          <div
            style={{
              fontFamily: sohne,
              fontSize: 24,
              fontWeight: 500,
              color: '#43432B',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              marginBottom: 12,
            }}
          >
            Return to Setup?
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: inter,
              fontSize: 13.5,
              lineHeight: 1.65,
              color: 'rgba(67,67,43,0.62)',
            }}
          >
            Going back to Setup will reset your concept selections. Your lens cards and any selected direction will be cleared.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '18px 24px 24px',
            background: '#FAF9F6',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 15px',
              borderRadius: 999,
              border: '1px solid rgba(67,67,43,0.14)',
              background: 'rgba(255,255,255,0.68)',
              fontFamily: inter,
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(67,67,43,0.62)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              border: 'none',
              background: '#43432B',
              boxShadow: '0 12px 30px rgba(67,67,43,0.16)',
              fontFamily: inter,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.02em',
              color: '#F5F0E8',
              cursor: 'pointer',
            }}
          >
            Continue to Setup
          </button>
        </div>
      </div>
    </div>
  );
}
