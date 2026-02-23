'use client';

import { useState } from 'react';
import keywordsData from '@/data/keywords.json';
import { BRAND } from '@/lib/concept-studio/constants';

const OLIVE = BRAND.oliveInk;
const STEEL = BRAND.steelBlue;
const CHARTREUSE = '#A8B475';
const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

interface StepProps {
  value: string[];
  onChange: (value: string[]) => void;
  onTensionContextChange: (context: string | null) => void;
}

export default function Step2Keywords({ value, onChange, onTensionContextChange }: StepProps) {
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [detectedConflict, setDetectedConflict] = useState<string[] | null>(null);
  const [resolvedConflicts, setResolvedConflicts] = useState<Set<string>>(new Set());

  const getConflictKey = (word1: string, word2: string) => {
    return [word1, word2].sort().join('|');
  };

  const checkForConflicts = (keyword: string, currentKeywords: string[]) => {
    const allKeywords = [...currentKeywords, keyword];
    for (const conflict of keywordsData.conflicts) {
      const [word1, word2] = conflict;
      if (allKeywords.includes(word1) && allKeywords.includes(word2)) {
        const conflictKey = getConflictKey(word1, word2);
        if (!resolvedConflicts.has(conflictKey)) {
          return [word1, word2];
        }
      }
    }
    return null;
  };

  const handleKeywordToggle = (keyword: string) => {
    if (value.includes(keyword)) {
      onChange(value.filter((k) => k !== keyword));
    } else {
      const conflict = checkForConflicts(keyword, value);
      if (conflict) {
        setDetectedConflict(conflict);
        setShowConflictModal(true);
        onChange([...value, keyword]);
      } else {
        onChange([...value, keyword]);
      }
    }
  };

  const handleConflictResolved = (tensionContext: string) => {
    if (detectedConflict) {
      const conflictKey = getConflictKey(detectedConflict[0], detectedConflict[1]);
      setResolvedConflicts((prev) => new Set(prev).add(conflictKey));
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Section header */}
        <div>
          <div
            style={{
              fontFamily: sohne,
              fontSize: 15,
              fontWeight: 500,
              color: OLIVE,
              marginBottom: 6,
            }}
          >
            Select your brand DNA keywords
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 12,
              fontStyle: 'italic',
              color: 'rgba(67,67,43,0.44)',
            }}
          >
            Choose 3-8 keywords that best describe your brand.
          </div>
        </div>

        {/* Keywords by category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {categories.map((category) => (
            <div key={category.name}>
              {/* Category label */}
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(67,67,43,0.38)',
                  marginBottom: 12,
                }}
              >
                {category.name}
              </div>

              {/* Keyword chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {category.keywords.map((keyword) => (
                  <KeywordChip
                    key={keyword}
                    label={keyword}
                    selected={value.includes(keyword)}
                    onClick={() => handleKeywordToggle(keyword)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Selected count */}
        {value.length > 0 && (
          <div
            style={{
              fontSize: 12.5,
              color: 'rgba(67,67,43,0.52)',
              fontFamily: inter,
              lineHeight: 1.6,
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

/* ─── KeywordChip ────────────────────────────────────────────────────────── */
function KeywordChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '9px 18px',
        fontSize: 13,
        fontWeight: selected ? 600 : 500,
        color: selected ? OLIVE : hovered ? 'rgba(67,67,43,0.72)' : 'rgba(67,67,43,0.58)',
        backgroundColor: selected
          ? 'rgba(168,180,117,0.12)'
          : hovered
          ? 'rgba(255,255,255,0.90)'
          : 'rgba(255,255,255,0.75)',
        border: selected
          ? `1.5px solid ${CHARTREUSE}`
          : hovered
          ? '1.5px solid rgba(67,67,43,0.18)'
          : '1.5px solid rgba(67,67,43,0.10)',
        borderRadius: 999,
        cursor: 'pointer',
        fontFamily: sohne,
        letterSpacing: '0.01em',
        transition: 'all 200ms ease',
        boxShadow: selected ? '0 2px 8px rgba(168,180,117,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
        transform: selected ? 'translateY(-1px)' : 'translateY(0)',
        outline: 'none',
      }}
    >
      {label}
    </button>
  );
}

