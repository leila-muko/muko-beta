import type { CSSProperties } from 'react';

export const reportPalette = {
  bg: '#FAF9F6',
  bgWarm: '#F4F0E7',
  paper: 'rgba(255,255,255,0.72)',
  paperStrong: 'rgba(255,255,255,0.86)',
  paperSoft: 'rgba(255,255,255,0.48)',
  wash: 'rgba(248,244,236,0.82)',
  border: 'rgba(67,67,43,0.10)',
  borderStrong: 'rgba(67,67,43,0.14)',
  line: 'rgba(67,67,43,0.08)',
  olive: '#43432B',
  chartreuse: '#A8B475',
  camel: '#B8876B',
  steel: '#7D96AC',
  rose: '#A97B8F',
  muted: 'rgba(67,67,43,0.58)',
  faint: 'rgba(67,67,43,0.34)',
  quiet: 'rgba(67,67,43,0.22)',
};

export const fonts = {
  heading: 'var(--font-sohne-breit), system-ui, sans-serif',
  body: 'var(--font-inter), system-ui, sans-serif',
};

export const sectionCard: CSSProperties = {
  borderRadius: 20,
  border: `1px solid ${reportPalette.border}`,
  background: reportPalette.paper,
  boxShadow: '0 18px 50px rgba(67,67,43,0.06)',
  backdropFilter: 'blur(18px)',
};

export const pageShell: CSSProperties = {
  maxWidth: 1220,
  margin: '0 auto',
  padding: '48px 20px 96px',
  display: 'flex',
  gap: 36,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

export const railCard: CSSProperties = {
  padding: '14px 0 0',
  borderLeft: `1px solid ${reportPalette.line}`,
};

export const heroSurface: CSSProperties = {
  borderRadius: 28,
  border: `1px solid ${reportPalette.border}`,
  background:
    'linear-gradient(180deg, rgba(248,245,239,0.96) 0%, rgba(255,255,255,0.92) 100%)',
  boxShadow: '0 20px 48px rgba(67,67,43,0.05)',
  position: 'relative',
  overflow: 'hidden',
};

export const memoSection: CSSProperties = {
  padding: '34px 36px',
  borderTop: `1px solid ${reportPalette.line}`,
  background: 'transparent',
};

export const narrativeSurface: CSSProperties = {
  padding: '34px 36px',
  borderRadius: 24,
  border: `1px solid ${reportPalette.line}`,
  background: 'rgba(255,255,255,0.42)',
};

export const structuredSurface: CSSProperties = {
  padding: '30px 32px',
  borderRadius: 22,
  border: `1px solid ${reportPalette.line}`,
  background: 'rgba(255,255,255,0.58)',
};

export const subCard: CSSProperties = {
  padding: '20px 22px',
  borderRadius: 20,
  border: `1px solid ${reportPalette.line}`,
  background: 'rgba(255,255,255,0.56)',
};

export const softPanel: CSSProperties = {
  padding: '18px 20px',
  borderRadius: 18,
  background: 'rgba(248,244,236,0.76)',
  border: `1px solid rgba(67,67,43,0.06)`,
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

export const quietMeta: CSSProperties = {
  fontFamily: fonts.body,
  fontSize: 12,
  color: reportPalette.muted,
  lineHeight: 1.5,
};

export const metaChip: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 999,
  border: `1px solid rgba(67,67,43,0.07)`,
  background: 'rgba(255,255,255,0.56)',
  fontFamily: fonts.body,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: reportPalette.faint,
};

export function sectionHeading(size: 'lg' | 'md' = 'lg'): CSSProperties {
  return {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: size === 'lg' ? 32 : 24,
    lineHeight: size === 'lg' ? 1.02 : 1.06,
    letterSpacing: '-0.04em',
    color: reportPalette.olive,
  };
}

export function sectionBody(width = 760): CSSProperties {
  return {
    margin: 0,
    maxWidth: width,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 1.78,
    color: reportPalette.olive,
  };
}

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

export function getToneSurface(score: number) {
  if (score >= 80) {
    return {
      background: 'linear-gradient(180deg, rgba(168,180,117,0.12) 0%, rgba(255,255,255,0.82) 100%)',
      border: 'rgba(168,180,117,0.18)',
    };
  }
  if (score >= 65) {
    return {
      background: 'linear-gradient(180deg, rgba(184,135,107,0.10) 0%, rgba(255,255,255,0.82) 100%)',
      border: 'rgba(184,135,107,0.18)',
    };
  }
  return {
    background: 'linear-gradient(180deg, rgba(169,123,143,0.10) 0%, rgba(255,255,255,0.82) 100%)',
    border: 'rgba(169,123,143,0.18)',
  };
}

export function getTagTone(tone: 'olive' | 'chartreuse' | 'camel' | 'steel' | 'rose') {
  if (tone === 'chartreuse') return { background: 'rgba(168,180,117,0.12)', color: reportPalette.chartreuse };
  if (tone === 'camel') return { background: 'rgba(184,135,107,0.12)', color: reportPalette.camel };
  if (tone === 'steel') return { background: 'rgba(125,150,172,0.12)', color: reportPalette.steel };
  if (tone === 'rose') return { background: 'rgba(169,123,143,0.12)', color: reportPalette.rose };
  return { background: 'rgba(67,67,43,0.06)', color: reportPalette.olive };
}

export function formatMonthYear(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}
