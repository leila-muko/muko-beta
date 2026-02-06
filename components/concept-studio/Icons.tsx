import React from 'react';
import { BRAND } from '../../lib/concept-studio/constants';

export const IconIdentity = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
      fill={BRAND.oliveInk}
      stroke={BRAND.oliveInk}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="2" fill="white" />
  </svg>
);

export const IconResonance = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="7" r="4" stroke={BRAND.oliveInk} strokeWidth="2" fill="none" />
    <circle cx="7" cy="16" r="4" stroke={BRAND.oliveInk} strokeWidth="2" fill="none" />
    <circle cx="17" cy="16" r="4" stroke={BRAND.oliveInk} strokeWidth="2" fill="none" />
  </svg>
);

export const IconExecution = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2a10 10 0 1010 10" stroke={BRAND.oliveInk} strokeWidth="2" strokeLinecap="round" />
    <path
      d="M12 6v6l4 2"
      stroke={BRAND.oliveInk}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);