import type { CSSProperties } from 'react';

export const reportPalette = {
  bg: '#F7F4EE',
  paper: 'rgba(255,255,255,0.72)',
  paperStrong: 'rgba(255,255,255,0.86)',
  border: 'rgba(67,67,43,0.10)',
  olive: '#43432B',
  chartreuse: '#A8B475',
  camel: '#B8876B',
  steel: '#7D96AC',
  rose: '#A97B8F',
  muted: 'rgba(67,67,43,0.58)',
  faint: 'rgba(67,67,43,0.34)',
};

export const fonts = {
  heading: 'var(--font-sohne-breit), system-ui, sans-serif',
  body: 'var(--font-inter), system-ui, sans-serif',
};

export const sectionCard: CSSProperties = {
  borderRadius: 24,
  border: `1px solid ${reportPalette.border}`,
  background: reportPalette.paper,
  boxShadow: '0 18px 50px rgba(67,67,43,0.06)',
  backdropFilter: 'blur(18px)',
};

export const sectionEyebrow: CSSProperties = {
  fontFamily: fonts.body,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: reportPalette.faint,
  margin: 0,
};

export function getTone(score: number) {
  if (score >= 80) return reportPalette.chartreuse;
  if (score >= 65) return reportPalette.camel;
  return reportPalette.rose;
}

export function getSoftTone(score: number) {
  if (score >= 80) return 'rgba(168,180,117,0.14)';
  if (score >= 65) return 'rgba(184,135,107,0.13)';
  return 'rgba(169,123,143,0.12)';
}

export function formatMonthYear(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}
