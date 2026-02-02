'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { getRecommendations } from '@/lib/recommendations';
import { findAlternatives, shouldShowAlternatives } from '@/lib/alternatives';
import { COLOR_PALETTES } from '@/lib/data/colorPalettes';

export default function ConceptStudioPage() {
  const {
    season,
    aestheticInput,
    setAestheticInput,
    identityPulse,
    resonancePulse,
    executionPulse,
    conceptLocked,
    lockConcept,
    setCurrentStep,
    colorPaletteName,
    setColorPalette,
  } = useSessionStore();

  const BRAND = {
    ink: '#191919',
    oliveInk: '#43432B',
    rose: '#A97B8F',
    steelBlue: '#7D96AC',
    chartreuse: '#ABAB63',
  };

  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [inputExpanded, setInputExpanded] = useState(false);
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStep(2);
    
    // Get recommendations
    const mockBrandKeywords = ['Minimalist', 'Sustainable'];
    const recs = getRecommendations({
      season: season || 'SS26',
      brandKeywords: mockBrandKeywords,
      limit: 3
    });
    setRecommendations(recs);
  }, [season, setCurrentStep]);

  // Auto-expand input if aesthetic already set
  useEffect(() => {
    if (aestheticInput) {
      setInputExpanded(true);
    }
  }, [aestheticInput]);

  // Find alternatives when pulses update
  useEffect(() => {
    if (!aestheticInput || !identityPulse || !resonancePulse) {
      setAlternatives([]);
      return;
    }

    const scores = {
      identity: identityPulse.score,
      resonance: resonancePulse.score
    };

    if (!shouldShowAlternatives(scores)) {
      setAlternatives([]);
      return;
    }

    const alts = findAlternatives({
      currentAesthetic: aestheticInput,
      currentScores: scores,
      limit: 2
    });

    setAlternatives(alts);
  }, [aestheticInput, identityPulse, resonancePulse]);

  const handleSelectRecommendation = (aesthetic: string) => {
    setAestheticInput(aesthetic);
    setInputExpanded(true);
  };

  const handleSelectPalette = (paletteId: string) => {
    const palette = COLOR_PALETTES.find(p => p.id === paletteId);
    if (palette) {
      setSelectedPaletteId(paletteId);
      setColorPalette(palette.colors, palette.name);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(900px 520px at 58% 20%, rgba(255,255,255,0.92) 0%, rgba(249,248,245,0.62) 42%, rgba(242,239,233,0.72) 70%, rgba(235,232,228,0.94) 100%)',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes wash-drift {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0px, 0px, 0); }
          50% { transform: translate(-50%, -50%) translate3d(40px, 28px, 0); }
        }

        @keyframes wash-drift-2 {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0px, 0px, 0); }
          50% { transform: translate(-50%, -50%) translate3d(-36px, -22px, 0); }
        }

        .grain-overlay {
          position: fixed;
          inset: 0;
          background: transparent url('data:image/svg+xml;utf8,<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>') repeat 0 0;
          background-size: 240px 240px;
          opacity: 0.16;
          mix-blend-mode: soft-light;
          pointer-events: none;
          z-index: 1;
        }

        .glaze-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          background:
            radial-gradient(900px 560px at 62% 26%,
              rgba(169,123,143,0.08) 0%,
              rgba(125,150,172,0.06) 35%,
              rgba(196,207,142,0.06) 58%,
              transparent 76%),
            linear-gradient(115deg,
              rgba(255,255,255,0.10) 0%,
              rgba(255,255,255,0.00) 40%,
              rgba(255,255,255,0.08) 100%);
          mix-blend-mode: soft-light;
          opacity: 0.9;
        }

        .vignette {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 3;
          background: radial-gradient(circle at 58% 24%,
            transparent 0%,
            rgba(25,25,25,0.06) 88%,
            rgba(25,25,25,0.10) 100%);
          opacity: 0.55;
        }

        .wash-rose {
          position: absolute;
          left: 72%;
          top: 26%;
          width: 980px;
          height: 780px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle at 35% 35%,
            rgba(169, 123, 143, 0.28) 0%,
            rgba(205, 170, 179, 0.16) 34%,
            rgba(169, 123, 143, 0.10) 54%,
            transparent 74%);
          filter: blur(52px);
          opacity: 0.95;
          animation: wash-drift 18s ease-in-out infinite;
          z-index: 0;
        }

        .wash-blue {
          position: absolute;
          left: 56%;
          top: 78%;
          width: 1080px;
          height: 860px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle at 55% 45%,
            rgba(125, 150, 172, 0.26) 0%,
            rgba(138, 164, 184, 0.15) 36%,
            rgba(125, 150, 172, 0.10) 56%,
            transparent 76%);
          filter: blur(54px);
          opacity: 0.92;
          animation: wash-drift-2 20s ease-in-out infinite;
          z-index: 0;
        }
      `}</style>

      <div className="grain-overlay" />
      <div className="glaze-overlay" />
      <div className="vignette" />
      <div className="wash-rose" />
      <div className="wash-blue" />

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          position: 'relative',
          zIndex: 10,
          padding: '24px',
          gap: '24px',
        }}
      >
        {/* Left Panel - Controls (40%) */}
        <div
          style={{
            width: '40%',
            backgroundColor: 'rgba(255, 255, 255, 0.74)',
            backdropFilter: 'blur(24px) saturate(170%)',
            WebkitBackdropFilter: 'blur(24px) saturate(170%)',
            padding: '48px 40px',
            borderRadius: '18px',
            boxShadow:
              '0 18px 52px rgba(67, 67, 43, 0.08), 0 2px 10px rgba(67, 67, 43, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.86)',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <h1
            style={{
              fontSize: '42px',
              fontWeight: 400,
              color: BRAND.oliveInk,
              marginBottom: '12px',
              fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
            }}
          >
            Concept Studio
          </h1>

          <p
            style={{
              fontSize: '14px',
              color: 'rgba(67, 67, 43, 0.55)',
              marginBottom: '48px',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            Define your aesthetic direction
          </p>

          {/* Recommended */}
          <div style={{ marginBottom: '32px' }}>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'rgba(67, 67, 43, 0.70)',
                marginBottom: '14px',
                display: 'block',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                letterSpacing: '0.02em',
              }}
            >
              Recommended
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {recommendations.map((aesthetic, index) => {
                const isActive = aestheticInput === aesthetic;
                return (
                  <button
                    key={index}
                    onClick={() => handleSelectRecommendation(aesthetic)}
                    style={{
                      padding: '14px 24px',
                      fontSize: '14px',
                      fontWeight: 550,
                      color: isActive ? BRAND.chartreuse : 'rgba(67, 67, 43, 0.65)',
                      background: isActive
                        ? 'rgba(171, 171, 99, 0.12)'
                        : 'rgba(235, 232, 228, 0.55)',
                      border: isActive
                        ? '1.5px solid rgba(171, 171, 99, 0.32)'
                        : '1.5px solid rgba(67, 67, 43, 0.12)',
                      borderRadius: '999px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                      transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isActive
                        ? '0 8px 24px rgba(171, 171, 99, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.50)'
                        : '0 4px 16px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.60)',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(196, 207, 142, 0.25)';
                        e.currentTarget.style.borderColor = 'rgba(168, 180, 117, 0.22)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(235, 232, 228, 0.55)';
                        e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.12)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {aesthetic}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aesthetic Direction Input */}
          <div style={{ marginBottom: '32px' }}>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'rgba(67, 67, 43, 0.70)',
                marginBottom: '14px',
                display: 'block',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                letterSpacing: '0.02em',
              }}
            >
              Aesthetic Direction
            </label>

            {!inputExpanded ? (
              <button
                onClick={() => setInputExpanded(true)}
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  fontSize: '15px',
                  color: 'rgba(67, 67, 43, 0.45)',
                  background: 'rgba(255, 255, 255, 0.68)',
                  border: '1.5px solid rgba(67, 67, 43, 0.14)',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  textAlign: 'left',
                  boxShadow: '0 4px 16px rgba(67, 67, 43, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.90)',
                  transition: 'all 220ms ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.22)';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.88)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.14)';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.68)';
                }}
              >
                <span>Enter aesthetic direction...</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M7.5 15L12.5 10L7.5 5"
                    stroke={BRAND.oliveInk}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.45"
                  />
                </svg>
              </button>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={aestheticInput}
                  onChange={(e) => setAestheticInput(e.target.value)}
                  placeholder="e.g., Neo-Western, Dark Romantic..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '20px 48px 20px 24px',
                    fontSize: '15px',
                    color: BRAND.oliveInk,
                    background: 'rgba(255, 255, 255, 0.88)',
                    border: '1.5px solid rgba(125, 150, 172, 0.28)',
                    borderRadius: '14px',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    outline: 'none',
                    boxShadow: '0 8px 24px rgba(125, 150, 172, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.90)',
                    transition: 'all 220ms ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.42)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(125, 150, 172, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.90)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.28)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(125, 150, 172, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.90)';
                  }}
                />
                <button
                  onClick={() => {
                    setInputExpanded(false);
                    setAestheticInput('');
                  }}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(67, 67, 43, 0.45)',
                    fontSize: '18px',
                    padding: '4px',
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Try These (Alternatives) */}
          {alternatives.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'rgba(67, 67, 43, 0.60)',
                  marginBottom: '14px',
                  display: 'block',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  letterSpacing: '0.02em',
                }}
              >
                Try These...
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {alternatives.map((alt, index) => (
                  <button
                    key={index}
                    onClick={() => setAestheticInput(alt.name)}
                    style={{
                      padding: '16px 20px',
                      background: 'rgba(255, 255, 255, 0.68)',
                      border: '1.5px solid rgba(67, 67, 43, 0.12)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 220ms ease',
                      boxShadow: '0 4px 16px rgba(67, 67, 43, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.80)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(171, 171, 99, 0.24)';
                      e.currentTarget.style.backgroundColor = 'rgba(196, 207, 142, 0.10)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.12)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.68)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: BRAND.oliveInk,
                          fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                        }}
                      >
                        {alt.name}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {alt.identityDelta > 0 && (
                          <span
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 650,
                              color: 'rgba(125, 150, 172, 0.90)',
                              background: 'rgba(125, 150, 172, 0.10)',
                              border: '1px solid rgba(125, 150, 172, 0.20)',
                              borderRadius: '999px',
                              fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                            }}
                          >
                            +{alt.identityDelta} 🛡️
                          </span>
                        )}
                        {alt.resonanceDelta > 0 && (
                          <span
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 650,
                              color: 'rgba(169, 123, 143, 0.90)',
                              background: 'rgba(169, 123, 143, 0.10)',
                              border: '1px solid rgba(169, 123, 143, 0.20)',
                              borderRadius: '999px',
                              fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                            }}
                          >
                            +{alt.resonanceDelta} 👥
                          </span>
                        )}
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'rgba(67, 67, 43, 0.55)',
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        lineHeight: '1.5',
                      }}
                    >
                      {alt.reason}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Palette Selector */}
          <div style={{ marginBottom: '32px' }}>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'rgba(67, 67, 43, 0.70)',
                marginBottom: '14px',
                display: 'block',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                letterSpacing: '0.02em',
              }}
            >
              Palette Selector <span style={{ color: 'rgba(67, 67, 43, 0.45)', fontWeight: 400 }}>(Optional)</span>
            </label>

            {/* Info */}
            <div
              style={{
                padding: '14px 18px',
                background: 'rgba(125, 150, 172, 0.06)',
                border: '1px solid rgba(125, 150, 172, 0.14)',
                borderRadius: '10px',
                marginBottom: '16px',
              }}
            >
              <p
                style={{
                  fontSize: '12px',
                  color: 'rgba(67, 67, 43, 0.65)',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  lineHeight: '1.6',
                }}
              >
                ℹ️ Choose colors to personalize your report. Color palette appears in your final analysis.
              </p>
            </div>

            {/* Palette Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {COLOR_PALETTES.map((palette) => {
                const isSelected = selectedPaletteId === palette.id;
                return (
                  <button
                    key={palette.id}
                    onClick={() => handleSelectPalette(palette.id)}
                    style={{
                      padding: '16px',
                      background: isSelected ? 'rgba(125, 150, 172, 0.08)' : 'rgba(255, 255, 255, 0.68)',
                      border: isSelected
                        ? '1.5px solid rgba(125, 150, 172, 0.32)'
                        : '1.5px solid rgba(67, 67, 43, 0.10)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 220ms ease',
                      boxShadow: isSelected
                        ? '0 8px 24px rgba(125, 150, 172, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.80)'
                        : '0 4px 16px rgba(67, 67, 43, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.80)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.18)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.88)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.10)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.68)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: BRAND.oliveInk,
                          fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                        }}
                      >
                        {palette.name}
                      </span>
                      {isSelected && (
                        <span style={{ fontSize: '14px', color: BRAND.steelBlue }}>✓</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      {palette.colors.slice(0, 5).map((color, i) => (
                        <div
                          key={i}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            backgroundColor: color,
                            border: '1px solid rgba(67, 67, 43, 0.12)',
                            boxShadow: '0 2px 8px rgba(67, 67, 43, 0.08)',
                          }}
                        />
                      ))}
                    </div>
                    <p
                      style={{
                        fontSize: '11px',
                        color: 'rgba(67, 67, 43, 0.50)',
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      }}
                    >
                      {palette.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel - Moodboard (60%) */}
        <div
          style={{
            width: '60%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Moodboard */}
          <div
            style={{
              flex: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.74)',
              backdropFilter: 'blur(24px) saturate(170%)',
              WebkitBackdropFilter: 'blur(24px) saturate(170%)',
              padding: '48px',
              borderRadius: '18px',
              boxShadow:
                '0 18px 52px rgba(67, 67, 43, 0.08), 0 2px 10px rgba(67, 67, 43, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.86)',
              marginBottom: '24px',
              overflowY: 'auto',
            }}
          >
            {aestheticInput && (
              <div style={{ marginBottom: '32px' }}>
                <h2
                  style={{
                    fontSize: '32px',
                    fontWeight: 400,
                    color: BRAND.oliveInk,
                    marginBottom: '8px',
                    fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  }}
                >
                  {aestheticInput}
                </h2>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'rgba(67, 67, 43, 0.50)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  }}
                >
                  Visual exploration
                </p>
              </div>
            )}

            {/* Moodboard Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, 
                      hsl(${i * 30}, 40%, 85%) 0%, 
                      hsl(${i * 30 + 60}, 35%, 75%) 100%)`,
                    border: '1.5px solid rgba(67, 67, 43, 0.08)',
                    boxShadow: '0 4px 16px rgba(67, 67, 43, 0.06)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 220ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      padding: '4px 10px',
                      background: 'rgba(25, 25, 25, 0.65)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.90)',
                      fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                    }}
                  >
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>

            {!aestheticInput && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '80px 40px',
                }}
              >
                <p
                  style={{
                    fontSize: '15px',
                    color: 'rgba(67, 67, 43, 0.40)',
                    marginBottom: '8px',
                    fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  }}
                >
                  Select or enter an aesthetic
                </p>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'rgba(67, 67, 43, 0.35)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  }}
                >
                  Images will update based on your aesthetic direction
                </p>
              </div>
            )}
          </div>

          {/* Pulse Rail */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.74)',
              backdropFilter: 'blur(24px) saturate(170%)',
              WebkitBackdropFilter: 'blur(24px) saturate(170%)',
              padding: '24px 32px',
              borderRadius: '18px',
              boxShadow:
                '0 18px 52px rgba(67, 67, 43, 0.08), 0 2px 10px rgba(67, 67, 43, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.86)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Pulses */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'rgba(67, 67, 43, 0.60)',
                  marginRight: '8px',
                  fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                }}
              >
                Pulse Rail
              </span>

              {/* Identity */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 18px',
                  background: identityPulse
                    ? 'rgba(125, 150, 172, 0.08)'
                    : 'rgba(67, 67, 43, 0.04)',
                  border: '1px solid rgba(67, 67, 43, 0.10)',
                  borderRadius: '999px',
                }}
              >
                <span style={{ fontSize: '16px' }}>🛡️</span>
                <div>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'rgba(67, 67, 43, 0.50)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    }}
                  >
                    Identity
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 650,
                      color: BRAND.oliveInk,
                      fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                    }}
                  >
                    {identityPulse?.score || '—'}
                  </div>
                </div>
              </div>

              {/* Resonance */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 18px',
                  background: resonancePulse
                    ? 'rgba(125, 150, 172, 0.08)'
                    : 'rgba(67, 67, 43, 0.04)',
                  border: '1px solid rgba(67, 67, 43, 0.10)',
                  borderRadius: '999px',
                }}
              >
                <span style={{ fontSize: '16px' }}>👥</span>
                <div>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'rgba(67, 67, 43, 0.50)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    }}
                  >
                    Resonance
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 650,
                      color: BRAND.oliveInk,
                      fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                    }}
                  >
                    {resonancePulse?.score || '—'}
                  </div>
                </div>
              </div>

              {/* Execution */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 18px',
                  background: 'rgba(67, 67, 43, 0.04)',
                  border: '1px solid rgba(67, 67, 43, 0.08)',
                  borderRadius: '999px',
                  opacity: 0.5,
                }}
              >
                <span style={{ fontSize: '16px' }}>📦</span>
                <div>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'rgba(67, 67, 43, 0.50)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    }}
                  >
                    Execution
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 650,
                      color: BRAND.oliveInk,
                      fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                    }}
                  >
                    🔒
                  </div>
                </div>
              </div>
            </div>

            {/* Lock Button */}
            <button
              onClick={lockConcept}
              disabled={!identityPulse || !resonancePulse || conceptLocked}
              style={{
                padding: '16px 48px',
                fontSize: '14px',
                fontWeight: 650,
                color: conceptLocked ? 'rgba(125, 150, 172, 0.70)' : BRAND.steelBlue,
                background: 'rgba(255, 255, 255, 0.25)',
                border: `1.5px solid ${
                  conceptLocked ? 'rgba(125, 150, 172, 0.28)' : 'rgba(125, 150, 172, 0.42)'
                }`,
                borderRadius: '999px',
                cursor:
                  !identityPulse || !resonancePulse || conceptLocked ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 12px 40px rgba(125, 150, 172, 0.14)',
                opacity: !identityPulse || !resonancePulse || conceptLocked ? 0.55 : 1,
              }}
              onMouseEnter={(e) => {
                if (identityPulse && resonancePulse && !conceptLocked) {
                  e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.62)';
                  e.currentTarget.style.backgroundColor = 'rgba(125, 150, 172, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(125, 150, 172, 0.22)';
                }
              }}
              onMouseLeave={(e) => {
                if (identityPulse && resonancePulse && !conceptLocked) {
                  e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.42)';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(125, 150, 172, 0.14)';
                }
              }}
            >
              {conceptLocked ? '✓ Locked' : 'Lock'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}