/* ─── ConflictModal ──────────────────────────────────────────────────────── */
interface ConflictModalProps {
  conflict: string[];
  onClose: () => void;
  onConfirm: (tensionContext: string) => void;
}

function ConflictModal({ conflict, onClose, onConfirm }: ConflictModalProps) {
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
        backgroundColor: 'rgba(250,249,246,0.80)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'rgba(255,255,255,0.98)',
          borderRadius: 10,
          padding: '32px 36px',
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 12px 48px rgba(67,67,43,0.12)',
          border: '1px solid rgba(67,67,43,0.09)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: inter,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: BRAND.rose,
              marginBottom: 10,
            }}
          >
            TENSION DETECTED
          </div>

          <h3
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: OLIVE,
              fontFamily: sohne,
              margin: '0 0 8px 0',
              letterSpacing: '-0.01em',
            }}
          >
            Heads up
          </h3>

          <p
            style={{
              fontSize: 13,
              color: 'rgba(67,67,43,0.58)',
              fontFamily: inter,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            <span style={{ fontWeight: 600, color: OLIVE }}>{conflict[0]}</span> and{' '}
            <span style={{ fontWeight: 600, color: OLIVE }}>{conflict[1]}</span> can create
            tension. How do you want to resolve it?
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {resolutionOptions.map((option) => {
            const active = selected === option.id;
            return (
              <ModalOption
                key={option.id}
                label={option.label}
                description={option.description}
                active={active}
                onClick={() => setSelected(option.id)}
              />
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '11px 20px',
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(67,67,43,0.62)',
              backgroundColor: 'transparent',
              border: '1px solid rgba(67,67,43,0.14)',
              borderRadius: 999,
              cursor: 'pointer',
              fontFamily: sohne,
              letterSpacing: '0.01em',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(67,67,43,0.04)';
              e.currentTarget.style.borderColor = 'rgba(67,67,43,0.22)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(67,67,43,0.14)';
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={!selected}
            style={{
              flex: 1,
              padding: '11px 20px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: sohne,
              letterSpacing: '0.02em',
              color: selected ? STEEL : 'rgba(67,67,43,0.30)',
              background: selected ? 'rgba(125,150,172,0.07)' : 'rgba(255,255,255,0.46)',
              border: selected
                ? `1.5px solid ${STEEL}`
                : '1.5px solid rgba(67,67,43,0.10)',
              borderRadius: 10,
              cursor: selected ? 'pointer' : 'not-allowed',
              transition: 'all 280ms ease',
              opacity: selected ? 1 : 0.6,
            }}
            onMouseEnter={(e) => {
              if (!selected) return;
              e.currentTarget.style.background = 'rgba(125,150,172,0.14)';
            }}
            onMouseLeave={(e) => {
              if (!selected) return;
              e.currentTarget.style.background = 'rgba(125,150,172,0.07)';
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ModalOption — matches IntentCard pattern ───────────────────────────── */
function ModalOption({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        textAlign: 'left',
        borderRadius: 8,
        padding: '14px 16px',
        background: active ? 'rgba(168,180,117,0.08)' : 'rgba(255,255,255,0.75)',
        border: '1px solid rgba(67,67,43,0.09)',
        borderLeft: active
          ? `3px solid ${CHARTREUSE}`
          : hovered
          ? `3px solid ${STEEL}`
          : '3px solid transparent',
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 180ms ease',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {/* Radio dot */}
      <span
        style={{
          width: 13,
          height: 13,
          borderRadius: 999,
          border: active ? `1.5px solid ${CHARTREUSE}` : '1.5px solid rgba(67,67,43,0.22)',
          background: active ? CHARTREUSE : 'transparent',
          flexShrink: 0,
          transition: 'all 150ms ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden
      >
        {active && (
          <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
            <path
              d="M1 3L2.8 4.8L6 1.5"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: inter,
            fontSize: 13,
            fontWeight: 500,
            color: active ? OLIVE : 'rgba(67,67,43,0.78)',
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 3,
            fontFamily: inter,
            fontSize: 12,
            color: 'rgba(67,67,43,0.52)',
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>
    </button>
  );
}
