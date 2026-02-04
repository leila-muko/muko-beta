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
  const [hasSubmittedAesthetic, setHasSubmittedAesthetic] = useState(false);
  const [pulseUpdated, setPulseUpdated] = useState(false);

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
    console.log('=== ALTERNATIVES EFFECT TRIGGERED ===');
    console.log('aestheticInput:', aestheticInput);
    console.log('identityPulse:', identityPulse);
    console.log('resonancePulse:', resonancePulse);
    console.log('hasSubmittedAesthetic:', hasSubmittedAesthetic);
    
    if (!aestheticInput) {
      console.log('Early return - no aesthetic input');
      setAlternatives([]);
      return;
    }

    // TEMPORARY: Mock pulse scores for testing if they don't exist
    const mockIdentityScore = identityPulse?.score || 65;
    const mockResonanceScore = resonancePulse?.score || 60;

    const scores = {
      identity: mockIdentityScore,
      resonance: mockResonanceScore
    };

    console.log('Using scores (mock if needed):', scores);

    // Temporarily disabled for testing - always show alternatives
    // if (!shouldShowAlternatives(scores)) {
    //   setAlternatives([]);
    //   return;
    // }

    const alts = findAlternatives({
      currentAesthetic: normalizeAesthetic(aestheticInput),
      currentScores: scores,
      limit: 2
    });

    console.log('Alternatives found:', alts);
    console.log('Current aesthetic (normalized):', normalizeAesthetic(aestheticInput));
    console.log('Current scores:', scores);

    setAlternatives(alts);
  }, [aestheticInput, identityPulse, resonancePulse]);

  // Trigger dramatic glow when pulse values update
  useEffect(() => {
    console.log('🎨 Pulse effect triggered!');
    console.log('  - identityPulse:', identityPulse);
    console.log('  - resonancePulse:', resonancePulse);
    console.log('  - identityPulse?.score:', identityPulse?.score);
    console.log('  - resonancePulse?.score:', resonancePulse?.score);
    
    if (identityPulse || resonancePulse) {
      console.log('✨ Setting pulseUpdated to TRUE - Animation should trigger!');
      setPulseUpdated(true);
      const timer = setTimeout(() => {
        console.log('⏰ Animation timeout - Setting pulseUpdated to FALSE');
        setPulseUpdated(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [identityPulse?.score, resonancePulse?.score]);

  const handleSelectRecommendation = (aesthetic: string) => {
    setAestheticInput(aesthetic);
    setInputExpanded(true);
    setHasSubmittedAesthetic(true);
  };

  const handleSubmitAesthetic = () => {
    console.log('🔥 handleSubmitAesthetic called!');
    console.log('aestheticInput:', aestheticInput);
    console.log('aestheticInput.trim():', aestheticInput.trim());
    if (aestheticInput.trim()) {
      console.log('✅ Setting hasSubmittedAesthetic to TRUE');
      setHasSubmittedAesthetic(true);
      
      // TEMPORARY: Mock pulse scores for testing animation
      // Generate random scores to see the glow effect
      const mockIdentity = Math.floor(Math.random() * 30) + 70; // 70-100
      const mockResonance = Math.floor(Math.random() * 30) + 65; // 65-95
      
      // Simulate pulse calculation delay
      setTimeout(() => {
        // This would normally come from your pulse calculation logic
        // For now, we're just updating the session store directly for testing
        console.log('🎯 Mock pulses updating:', { mockIdentity, mockResonance });
        
        // Determine status based on score (green >= 80, yellow >= 60, red < 60)
        const identityStatus = mockIdentity >= 80 ? 'green' : mockIdentity >= 60 ? 'yellow' : 'red';
        const resonanceStatus = mockResonance >= 80 ? 'green' : mockResonance >= 60 ? 'yellow' : 'red';
        
        // Determine messages based on status
        const identityMessage = identityStatus === 'green' ? 'Strong alignment' : identityStatus === 'yellow' ? 'Moderate alignment' : 'Weak alignment';
        const resonanceMessage = resonanceStatus === 'green' ? 'Strong opportunity' : resonanceStatus === 'yellow' ? 'Moderate opportunity' : 'Saturated market';
        
        // You can manually trigger the animation by toggling these
        // In real implementation, these would be set by your pulse calculation
        useSessionStore.setState({
          identityPulse: { score: mockIdentity, status: identityStatus, message: identityMessage },
          resonancePulse: { score: mockResonance, status: resonanceStatus, message: resonanceMessage }
        });
      }, 500);
      
      // Log current state immediately
      console.log('📊 Current state check:');
      console.log('  - identityPulse:', identityPulse);
      console.log('  - resonancePulse:', resonancePulse);
      console.log('  - alternatives array:', alternatives);
    } else {
      console.log('❌ Input is empty, not submitting');
    }
  };

  // Normalize aesthetic input for case-insensitive matching
  const normalizeAesthetic = (input: string): string => {
    // Convert to title case to match the keys in AESTHETIC_SIMILARITIES
    return input
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleSelectPalette = (paletteId: string) => {
    const palette = COLOR_PALETTES.find(p => p.id === paletteId);
    if (palette) {
      setSelectedPaletteId(paletteId);
      setColorPalette(palette.colors, palette.name);
    }
  };

  // Debug logging
  console.log('=== RENDER STATE ===');
  console.log('hasSubmittedAesthetic:', hasSubmittedAesthetic);
  console.log('alternatives.length:', alternatives.length);
  console.log('alternatives:', alternatives);
  console.log('Should show Try These?', hasSubmittedAesthetic && alternatives.length > 0);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAF9F6',
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

        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 8px 24px rgba(125, 150, 172, 0.20), 
                        0 0 20px rgba(125, 150, 172, 0.12),
                        inset 0 1px 0 rgba(255, 255, 255, 0.95);
          }
          50% { 
            box-shadow: 0 12px 40px rgba(125, 150, 172, 0.35), 
                        0 0 40px rgba(125, 150, 172, 0.25),
                        inset 0 1px 0 rgba(255, 255, 255, 0.95);
          }
        }

        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }

        @keyframes pulse-container-glow {
          0% { 
            box-shadow: 0 12px 48px rgba(169, 123, 143, 0.15),
                        0 0 40px rgba(169, 123, 143, 0.08),
                        inset 0 1px 0 rgba(255, 255, 255, 0.92);
          }
          50% { 
            box-shadow: 0 20px 72px rgba(169, 123, 143, 0.35),
                        0 0 90px rgba(169, 123, 143, 0.25),
                        inset 0 1px 0 rgba(255, 255, 255, 0.92);
          }
          100% { 
            box-shadow: 0 12px 48px rgba(169, 123, 143, 0.15),
                        0 0 40px rgba(169, 123, 143, 0.08),
                        inset 0 1px 0 rgba(255, 255, 255, 0.92);
          }
        }

        @keyframes float-container {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-2px) scale(1.005); }
        }

        @keyframes skeleton-loading {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
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

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 10,
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Content Area - Scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '64px 64px 180px',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
          }}
        >
          {/* Header with Back/Revert buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1
                style={{
                  fontSize: '48px',
                  fontWeight: 400,
                  color: BRAND.oliveInk,
                  margin: 0,
                  fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                }}
              >
                Concept Studio
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  color: 'rgba(67, 67, 43, 0.55)',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  margin: '4px 0 0 0',
                }}
              >
                New Collection • {season || 'SS26'}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  // Handle back action
                  console.log('Back clicked');
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: BRAND.rose,
                  background: 'transparent',
                  border: `1.5px solid ${BRAND.rose}`,
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  letterSpacing: '0.02em',
                  transition: 'all 220ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(169, 123, 143, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Back
              </button>
              
              <button
                onClick={() => {
                  // Handle revert action
                  console.log('Revert clicked');
                  setAestheticInput('');
                  setHasSubmittedAesthetic(false);
                  setSelectedPaletteId(null);
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: BRAND.rose,
                  background: 'transparent',
                  border: `1.5px solid ${BRAND.rose}`,
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  letterSpacing: '0.02em',
                  transition: 'all 220ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(169, 123, 143, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Revert
              </button>
            </div>
          </div>

          {/* Two Column Layout */}
          <div style={{ display: 'flex', gap: '80px' }}>
            {/* Left Column - Inputs */}
            <div style={{ flex: '0 0 500px' }}>
              
              {/* Aesthetic Direction Section */}
              <div style={{ marginBottom: '40px' }}>
                <label
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: BRAND.oliveInk,
                    marginBottom: '10px',
                    display: 'block',
                    fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                    letterSpacing: '0.01em',
                  }}
                >
                  Aesthetic Direction
                </label>
            
            {/* Instructional subtitle */}
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(67, 67, 43, 0.55)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                marginBottom: '18px',
                lineHeight: '1.5',
              }}
            >
              Tell me what you're going for and click the arrow to proceed
            </p>

            {!inputExpanded ? (
              <button
                onClick={() => setInputExpanded(true)}
                style={{
                  width: '100%',
                  padding: '22px 28px',
                  fontSize: '15px',
                  color: 'rgba(67, 67, 43, 0.45)',
                  background: 'rgba(255, 255, 255, 0.68)',
                  border: '1.5px solid rgba(67, 67, 43, 0.14)',
                  borderRadius: '999px',
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
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  value={aestheticInput}
                  onChange={(e) => {
                    setAestheticInput(e.target.value);
                    setHasSubmittedAesthetic(false); // Reset submission state when typing
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmitAesthetic();
                    }
                  }}
                  placeholder="e.g., Neo-Western, Dark Romantic..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '22px 28px',
                    paddingRight: '72px',
                    fontSize: '15px',
                    color: BRAND.oliveInk,
                    background: 'rgba(255, 255, 255, 0.88)',
                    border: '1.5px solid rgba(125, 150, 172, 0.28)',
                    borderRadius: '999px',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    outline: 'none',
                    boxShadow: '0 8px 24px rgba(125, 150, 172, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.90)',
                    transition: 'all 220ms ease',
                    boxSizing: 'border-box',
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!aestheticInput.trim()) return; // Prevent action if disabled
                    console.log('🔥 BUTTON CLICKED!');
                    console.log('Input value:', aestheticInput);
                    handleSubmitAesthetic();
                  }}
                  disabled={!aestheticInput.trim()}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '48px',
                    height: '48px',
                    background: aestheticInput.trim() 
                      ? '#6B8AAC' // Darker steel blue when enabled
                      : 'rgba(200, 200, 200, 0.25)', // Very light gray when disabled
                    border: aestheticInput.trim()
                      ? 'none'
                      : '1.5px solid rgba(67, 67, 43, 0.10)',
                    cursor: aestheticInput.trim() ? 'pointer' : 'not-allowed',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 220ms ease',
                    opacity: aestheticInput.trim() ? 1 : 0.4,
                    pointerEvents: 'auto',
                    zIndex: 10,
                    boxShadow: aestheticInput.trim() 
                      ? '0 4px 16px rgba(107, 138, 172, 0.32)'
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (aestheticInput.trim()) {
                      e.currentTarget.style.background = '#5A7694'; // Even darker on hover
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(107, 138, 172, 0.40)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (aestheticInput.trim()) {
                      e.currentTarget.style.background = '#6B8AAC'; // Back to darker steel blue
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(107, 138, 172, 0.32)';
                    }
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M7.5 15L12.5 10L7.5 5"
                      stroke={aestheticInput.trim() ? 'white' : 'rgba(67, 67, 43, 0.25)'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}

              {/* Recommended (only show if NOT submitted OR input is empty) */}
              {recommendations.length > 0 && (!hasSubmittedAesthetic || aestheticInput.trim() === '') && (
                <div style={{ marginTop: '20px', marginBottom: '0' }}>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'rgba(67, 67, 43, 0.55)',
                  marginBottom: '12px',
                  display: 'block',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Recommended
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {recommendations.map((aesthetic, index) => {
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setAestheticInput(aesthetic);
                        setInputExpanded(true);
                        setHasSubmittedAesthetic(false); // Don't auto-submit, user must click arrow
                      }}
                      style={{
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'rgba(67, 67, 43, 0.70)',
                        background: 'rgba(235, 232, 228, 0.55)',
                        border: '1.5px solid rgba(67, 67, 43, 0.12)',
                        borderRadius: '999px',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                        transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 16px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.60)',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(196, 207, 142, 0.25)';
                        e.currentTarget.style.borderColor = 'rgba(168, 180, 117, 0.22)';
                        e.currentTarget.style.color = BRAND.oliveInk;
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(168, 180, 117, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.60)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(235, 232, 228, 0.55)';
                        e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.12)';
                        e.currentTarget.style.color = 'rgba(67, 67, 43, 0.70)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.60)';
                      }}
                    >
                      {aesthetic}
                    </button>
                  );
                })}
                  </div>
                </div>
              )}
              </div>
              {/* End Aesthetic Direction Section */}

              {/* Try These (Alternatives - shown AFTER submission) */}
              {hasSubmittedAesthetic && alternatives.length > 0 && (
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
                    onClick={() => {
                      setAestheticInput(alt.name);
                      setInputExpanded(true); // Expand the input so user can see what was selected
                      setHasSubmittedAesthetic(false); // Reset so Try These section disappears and user must submit again
                    }}
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
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: 650,
                              color: 'rgba(125, 150, 172, 0.90)',
                              background: 'rgba(125, 150, 172, 0.10)',
                              border: '1px solid rgba(125, 150, 172, 0.20)',
                              borderRadius: '999px',
                              fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            +{alt.identityDelta}
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '2px' }}>
                              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" 
                                fill="rgba(125, 150, 172, 0.90)" 
                                stroke="rgba(125, 150, 172, 0.90)" 
                                strokeWidth="1.5"
                              />
                              <circle cx="12" cy="12" r="2" fill="white" />
                            </svg>
                          </span>
                        )}
                        {alt.resonanceDelta > 0 && (
                          <span
                            style={{
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: 650,
                              color: 'rgba(169, 123, 143, 0.90)',
                              background: 'rgba(169, 123, 143, 0.10)',
                              border: '1px solid rgba(169, 123, 143, 0.20)',
                              borderRadius: '999px',
                              fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            +{alt.resonanceDelta}
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '2px' }}>
                              <circle cx="12" cy="7" r="3.5" stroke="rgba(169, 123, 143, 0.90)" strokeWidth="2" fill="none" />
                              <circle cx="7" cy="16" r="3.5" stroke="rgba(169, 123, 143, 0.90)" strokeWidth="2" fill="none" />
                              <circle cx="17" cy="16" r="3.5" stroke="rgba(169, 123, 143, 0.90)" strokeWidth="2" fill="none" />
                            </svg>
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
              <div style={{ marginBottom: '40px' }}>
                <label
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: BRAND.oliveInk,
                marginBottom: '10px',
                display: 'block',
                fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                letterSpacing: '0.01em',
              }}
            >
              Palette Selector <span style={{ color: 'rgba(67, 67, 43, 0.45)', fontWeight: 400, fontSize: '14px' }}>(Optional)</span>
            </label>

            {/* Info as subtitle */}
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(67, 67, 43, 0.55)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                marginBottom: '18px',
                lineHeight: '1.5',
              }}
            >
              Choose colors to personalize your report. Palette appears in your final analysis.
            </p>

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
                      background: 'rgba(255, 255, 255, 0.68)',
                      border: isSelected
                        ? '2px solid rgba(171, 171, 99, 0.55)'
                        : '1.5px solid rgba(67, 67, 43, 0.10)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 220ms ease',
                      boxShadow: isSelected
                        ? '0 8px 24px rgba(171, 171, 99, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.80)'
                        : '0 4px 16px rgba(67, 67, 43, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.80)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(171, 171, 99, 0.30)';
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
                        <span style={{ fontSize: '14px', color: 'rgba(171, 171, 99, 0.85)' }}>✓</span>
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
              {/* End Palette Selector */}
              
            </div>
            {/* End Left Column */}

            {/* Right Column - Moodboard */}
            <div style={{ flex: 1 }}>
              {/* Aesthetic Title */}
              {hasSubmittedAesthetic && aestheticInput && (
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: 400,
                    color: BRAND.oliveInk,
                    marginBottom: '24px',
                    fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  }}
                >
                  {aestheticInput}
                </h2>
              )}
              
              {/* Moodboard Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                }}
              >
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '12px',
                    background: 'linear-gradient(90deg, rgba(235, 232, 228, 0.4) 0%, rgba(245, 242, 238, 0.8) 50%, rgba(235, 232, 228, 0.4) 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'skeleton-loading 1.5s ease-in-out infinite',
                    border: '1.5px solid rgba(67, 67, 43, 0.06)',
                    boxShadow: '0 4px 16px rgba(67, 67, 43, 0.04)',
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
                  gridColumn: '1 / -1',
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
            {/* End Right Column */}
          </div>
          {/* End Two Column Layout */}
        </div>
        {/* End Content Area - Scrollable */}

        {/* Pulse - FIXED at bottom of viewport */}
        <div
            style={{
              position: 'fixed',
              bottom: '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: '1400px',
              width: 'calc(100% - 240px)', // Match main content padding
              display: 'flex',
              gap: '20px',
              alignItems: 'center',
              zIndex: 100,
            }}
          >
            {/* Pulse Container - Glassy with glow */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '16px 32px',
                backgroundColor: 'rgba(255, 255, 255, 0.65)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.50)',
                boxShadow: pulseUpdated
                  ? '0 20px 80px rgba(169, 123, 143, 0.40), 0 0 80px rgba(169, 123, 143, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.92)'
                  : '0 12px 48px rgba(67, 67, 43, 0.12), 0 0 40px rgba(169, 123, 143, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.92)',
                animation: (identityPulse || resonancePulse) 
                  ? pulseUpdated 
                    ? 'pulse-container-glow 2.5s ease-in-out, float-container 4s ease-in-out infinite'
                    : 'float-container 4s ease-in-out infinite'
                  : 'none',
                transition: 'all 800ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'rgba(67, 67, 43, 0.60)',
                  fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                }}
              >
                Pulse
              </span>

              {/* Individual Pulse Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              {/* Identity */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 18px',
                  background: identityPulse
                    ? 'rgba(125, 150, 172, 0.12)'
                    : 'rgba(67, 67, 43, 0.06)',
                  border: identityPulse 
                    ? '1px solid rgba(125, 150, 172, 0.20)'
                    : '1px solid rgba(67, 67, 43, 0.10)',
                  borderRadius: '999px',
                  transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: pulseUpdated && identityPulse ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" 
                    fill={BRAND.oliveInk}
                    stroke={BRAND.oliveInk}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="2" fill="white" />
                </svg>
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
                  padding: '10px 18px',
                  background: resonancePulse
                    ? 'rgba(169, 123, 143, 0.12)'
                    : 'rgba(67, 67, 43, 0.06)',
                  border: resonancePulse 
                    ? '1px solid rgba(169, 123, 143, 0.20)'
                    : '1px solid rgba(67, 67, 43, 0.10)',
                  borderRadius: '999px',
                  transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: pulseUpdated && resonancePulse ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="7" r="4" stroke={BRAND.oliveInk} strokeWidth="2" fill="none" />
                  <circle cx="7" cy="16" r="4" stroke={BRAND.oliveInk} strokeWidth="2" fill="none" />
                  <circle cx="17" cy="16" r="4" stroke={BRAND.oliveInk} strokeWidth="2" fill="none" />
                </svg>
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
                  padding: '10px 18px',
                  background: 'rgba(67, 67, 43, 0.04)',
                  border: '1px solid rgba(67, 67, 43, 0.08)',
                  borderRadius: '999px',
                  opacity: 0.5,
                  transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 8L8 6L12 8L16 6L20 8V16L16 18L12 16L8 18L4 16V8Z" 
                    stroke={BRAND.oliveInk} 
                    strokeWidth="2" 
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path d="M8 6V18M16 6V18" 
                    stroke={BRAND.oliveInk} 
                    strokeWidth="2" 
                    strokeLinecap="round"
                  />
                </svg>
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
            </div>

            {/* Lock Button - Glassy floating */}
            <button
              onClick={lockConcept}
              disabled={!identityPulse || !resonancePulse || conceptLocked}
              style={{
                padding: '18px 52px',
                fontSize: '14px',
                fontWeight: 650,
                color: conceptLocked ? 'rgba(125, 150, 172, 0.70)' : BRAND.steelBlue,
                background: 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: `1.5px solid ${
                  conceptLocked ? 'rgba(125, 150, 172, 0.28)' : 'rgba(125, 150, 172, 0.30)'
                }`,
                borderRadius: '999px',
                cursor:
                  !identityPulse || !resonancePulse || conceptLocked ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 8px 32px rgba(125, 150, 172, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
                opacity: !identityPulse || !resonancePulse || conceptLocked ? 0.55 : 1,
              }}
              onMouseEnter={(e) => {
                if (identityPulse && resonancePulse && !conceptLocked) {
                  e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.45)';
                  e.currentTarget.style.backgroundColor = 'rgba(125, 150, 172, 0.12)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 16px 48px rgba(125, 150, 172, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.95)';
                }
              }}
              onMouseLeave={(e) => {
                if (identityPulse && resonancePulse && !conceptLocked) {
                  e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.30)';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.72)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(125, 150, 172, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.95)';
                }
              }}
            >
              {conceptLocked ? '✓ Locked' : 'Lock'}
            </button>
          </div>
          {/* End Pulse Rail (Fixed Wrapper) */}
      </main>
    </div>
  );
}