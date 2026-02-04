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
  
  // 🆕 NEW: Moodboard state
  const [moodboardImages, setMoodboardImages] = useState<string[]>([]);
  const [matchedAestheticFolder, setMatchedAestheticFolder] = useState<string | null>(null);

  // 🆕 NEW: Aesthetic matching helper
  const matchAestheticToFolder = (input: string): string | null => {
    const normalized = input.toLowerCase().trim();
    
    const aestheticMap: Record<string, string> = {
      'poetcore': 'poetcore',
      'poet': 'poetcore',
      'academic': 'poetcore',
      'bookish': 'poetcore',
      'literary': 'poetcore',
      
      'rugged luxury': 'rugged-luxury',
      'rugged': 'rugged-luxury',
      'gorpcore': 'rugged-luxury',
      'outdoor': 'rugged-luxury',
      
      'glamoratti': 'glamoratti',
      '80s': 'glamoratti',
      'eighties': 'glamoratti',
      'power suit': 'glamoratti',
      'maximal': 'glamoratti',
      
      'refined clarity': 'refined-clarity',
      'minimalist': 'refined-clarity',
      'minimal': 'refined-clarity',
      'quiet luxury': 'refined-clarity',
      
      'modern craft': 'modern-craft',
      'afro bohemian': 'modern-craft',
      'heritage': 'modern-craft',
      'artisan': 'modern-craft',
      'sustainable': 'modern-craft',
      
      'indie chic grunge': 'indie-chic-grunge',
      'indie grunge': 'indie-chic-grunge',
      'grunge': 'indie-chic-grunge',
      '2016': 'indie-chic-grunge',
      'indie sleaze': 'indie-chic-grunge',
      
      'gummy aesthetic': 'gummy-aesthetic',
      'gummy': 'gummy-aesthetic',
      'jelly': 'gummy-aesthetic',
      'squishy': 'gummy-aesthetic',
      'glossy': 'gummy-aesthetic',
      
      'cult of cute': 'cult-of-cute',
      'kawaii': 'cult-of-cute',
      'cute': 'cult-of-cute',
      'playful': 'cult-of-cute',
    };
    
    // Try exact match
    if (normalized in aestheticMap) {
      return aestheticMap[normalized];
    }
    
    // Try partial match
    for (const [keyword, folder] of Object.entries(aestheticMap)) {
      if (normalized.includes(keyword) || keyword.includes(normalized)) {
        return folder;
      }
    }
    
    return null;
  };

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

  // 🆕 NEW: Load moodboard images when aesthetic input changes
  useEffect(() => {
    if (!aestheticInput || aestheticInput.length < 3) {
      setMoodboardImages([]);
      setMatchedAestheticFolder(null);
      return;
    }

    const folder = matchAestheticToFolder(aestheticInput);
    
    if (folder) {
      // Load 9 random images from this aesthetic
      const allImages = Array.from({ length: 10 }, (_, i) => 
        `/images/aesthetics/${folder}/${i + 1}.jpg`
      );
      
      // Shuffle and take 9
      const shuffled = allImages.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 9);
      
      setMoodboardImages(selected);
      setMatchedAestheticFolder(folder);
    } else {
      setMoodboardImages([]);
      setMatchedAestheticFolder(null);
    }
  }, [aestheticInput]);

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
      }}
    >
      {/* Main Content */}
      <main style={{ flex: 1, paddingLeft: '120px', position: 'relative' }}>
        {/* Content Area - Scrollable */}
        <div
          style={{
            padding: '120px 120px 180px',
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '48px' }}>
            <h1
              style={{
                fontSize: '42px',
                fontWeight: 400,
                color: BRAND.oliveInk,
                marginBottom: '12px',
                fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              Concept Studio
            </h1>
            <p
              style={{
                fontSize: '15px',
                color: 'rgba(67, 67, 43, 0.55)',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
              }}
            >
              Define your aesthetic direction. Identity and Resonance will update in real-time.
            </p>
          </div>

          {/* Two Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '45fr 55fr', gap: '60px' }}>
            {/* Left Column - Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Aesthetic Direction Section */}
              <div>
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
              Enter the aesthetic you'd like to explore. Identity and Resonance will update as you type.
            </p>

            {/* Input or Button */}
            {!inputExpanded ? (
              <button
                onClick={() => setInputExpanded(true)}
                style={{
                  width: '100%',
                  padding: '22px 28px',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'rgba(67, 67, 43, 0.55)',
                  background: 'rgba(255, 255, 255, 0.68)',
                  border: '1.5px solid rgba(67, 67, 43, 0.14)',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 220ms ease',
                  textAlign: 'left',
                  boxShadow: '0 4px 16px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.80)',
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
                  placeholder="e.g., Poetcore, Glamoratti, Gummy..."
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
                      setAestheticInput(alt.alternative);
                      setHasSubmittedAesthetic(true);
                    }}
                    style={{
                      padding: '16px 20px',
                      textAlign: 'left',
                      background: 'rgba(255, 255, 255, 0.72)',
                      border: '1.5px solid rgba(125, 150, 172, 0.18)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 16px rgba(125, 150, 172, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.75)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.30)';
                      e.currentTarget.style.backgroundColor = 'rgba(125, 150, 172, 0.06)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(125, 150, 172, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.75)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.18)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.72)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(125, 150, 172, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.75)';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: BRAND.oliveInk,
                          fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                        }}
                      >
                        {alt.alternative}
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
                                strokeLinejoin="round"
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
              
              {/* 🆕 UPDATED: Moodboard Grid with Real Images */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                }}
              >
                {moodboardImages.length > 0 ? (
                  // Show real images with fade-in animation
                  moodboardImages.map((imageSrc, i) => (
                    <div
                      key={`${matchedAestheticFolder}-${i}`}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1.5px solid rgba(67, 67, 43, 0.08)',
                        boxShadow: '0 4px 16px rgba(67, 67, 43, 0.06)',
                        position: 'relative',
                        transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                        animation: `fadeIn 400ms ease-out ${i * 50}ms both`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.03)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(67, 67, 43, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(67, 67, 43, 0.06)';
                      }}
                    >
                      <img
                        src={imageSrc}
                        alt={`${aestheticInput} moodboard ${i + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        loading="lazy"
                      />
                      {/* Subtle overlay */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.1), transparent)',
                          pointerEvents: 'none',
                        }}
                      />
                    </div>
                  ))
                ) : (
                  // Show skeleton placeholders if no match
                  Array.from({ length: 9 }).map((_, i) => (
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
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          style={{ opacity: 0.15 }}
                        >
                          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                          <rect x="13" y="3" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                          <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
                          <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 🆕 NEW: Aesthetic match indicator */}
              {matchedAestheticFolder && moodboardImages.length > 0 && (
                <div
                  style={{
                    marginTop: '16px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(171, 171, 99, 0.08)',
                      border: '1px solid rgba(171, 171, 99, 0.12)',
                      borderRadius: '999px',
                      display: 'inline-block',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'rgba(67, 67, 43, 0.65)',
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        letterSpacing: '0.02em',
                      }}
                    >
                      ✓ Visual reference loaded
                    </span>
                  </div>
                </div>
              )}

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
            <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
            }}
          >
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