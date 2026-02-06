'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { BRAND, AESTHETICS, TOP_SUGGESTED, AESTHETIC_CONTENT } from '../../lib/concept-studio/constants';
import { seededShuffle, matchAestheticToFolder, interpretRefine, generateMukoInsight } from '../../lib/concept-studio/utils';
import { IconIdentity, IconResonance } from '../../components/concept-studio/Icons';
import { PulseRail } from '../../components/concept-studio/PulseRail';

type Confidence = 'high' | 'med' | 'low';

type Interpretation = {
  base: string;
  modifiers: string[];
  note: string;
  confidence: Confidence;
  unsupportedHits: string[];
};

export default function ConceptStudioPage() {
  const {
    season,
    aestheticInput,
    setAestheticInput,
    identityPulse,
    resonancePulse,
    conceptLocked,
    lockConcept,
    setCurrentStep,
  } = useSessionStore();

  // Header: Collection · Season
  const [headerCollectionName, setHeaderCollectionName] = useState<string>('Collection');
  const [headerSeasonLabel, setHeaderSeasonLabel] = useState<string>(season || '—');

  useEffect(() => {
    setCurrentStep(2);
  }, [setCurrentStep]);

  useEffect(() => {
    try {
      const n = window.localStorage.getItem('muko_collectionName');
      const s = window.localStorage.getItem('muko_seasonLabel');
      if (n) setHeaderCollectionName(n);
      if (s) setHeaderSeasonLabel(s);
      else setHeaderSeasonLabel(season || '—');
    } catch {
      setHeaderSeasonLabel(season || '—');
    }
  }, [season]);

  // Chips: show 6 + show more
  const [showAllAesthetics, setShowAllAesthetics] = useState(false);

  // Hover: stable stage
  const [hoveredAesthetic, setHoveredAesthetic] = useState<string | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);

  const openHover = (aesthetic: string) => {
    if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
    setHoveredAesthetic(aesthetic);
  };

  const closeHoverSoft = () => {
    if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = window.setTimeout(() => setHoveredAesthetic(null), 110);
  };

  // Selected vs preview aesthetic
  const selectedAesthetic = AESTHETICS.includes(aestheticInput as any) ? aestheticInput : null;
  const previewAesthetic = hoveredAesthetic || selectedAesthetic || '';
  const moodboardTitle = previewAesthetic || '';

  // Guided expression: refine input + interpretation
  const [refineText, setRefineText] = useState('');
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);

  // Accept / Adjust (only for low-confidence)
  const [acceptedInterpretation, setAcceptedInterpretation] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [baseOverride, setBaseOverride] = useState<string | null>(null);
  const refineInputRef = useRef<HTMLInputElement | null>(null);

  // When selection changes, reset refine + accept state
  useEffect(() => {
    if (!selectedAesthetic) {
      setRefineText('');
      setInterpretation(null);
      setAcceptedInterpretation(false);
      setShowAdjust(false);
      setBaseOverride(null);
      return;
    }

    setRefineText(`${selectedAesthetic}, but…`);
    setInterpretation({
      base: selectedAesthetic,
      modifiers: [],
      note: `Interpreting this as: ${selectedAesthetic}`,
      confidence: 'high',
      unsupportedHits: [],
    });

    setAcceptedInterpretation(false);
    setShowAdjust(false);
    setBaseOverride(null);
  }, [selectedAesthetic]);

  // Any typing un-accepts and closes the adjust panel
  useEffect(() => {
    if (!selectedAesthetic) return;
    setAcceptedInterpretation(false);
    setShowAdjust(false);
    setBaseOverride(null);
  }, [refineText, selectedAesthetic]);

  // Moodboard images
  const [moodboardImages, setMoodboardImages] = useState<string[]>([]);
  const [matchedAestheticFolder, setMatchedAestheticFolder] = useState<string | null>(null);

  // Active modifiers only apply when previewing the selected aesthetic (not when hovering other chips)
  const activeModifiers =
    previewAesthetic && selectedAesthetic && previewAesthetic === selectedAesthetic ? interpretation?.modifiers ?? [] : [];

  const moodboardSeedKey = `${previewAesthetic}::${activeModifiers.join('|')}`;

  useEffect(() => {
    if (!previewAesthetic || previewAesthetic.length < 2) {
      setMoodboardImages([]);
      setMatchedAestheticFolder(null);
      return;
    }

    const folder = matchAestheticToFolder(previewAesthetic);
    if (!folder) {
      setMoodboardImages([]);
      setMatchedAestheticFolder(null);
      return;
    }

    const allImages = Array.from({ length: 10 }, (_, i) => `/images/aesthetics/${folder}/${i + 1}.jpg`);
    const shuffled = seededShuffle(allImages, moodboardSeedKey);
    setMoodboardImages(shuffled.slice(0, 9));
    setMatchedAestheticFolder(folder);
  }, [previewAesthetic, moodboardSeedKey]);

  // Pulse animation
  const [pulseUpdated, setPulseUpdated] = useState(false);

  useEffect(() => {
    if (identityPulse || resonancePulse) {
      setPulseUpdated(true);
      const timer = setTimeout(() => setPulseUpdated(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [identityPulse?.score, resonancePulse?.score]);

  // Selecting aesthetic sets input + mock pulse
  const handleSelectAesthetic = (aesthetic: string) => {
    // Clear hover so selected state doesn't "fight" hover visuals
    setHoveredAesthetic(null);

    setAestheticInput(aesthetic);

    const base = AESTHETIC_CONTENT[aesthetic];
    const mockIdentity = base?.identityScore ?? Math.floor(Math.random() * 30) + 70;
    const mockResonance = base?.resonanceScore ?? Math.floor(Math.random() * 30) + 65;

    const identityStatus = mockIdentity >= 80 ? 'green' : mockIdentity >= 60 ? 'yellow' : 'red';
    const resonanceStatus = mockResonance >= 80 ? 'green' : mockResonance >= 60 ? 'yellow' : 'red';

    useSessionStore.setState({
      identityPulse: {
        score: mockIdentity,
        status: identityStatus,
        message:
          identityStatus === 'green' ? 'Strong alignment' : identityStatus === 'yellow' ? 'Moderate alignment' : 'Weak alignment',
      },
      resonancePulse: {
        score: mockResonance,
        status: resonanceStatus,
        message:
          resonanceStatus === 'green'
            ? 'Strong opportunity'
            : resonanceStatus === 'yellow'
              ? 'Moderate opportunity'
              : 'Saturated market',
      },
    });
  };

  // Debounced interpretation -> small pulse nudge (demo causality)
  useEffect(() => {
    if (!selectedAesthetic) return;

    const timer = window.setTimeout(() => {
      const base = baseOverride ?? selectedAesthetic;
      const interp = interpretRefine(base, refineText);
      setInterpretation(interp);

      const baseScores = AESTHETIC_CONTENT[base];
      if (!baseScores) return;

      // tiny, believable deltas
      const identityDelta =
        (interp.modifiers.includes('Raw') ? 2 : 0) +
        (interp.modifiers.includes('Sculptural') ? 1 : 0) +
        (interp.modifiers.includes('Polished') ? -1 : 0);

      const resonanceDelta =
        (interp.modifiers.includes('Playful') ? 2 : 0) +
        (interp.modifiers.includes('Utility') ? 1 : 0) +
        (interp.modifiers.includes('Nostalgic') ? -1 : 0);

      const newIdentity = Math.max(0, Math.min(100, baseScores.identityScore + identityDelta));
      const newResonance = Math.max(0, Math.min(100, baseScores.resonanceScore + resonanceDelta));

      useSessionStore.setState({
        identityPulse: {
          score: newIdentity,
          status: newIdentity >= 80 ? 'green' : newIdentity >= 60 ? 'yellow' : 'red',
          message: '',
        },
        resonancePulse: {
          score: newResonance,
          status: newResonance >= 80 ? 'green' : newResonance >= 60 ? 'yellow' : 'red',
          message: '',
        },
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [refineText, selectedAesthetic, baseOverride]);

  // Confirm direction (reconfirm if user changes input)
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedKey, setConfirmedKey] = useState<string>('');

  const effectiveConfirmKey = `${selectedAesthetic ?? ''}::${refineText ?? ''}::${baseOverride ?? ''}`;

  useEffect(() => {
    if (!isConfirmed) return;
    if (confirmedKey && effectiveConfirmKey !== confirmedKey) {
      setIsConfirmed(false);
      try {
        useSessionStore.setState({ conceptLocked: false });
      } catch {}
    }
  }, [effectiveConfirmKey, confirmedKey, isConfirmed]);

  const lowConfidenceNeedsAccept = interpretation?.confidence === 'low' && !acceptedInterpretation;
  const canConfirm = Boolean(selectedAesthetic && identityPulse && resonancePulse && interpretation && !lowConfidenceNeedsAccept);

  const handleConfirmClick = () => {
    if (!canConfirm) return;

    setIsConfirmed(true);
    setConfirmedKey(effectiveConfirmKey);

    try {
      lockConcept?.();
    } catch {}
    try {
      useSessionStore.setState({ conceptLocked: true });
    } catch {}
  };

  const canContinue = isConfirmed;

  // Pulse rail null-safe
  const identityScore = identityPulse?.score;
  const resonanceScore = resonancePulse?.score;

  const identityColor =
    typeof identityScore === 'number'
      ? identityScore >= 80
        ? BRAND.chartreuse
        : identityScore >= 60
          ? BRAND.rose
          : '#C19A6B'
      : 'rgba(67, 67, 43, 0.75)';

  const resonanceColor =
    typeof resonanceScore === 'number'
      ? resonanceScore >= 80
        ? BRAND.chartreuse
        : resonanceScore >= 60
          ? BRAND.rose
          : '#C19A6B'
      : 'rgba(67, 67, 43, 0.75)';

  // Match input width to chip section
  const chipSectionRef = useRef<HTMLDivElement>(null);
  const [chipSectionWidth, setChipSectionWidth] = useState<number | null>(null);

  useEffect(() => {
    if (chipSectionRef.current) {
      setChipSectionWidth(chipSectionRef.current.offsetWidth);
    }
  }, [showAllAesthetics]);

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', position: 'relative' }}>
      <main style={{ flex: 1, paddingLeft: '120px', position: 'relative' }}>
        <div style={{ padding: '120px 120px 180px', maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h1
              style={{
                fontSize: '42px',
                fontWeight: 600,
                color: BRAND.oliveInk,
                margin: 0,
                fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              Concept Studio
            </h1>

            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <button
                onClick={() => window.history.back()}
                style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: 'rgba(169, 123, 143, 0.85)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  letterSpacing: '0.01em',
                }}
              >
                ← Back
              </button>

              <button
                onClick={() => console.log('Save & Close')}
                style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: 'rgba(169, 123, 143, 0.85)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  letterSpacing: '0.01em',
                }}
              >
                Save &amp; Close
              </button>
            </div>
          </div>

          {/* Collection · Season (bold) */}
          <div
            style={{
              fontSize: '14px',
              fontWeight: 650,
              color: 'rgba(67, 67, 43, 0.70)',
              fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
              marginBottom: '10px',
            }}
          >
            {headerCollectionName} <span style={{ padding: '0 8px', opacity: 0.55 }}>·</span> {headerSeasonLabel}
          </div>

          <p
            style={{
              fontSize: '15px',
              color: 'rgba(67, 67, 43, 0.55)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              marginBottom: '48px',
            }}
          >
            Choose a direction, then speak naturally. We'll interpret identity, resonance, and execution readiness.
          </p>

          {/* Two Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '45fr 55fr', gap: '60px' }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div>
                <label
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: BRAND.oliveInk,
                    marginBottom: '10px',
                    display: 'block',
                    fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  }}
                >
                  Aesthetic Direction
                </label>

                <p
                  style={{
                    fontSize: '13px',
                    color: 'rgba(67, 67, 43, 0.55)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    marginBottom: '18px',
                    lineHeight: '1.5',
                  }}
                >
                  Start with a supported direction. You'll be able to refine this with descriptive language.
                </p>

                <div
                  ref={chipSectionRef}
                  onMouseLeave={closeHoverSoft}
                  onMouseEnter={() => {
                    if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
                  }}
                  style={{ position: 'relative', borderRadius: '18px', minHeight: showAllAesthetics ? 248 : 218 }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(showAllAesthetics ? AESTHETICS : AESTHETICS.slice(0, 6)).map((aesthetic) => {
                      const isSuggested = TOP_SUGGESTED.includes(aesthetic);
                      const isSelected = aestheticInput === aesthetic;
                      const isHovered = hoveredAesthetic === aesthetic;
                      const isExpanded = isHovered || isSelected;
                      const content = AESTHETIC_CONTENT[aesthetic];

                      const suggestedGlow = isSuggested
                        ? '0 10px 32px rgba(169, 123, 143, 0.18), 0 0 18px rgba(169, 123, 143, 0.16), inset 0 1px 0 rgba(255,255,255,0.92)'
                        : '0 4px 14px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255,255,255,0.88)';

                      const emphasizeScores = isExpanded;
                      const scoreTextStyle: React.CSSProperties = {
                        fontSize: emphasizeScores ? '14px' : '13px',
                        fontWeight: emphasizeScores ? 650 : 520,
                        color: emphasizeScores ? 'rgba(67, 67, 43, 0.92)' : 'rgba(67, 67, 43, 0.52)',
                        fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                        transition: 'all 220ms ease',
                      };
                      const scoreIconWrapStyle: React.CSSProperties = {
                        opacity: emphasizeScores ? 1 : 0.70,
                        transition: 'opacity 220ms ease',
                        display: 'flex',
                        alignItems: 'center',
                      };

                      return (
                        <button
                          key={aesthetic}
                          onClick={() => handleSelectAesthetic(aesthetic)}
                          onMouseEnter={() => openHover(aesthetic)}
                          onMouseLeave={closeHoverSoft}
                          style={{
                            padding: isExpanded ? '20px 22px' : '14px 18px',
                            fontSize: isExpanded ? '15px' : '14px',
                            fontWeight: isExpanded ? 600 : 500,
                            color: isExpanded ? BRAND.oliveInk : 'rgba(67, 67, 43, 0.78)',
                            background: isExpanded ? '#FFFFFF' : 'rgba(255, 255, 255, 0.86)',

                            // Hover wins visually over selected
                            border: isHovered
                              ? '1.5px solid rgba(125, 150, 172, 0.22)'
                              : isSelected
                                ? `1.5px solid rgba(171, 171, 99, 0.70)`
                                : '1.5px solid rgba(67, 67, 43, 0.12)',

                            borderRadius: isExpanded ? '16px' : '999px',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                            transition: 'all 280ms cubic-bezier(0.4, 0, 0.2, 1)',

                            boxShadow: isHovered
                              ? '0 12px 40px rgba(125, 150, 172, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.95)'
                              : isSelected
                                ? '0 10px 34px rgba(171, 171, 99, 0.16), inset 0 1px 0 rgba(255,255,255,0.95)'
                                : suggestedGlow,

                            display: 'flex',
                            flexDirection: isExpanded ? 'column' : 'row',
                            alignItems: isExpanded ? 'flex-start' : 'center',
                            justifyContent: 'space-between',
                            gap: isExpanded ? '14px' : '12px',
                            width: '100%',
                            textAlign: 'left',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              gap: '12px',
                            }}
                          >
                            <span>{aesthetic}</span>

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                              {isSuggested && !isExpanded && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 650,
                                    color: 'rgba(169, 123, 143, 0.72)',
                                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                                    marginRight: 4,
                                  }}
                                >
                                  Suggested
                                </span>
                              )}

                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={scoreIconWrapStyle}>
                                  <IconIdentity size={16} />
                                </span>
                                <span style={scoreTextStyle}>{content?.identityScore ?? '—'}</span>
                              </div>

                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={scoreIconWrapStyle}>
                                  <IconResonance size={16} />
                                </span>
                                <span style={scoreTextStyle}>{content?.resonanceScore ?? '—'}</span>
                              </div>
                            </div>
                          </div>

                          {isExpanded && content && (
                            <div
                              style={{
                                fontSize: '13px',
                                lineHeight: 1.55,
                                color: 'rgba(67, 67, 43, 0.70)',
                                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                                width: '100%',
                              }}
                            >
                              <div>{content.description}</div>

                              <div
                                style={{
                                  marginTop: 12,
                                  paddingTop: 12,
                                  borderTop: '1px solid rgba(67, 67, 43, 0.10)',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(67, 67, 43, 0.45)',
                                    fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                                    marginBottom: 6,
                                  }}
                                >
                                  Muko Insight
                                </div>

                                <div
                                  style={{
                                    fontSize: 13,
                                    color: 'rgba(67, 67, 43, 0.72)',
                                    lineHeight: 1.55,
                                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                                  }}
                                >
                                  {generateMukoInsight(content.identityScore, content.resonanceScore)}
                                </div>
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {!showAllAesthetics && (
                    <button
                      onClick={() => setShowAllAesthetics(true)}
                      style={{
                        marginTop: '14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'rgba(67, 67, 43, 0.55)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        padding: 0,
                      }}
                    >
                      Show more
                    </button>
                  )}
                </div>
              </div>

              {/* Guided free expression — only after selection */}
              {selectedAesthetic && (
                <div>
                  <label
                    style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: BRAND.oliveInk,
                      marginBottom: '10px',
                      display: 'block',
                      fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                    }}
                  >
                    Refine the direction{' '}
                    <span style={{ color: 'rgba(67, 67, 43, 0.45)', fontWeight: 400, fontSize: '14px' }}>(optional)</span>
                  </label>

                  <input
                    ref={refineInputRef}
                    type="text"
                    value={refineText}
                    onChange={(e) => setRefineText(e.target.value)}
                    placeholder="Add texture, mood, references, or constraints"
                    style={{
                      width: chipSectionWidth ? `${chipSectionWidth}px` : '100%',
                      padding: '18px 22px',
                      fontSize: '15px',
                      color: BRAND.oliveInk,
                      background: 'rgba(255, 255, 255, 0.72)',
                      border: '1.5px solid rgba(67, 67, 43, 0.12)',
                      borderRadius: '14px',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      outline: 'none',
                      boxShadow: '0 6px 18px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.84)',
                    }}
                  />

                  {interpretation?.note && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        color: 'rgba(67, 67, 43, 0.55)',
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        lineHeight: 1.4,
                      }}
                    >
                      {interpretation.note}
                    </div>
                  )}

                  {/* Accept / Adjust (only when confidence is low) */}
                  {interpretation?.confidence === 'low' && !acceptedInterpretation && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          setAcceptedInterpretation(true);
                          setShowAdjust(false);
                        }}
                        style={{
                          padding: '8px 12px',
                          fontSize: 12,
                          fontWeight: 650,
                          color: 'rgba(67, 67, 43, 0.78)',
                          background: 'rgba(255, 255, 255, 0.75)',
                          border: '1px solid rgba(67, 67, 43, 0.14)',
                          borderRadius: 999,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                          boxShadow: '0 6px 18px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255,255,255,0.88)',
                        }}
                      >
                        Accept interpretation
                      </button>

                      <button
                        onClick={() => {
                          setShowAdjust(true);
                          window.setTimeout(() => refineInputRef.current?.focus(), 50);
                        }}
                        style={{
                          padding: '8px 12px',
                          fontSize: 12,
                          fontWeight: 650,
                          color: 'rgba(125, 150, 172, 0.92)',
                          background: 'rgba(125, 150, 172, 0.10)',
                          border: '1px solid rgba(125, 150, 172, 0.22)',
                          borderRadius: 999,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                          boxShadow: '0 6px 18px rgba(125, 150, 172, 0.10), inset 0 1px 0 rgba(255,255,255,0.88)',
                        }}
                      >
                        Adjust
                      </button>

                      <span
                        style={{
                          fontSize: 12,
                          color: 'rgba(67, 67, 43, 0.45)',
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        }}
                      >
                        No worries — we'll keep things fluid.
                      </span>
                    </div>
                  )}

                  {showAdjust && interpretation?.confidence === 'low' && !acceptedInterpretation && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '12px 14px',
                        borderRadius: 14,
                        background: 'rgba(255, 255, 255, 0.68)',
                        border: '1px solid rgba(67, 67, 43, 0.12)',
                        boxShadow: '0 10px 28px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255,255,255,0.90)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 650,
                          color: 'rgba(67, 67, 43, 0.70)',
                          fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                          marginBottom: 8,
                        }}
                      >
                        Adjust interpretation
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: 12,
                            color: 'rgba(67, 67, 43, 0.55)',
                            fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          }}
                        >
                          Closest base:
                        </span>

                        <select
                          value={baseOverride ?? selectedAesthetic ?? ''}
                          onChange={(e) => setBaseOverride(e.target.value)}
                          style={{
                            padding: '8px 10px',
                            fontSize: 12,
                            fontWeight: 650,
                            color: 'rgba(67, 67, 43, 0.78)',
                            background: 'rgba(255,255,255,0.85)',
                            border: '1px solid rgba(67, 67, 43, 0.14)',
                            borderRadius: 10,
                            fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                            outline: 'none',
                          }}
                        >
                          {AESTHETICS.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => {
                            const nextBase = baseOverride ?? selectedAesthetic;
                            if (nextBase && nextBase !== selectedAesthetic) {
                              handleSelectAesthetic(nextBase);
                            }
                            setAcceptedInterpretation(true);
                            setShowAdjust(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: 650,
                            color: 'rgba(67, 67, 43, 0.78)',
                            background: 'rgba(171, 171, 99, 0.12)',
                            border: '1px solid rgba(171, 171, 99, 0.32)',
                            borderRadius: 999,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* If accepted, gently indicate resolution */}
                  {interpretation?.confidence === 'low' && acceptedInterpretation && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        color: 'rgba(67, 67, 43, 0.45)',
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      }}
                    >
                      Interpretation accepted — you can keep refining anytime.
                    </div>
                  )}
                </div>
              )}

              {/* Confirm direction */}
              <div style={{ marginTop: '2px' }}>
                <button
                  onClick={handleConfirmClick}
                  disabled={!canConfirm || isConfirmed}
                  style={{
                    fontSize: '16px',
                    fontWeight: 650,
                    color: isConfirmed ? BRAND.chartreuse : 'rgba(125, 150, 172, 0.85)',
                    background: isConfirmed ? 'rgba(171, 171, 99, 0.12)' : 'transparent',
                    border: 'none',
                    borderRadius: isConfirmed ? '8px' : '0',
                    padding: isConfirmed ? '8px 12px' : '0',
                    cursor: !canConfirm || isConfirmed ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    opacity: !canConfirm ? 0.55 : 1,
                    transition: 'all 220ms ease',
                  }}
                  title={lowConfidenceNeedsAccept ? 'Accept or adjust the interpretation to continue.' : undefined}
                >
                  {isConfirmed ? 'Concept defined ✓' : 'Confirm direction'}
                </button>

                <div
                  style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    color: 'rgba(67, 67, 43, 0.45)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  }}
                >
                  If you edit the direction, you'll confirm again.
                </div>
              </div>
            </div>

            {/* Right Column - Moodboard */}
            <div style={{ flex: 1 }}>
              {moodboardTitle ? (
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: 400,
                    color: BRAND.oliveInk,
                    marginBottom: '22px',
                    fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {moodboardTitle}
                </h2>
              ) : (
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: 400,
                    color: 'rgba(67, 67, 43, 0.40)',
                    marginBottom: '22px',
                    fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                  }}
                >
                  Hover an aesthetic to preview
                </h2>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {moodboardImages.length > 0 ? (
                  moodboardImages.map((src, i) => (
                    <div
                      key={`${matchedAestheticFolder}-${i}`}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1.5px solid rgba(67, 67, 43, 0.08)',
                        boxShadow: '0 4px 16px rgba(67, 67, 43, 0.06)',
                        position: 'relative',
                        transition: 'all 360ms cubic-bezier(0.4, 0, 0.2, 1)',
                        animation: `fadeIn 360ms ease-out ${i * 40}ms both`,
                      }}
                    >
                      <img
                        src={src}
                        alt={`${previewAesthetic} moodboard ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.10), transparent)' }} />
                    </div>
                  ))
                ) : (
                  Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '12px',
                        background:
                          'linear-gradient(90deg, rgba(235, 232, 228, 0.4) 0%, rgba(245, 242, 238, 0.8) 50%, rgba(235, 232, 228, 0.4) 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'skeleton-loading 1.5s ease-in-out infinite',
                        border: '1.5px solid rgba(67, 67, 43, 0.06)',
                        boxShadow: '0 4px 16px rgba(67, 67, 43, 0.04)',
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom rail + Continue */}
          <PulseRail
            identityScore={identityScore}
            resonanceScore={resonanceScore}
            identityColor={identityColor}
            resonanceColor={resonanceColor}
            pulseUpdated={pulseUpdated}
            canContinue={canContinue}
            onContinue={() => {
              if (!canContinue) return;
              setCurrentStep(3);
              console.log('Continue to Spec Studio');
            }}
          />

          <style>{`
            @keyframes skeleton-loading {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(6px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      </main>
    </div>
  );
}
