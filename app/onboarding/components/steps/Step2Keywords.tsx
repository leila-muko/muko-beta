'use client';

import { useState } from 'react';
import keywordsData from '@/data/keywords.json';

interface StepProps {
  value: string[];
  onChange: (value: string[]) => void;
  onTensionContextChange: (context: string | null) => void;
}

export default function Step2Keywords({ value, onChange, onTensionContextChange }: StepProps) {
  const BRAND = {
    oliveInk: '#43432B',
    rose: '#A97B8F',
    steelBlue: '#7D96AC',
    chartreuse: '#ABAB63',
  };

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [detectedConflict, setDetectedConflict] = useState<string[] | null>(null);
  const [resolvedConflicts, setResolvedConflicts] = useState<Set<string>>(new Set()); // Track resolved conflicts

  // Create a unique key for a conflict pair
  const getConflictKey = (word1: string, word2: string) => {
    return [word1, word2].sort().join('|');
  };

  // Check if selecting a keyword would create a NEW unresolved conflict
  const checkForConflicts = (keyword: string, currentKeywords: string[]) => {
    const allKeywords = [...currentKeywords, keyword];
    
    for (const conflict of keywordsData.conflicts) {
      const [word1, word2] = conflict;
      if (allKeywords.includes(word1) && allKeywords.includes(word2)) {
        const conflictKey = getConflictKey(word1, word2);
        // Only return conflict if it hasn't been resolved yet
        if (!resolvedConflicts.has(conflictKey)) {
          return [word1, word2];
        }
      }
    }
    return null;
  };

  const handleKeywordToggle = (keyword: string) => {
    if (value.includes(keyword)) {
      // Remove keyword
      onChange(value.filter(k => k !== keyword));
    } else {
      // Check for conflicts before adding
      const conflict = checkForConflicts(keyword, value);
      if (conflict) {
        setDetectedConflict(conflict);
        setShowConflictModal(true);
        // Still add the keyword - they'll resolve the conflict
        onChange([...value, keyword]);
      } else {
        // No conflict, just add
        onChange([...value, keyword]);
      }
    }
  };

  const handleConflictResolved = (tensionContext: string) => {
    if (detectedConflict) {
      // Mark this specific conflict as resolved
      const conflictKey = getConflictKey(detectedConflict[0], detectedConflict[1]);
      setResolvedConflicts(prev => new Set(prev).add(conflictKey));
    }
    onTensionContextChange(tensionContext);
    setShowConflictModal(false);
  };

  const categories = [
    { name: 'Aesthetic', keywords: keywordsData.aesthetic },
    { name: 'Values', keywords: keywordsData.values },
    { name: 'Mood', keywords: keywordsData.mood },
  ];

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {/* Label */}
        <div style={{ textAlign: 'center' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 500,
              color: 'rgba(67, 67, 43, 0.50)',
              marginBottom: '12px',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            Select your brand DNA keywords
          </label>
          <p
            style={{
              fontSize: '14px',
              color: 'rgba(67, 67, 43, 0.50)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            Choose 3-8 keywords that best describe your brand
          </p>
        </div>

        {/* Keywords by category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {categories.map((category) => (
            <div key={category.name}>
              {/* Category label */}
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'rgba(67, 67, 43, 0.45)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  marginBottom: '16px',
                }}
              >
                {category.name}
              </div>

              {/* Keyword chips */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                {category.keywords.map((keyword) => {
                  const isSelected = value.includes(keyword);

                  return (
                    <button
                      key={keyword}
                      onClick={() => handleKeywordToggle(keyword)}
                      style={{
                        padding: '12px 24px',
                        fontSize: '15px',
                        fontWeight: isSelected ? 520 : 400,
                        color: isSelected ? BRAND.oliveInk : 'rgba(67, 67, 43, 0.65)',
                        backgroundColor: isSelected
                          ? 'rgba(125, 150, 172, 0.25)'
                          : 'rgba(255, 255, 255, 0.55)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: isSelected
                          ? '1px solid rgba(125, 150, 172, 0.35)'
                          : '1px solid rgba(67, 67, 43, 0.15)',
                        borderRadius: '999px',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
                        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isSelected
                          ? '0 4px 16px rgba(125, 150, 172, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.40)'
                          : '0 2px 8px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.60)',
                        transform: isSelected ? 'translateY(-1px)' : 'translateY(0)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(125, 150, 172, 0.15)';
                          e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.25)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow =
                            '0 4px 16px rgba(125, 150, 172, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.60)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.55)';
                          e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.15)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow =
                            '0 2px 8px rgba(67, 67, 43, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.60)';
                        }
                      }}
                    >
                      {keyword}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Selected count */}
        {value.length > 0 && (
          <div
            style={{
              fontSize: '14px',
              color: 'rgba(67, 67, 43, 0.50)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              textAlign: 'center',
            }}
          >
            {value.length} keyword{value.length !== 1 ? 's' : ''} selected
          </div>
        )}
      </div>

      {/* Conflict Modal */}
      {showConflictModal && detectedConflict && (
        <ConflictModal
          conflict={detectedConflict}
          onClose={() => setShowConflictModal(false)}
          onConfirm={handleConflictResolved}
        />
      )}
    </>
  );
}

// Conflict Modal Component (keep the same)
interface ConflictModalProps {
  conflict: string[];
  onClose: () => void;
  onConfirm: (tensionContext: string) => void;
}

function ConflictModal({ conflict, onClose, onConfirm }: ConflictModalProps) {
  const BRAND = {
    oliveInk: '#43432B',
    rose: '#A97B8F',
    steelBlue: '#7D96AC',
  };

  const [selected, setSelected] = useState<string | null>(null);

  const resolutionOptions = [
    {
      id: 'trend-aware-classics',
      label: 'Trend-aware classics',
      description: 'Timeless silhouettes in current colors',
    },
    {
      id: 'fast-moving-capsules',
      label: 'Fast-moving capsules',
      description: 'Trendy styles in neutral palettes',
    },
    {
      id: 'intentionally-hybrid',
      label: 'Intentionally hybrid',
      description: 'High-low mix',
    },
  ];

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(25, 25, 25, 0.40)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '48px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 24px 80px rgba(67, 67, 43, 0.20)',
          border: '1px solid rgba(67, 67, 43, 0.10)',
        }}
      >
        {/* Warning icon */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(169, 123, 143, 0.12)',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '28px' }}>⚠️</span>
          </div>

          <h3
            style={{
              fontSize: '22px',
              fontWeight: 520,
              color: BRAND.oliveInk,
              fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
              marginBottom: '8px',
            }}
          >
            Heads up
          </h3>

          <p
            style={{
              fontSize: '15px',
              color: 'rgba(67, 67, 43, 0.65)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              lineHeight: 1.6,
            }}
          >
            <span style={{ fontWeight: 600 }}>{conflict[0]}</span> and{' '}
            <span style={{ fontWeight: 600 }}>{conflict[1]}</span> can create tension.
          </p>
        </div>

        {/* Question */}
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'rgba(67, 67, 43, 0.60)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          Are you:
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {resolutionOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelected(option.id)}
              style={{
                padding: '16px 20px',
                textAlign: 'left',
                backgroundColor: selected === option.id
                  ? 'rgba(125, 150, 172, 0.15)'
                  : 'rgba(255, 255, 255, 0.60)',
                border: selected === option.id
                  ? '1.5px solid rgba(125, 150, 172, 0.35)'
                  : '1.5px solid rgba(67, 67, 43, 0.12)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
              }}
              onMouseEnter={(e) => {
                if (selected !== option.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(125, 150, 172, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.20)';
                }
              }}
              onMouseLeave={(e) => {
                if (selected !== option.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.60)';
                  e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.12)';
                }
              }}
            >
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 500,
                  color: BRAND.oliveInk,
                  marginBottom: '4px',
                }}
              >
                {option.label}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'rgba(67, 67, 43, 0.55)',
                }}
              >
                {option.description}
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px 24px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(67, 67, 43, 0.65)',
              backgroundColor: 'transparent',
              border: '1.5px solid rgba(67, 67, 43, 0.20)',
              borderRadius: '999px',
              cursor: 'pointer',
              fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
              letterSpacing: '0.05em',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(67, 67, 43, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.30)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(67, 67, 43, 0.20)';
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={!selected}
            style={{
              flex: 1,
              padding: '14px 24px',
              fontSize: '14px',
              fontWeight: 600,
              color: selected ? BRAND.steelBlue : 'rgba(67, 67, 43, 0.30)',
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              border: selected
                ? '1.5px solid rgba(125, 150, 172, 0.42)'
                : '1.5px solid rgba(67, 67, 43, 0.12)',
              borderRadius: '999px',
              cursor: selected ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-sohne-breit), system-ui, sans-serif',
              letterSpacing: '0.05em',
              transition: 'all 200ms ease',
              opacity: selected ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (selected) {
                e.currentTarget.style.backgroundColor = 'rgba(125, 150, 172, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.55)';
              }
            }}
            onMouseLeave={(e) => {
              if (selected) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(125, 150, 172, 0.42)';
              }
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}